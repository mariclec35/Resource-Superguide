import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../_lib/supabase";

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase.from("events").select("*").eq("status", "published").order("start_datetime", { ascending: true });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === "POST") {
      const eventData = req.body || {};
      const baseSlug = slugify(eventData.title || "event");
      const slug = `${baseSlug}-${Date.now().toString(36)}`;
      const { data, error } = await supabase.from("events").insert({ ...eventData, slug, status: "pending_review" }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

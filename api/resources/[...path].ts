import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../_lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const pathParam = req.query.path;
    const pathSegments = Array.isArray(pathParam) ? pathParam : typeof pathParam === "string" ? [pathParam] : [];

    if (pathSegments.length === 0) {
      const { ids } = req.query;
      let query = supabase.from("resources").select("*").neq("status", "temporarily_closed");

      if (typeof ids === "string" && ids.trim()) {
        const parsedIds = ids.split(",").map((id) => id.trim()).filter(Boolean);
        if (parsedIds.length > 0) query = query.in("id", parsedIds);
      } else {
        query = query.order("name");
      }

      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    const resourceId = pathSegments[0];
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("id", resourceId)
      .neq("status", "temporarily_closed")
      .single();

    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ error: "Not found" });
      throw error;
    }

    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

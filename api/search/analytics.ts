import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../_lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { error } = await supabase.from("search_analytics").insert(req.body);
    if (error) throw error;
    return res.status(200).json({ status: "ok" });
  } catch {
    return res.status(200).json({ status: "ignored" });
  }
}

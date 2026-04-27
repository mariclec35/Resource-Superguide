import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../_lib/supabase";
import { searchResources } from "../_lib/search";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { prompt } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim()) return res.status(400).json({ error: "Prompt is required" });
  try {
    const { data, error } = await supabase.from("resources").select("*").neq("status", "temporarily_closed");
    if (error) throw error;
    const payload = await searchResources((data || []) as any[], prompt);
    return res.status(200).json(payload);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

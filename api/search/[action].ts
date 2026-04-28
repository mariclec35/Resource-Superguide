import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../_lib/supabase.js";
import { searchResources } from "../_lib/search.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = Array.isArray(req.query.action) ? req.query.action[0] : req.query.action;

  if (action === "resources") {
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

  if (action === "analytics") {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    try {
      const { error } = await supabase.from("search_analytics").insert(req.body);
      if (error) throw error;
      return res.status(200).json({ status: "ok" });
    } catch {
      return res.status(200).json({ status: "ignored" });
    }
  }

  return res.status(404).json({ error: "Not found" });
}

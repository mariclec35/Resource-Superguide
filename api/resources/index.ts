import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../_lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
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
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

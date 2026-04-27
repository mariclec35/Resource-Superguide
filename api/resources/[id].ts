import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../_lib/supabase";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { id } = req.query;
    const resourceId = Array.isArray(id) ? id[0] : id;
    const { data, error } = await supabase.from("resources").select("*").eq("id", resourceId).neq("status", "temporarily_closed").single();
    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ error: "Not found" });
      throw error;
    }
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

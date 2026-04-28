import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "./_lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { data, error } = await supabase.from("categories").select("*").is("parent_id", null);
    if (error) throw error;
    const activeCategories = (data || [])
      .filter((category: any) => category.is_active !== false)
      .sort((a: any, b: any) => {
        const diff = (a.sequence ?? a.display_order ?? 0) - (b.sequence ?? b.display_order ?? 0);
        return diff !== 0 ? diff : String(a.name || "").localeCompare(String(b.name || ""));
      });
    return res.status(200).json(activeCategories);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

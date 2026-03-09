import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const { method } = req;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: "User ID is required" });
  }

  try {
    if (method === 'DELETE') {
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) throw error;
      return res.status(200).json({ status: "ok" });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error("Admin User ID API Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

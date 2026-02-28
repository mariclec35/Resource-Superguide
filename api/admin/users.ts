import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  try {
    if (method === 'GET') {
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      
      const sanitizedUsers = users.map(u => ({
        id: u.id,
        email: u.email,
        last_sign_in_at: u.last_sign_in_at,
        created_at: u.created_at
      }));
      
      return res.status(200).json(sanitizedUsers);
    } 
    
    if (method === 'POST') {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      console.log(`Attempting to create admin user: ${email}`);
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });
      
      if (error) {
        console.error("Supabase createUser error:", error);
        const authError = error as any;
        return res.status(error.status || 500).json({ 
          error: error.message || "Internal server error",
          details: authError.details || undefined
        });
      }
      
      console.log(`Successfully created admin user: ${data.user.id}`);
      return res.status(201).json(data.user);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error("Admin Users API Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

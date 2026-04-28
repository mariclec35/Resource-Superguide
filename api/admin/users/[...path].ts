import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pathParam = req.query.path;
  const pathSegments = Array.isArray(pathParam) ? pathParam : typeof pathParam === "string" ? [pathParam] : [];

  try {
    if (pathSegments.length === 0) {
      if (req.method === "GET") {
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        if (error) throw error;

        const sanitizedUsers = users.map((u) => ({
          id: u.id,
          email: u.email,
          last_sign_in_at: u.last_sign_in_at,
          created_at: u.created_at,
        }));

        return res.status(200).json(sanitizedUsers);
      }

      if (req.method === "POST") {
        const { email, password } = req.body;
        if (!email || !password) {
          return res.status(400).json({ error: "Email and password are required" });
        }

        const { data, error } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (error) {
          const authError = error as any;
          return res.status(error.status || 500).json({
            error: error.message || "Internal server error",
            details: authError.details || undefined,
          });
        }

        return res.status(201).json(data.user);
      }

      return res.status(405).json({ error: "Method not allowed" });
    }

    const userId = pathSegments[0];
    const action = pathSegments[1];

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!action) {
      if (req.method === "DELETE") {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;
        return res.status(200).json({ status: "ok" });
      }

      return res.status(405).json({ error: "Method not allowed" });
    }

    if (action === "reset-password") {
      if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
      }

      const { data: { user }, error: getError } = await supabase.auth.admin.getUserById(userId);
      if (getError || !user || !user.email) throw getError || new Error("User not found");

      const { error } = await supabase.auth.admin.generateLink({
        type: "recovery",
        email: user.email,
      });
      if (error) throw error;
      return res.status(200).json({ status: "ok", message: "Reset link generated" });
    }

    return res.status(404).json({ error: "Not found" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

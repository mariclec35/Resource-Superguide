import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Supabase Admin Client for backend logging
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    source, 
    severity, 
    message, 
    stack, 
    route, 
    endpoint, 
    user_id, 
    session_id, 
    metadata 
  } = req.body;

  // Basic validation
  if (!message || !source || !severity) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { error } = await supabase.from("error_events").insert({
      source,
      severity,
      message,
      stack,
      route,
      endpoint,
      user_id,
      session_id,
      metadata,
    });

    if (error) throw error;
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("Failed to log error to Supabase:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

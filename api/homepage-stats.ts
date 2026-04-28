import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "./_lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const [resourcesResult, meetingsResult, eventsResult] = await Promise.all([
      supabase
        .from("resources")
        .select("*", { count: "exact", head: true })
        .neq("status", "temporarily_closed"),
      supabase
        .from("meetings")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "published"),
    ]);

    if (resourcesResult.error) throw resourcesResult.error;
    if (meetingsResult.error) throw meetingsResult.error;
    if (eventsResult.error) throw eventsResult.error;

    return res.status(200).json({
      resources: resourcesResult.count || 0,
      meetings: meetingsResult.count || 0,
      events: eventsResult.count || 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

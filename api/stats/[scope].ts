import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../_lib/supabase.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const scope = Array.isArray(req.query.scope) ? req.query.scope[0] : req.query.scope;

  if (scope !== "homepage") {
    return res.status(404).json({ error: "Stats scope not found" });
  }

  try {
    const nowIso = new Date().toISOString();

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
        .eq("status", "published")
        .gte("start_datetime", nowIso),
    ]);

    if (resourcesResult.error) throw resourcesResult.error;
    if (meetingsResult.error) throw meetingsResult.error;
    if (eventsResult.error) throw eventsResult.error;

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");

    return res.status(200).json({
      resources: resourcesResult.count || 0,
      meetings: meetingsResult.count || 0,
      events: eventsResult.count || 0,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../../_lib/supabase";
import { loadTsmlSources } from "../../_lib/meetings";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sources = await loadTsmlSources();

    const [
      { count: totalMeetings, error: totalError },
      { count: linkedMeetings, error: linkedError },
      { data: latestMeeting, error: latestError },
      { data: sourceCounts, error: sourceError },
    ] = await Promise.all([
      supabase.from("meetings").select("*", { count: "exact", head: true }),
      supabase.from("meetings").select("*", { count: "exact", head: true }).not("parent_org_slug", "is", null),
      supabase.from("meetings").select("last_sync").order("last_sync", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("meetings").select("source_server"),
    ]);

    if (totalError) throw totalError;
    if (linkedError) throw linkedError;
    if (latestError) throw latestError;
    if (sourceError) throw sourceError;

    const countsBySource = new Map<string, number>();
    for (const row of sourceCounts || []) {
      const key = (row as { source_server?: string }).source_server || "unknown";
      countsBySource.set(key, (countsBySource.get(key) || 0) + 1);
    }

    const sourceSummary = sources.map((source) => ({
      id: source.id,
      name: source.name,
      url: source.url,
      fellowship: source.fellowship || null,
      count: countsBySource.get(source.id) || 0,
    }));

    return res.status(200).json({
      totalMeetings: totalMeetings || 0,
      linkedMeetings: linkedMeetings || 0,
      unlinkedMeetings: Math.max((totalMeetings || 0) - (linkedMeetings || 0), 0),
      lastSync: latestMeeting?.last_sync || null,
      sources: sourceSummary,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || "Unable to load meeting sync status",
    });
  }
}

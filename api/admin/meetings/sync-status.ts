import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../../_lib/supabase.js";
import { loadTsmlSources } from "../../_lib/meetings.js";

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
      { data: recentErrors, error: recentErrorsError },
    ] = await Promise.all([
      supabase.from("meetings").select("*", { count: "exact", head: true }),
      supabase.from("meetings").select("*", { count: "exact", head: true }).not("parent_org_slug", "is", null),
      supabase.from("meetings").select("last_sync").order("last_sync", { ascending: false }).limit(1).maybeSingle(),
      supabase
        .from("error_events")
        .select("created_at, message, metadata")
        .eq("source", "job")
        .eq("endpoint", "/api/cron/sync-meetings")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    if (totalError) throw totalError;
    if (linkedError) throw linkedError;
    if (latestError) throw latestError;
    if (recentErrorsError) throw recentErrorsError;

    const sourceCountResults = await Promise.all(
      sources.map(async (source) => {
        const { count, error } = await supabase
          .from("meetings")
          .select("*", { count: "exact", head: true })
          .eq("source_server", source.id);

        if (error) {
          throw error;
        }

        return [source.id, count || 0] as const;
      })
    );

    const countsBySource = new Map<string, number>(sourceCountResults);

    const latestErrorsBySource = new Map<string, { message: string; created_at: string | null }>();
    for (const row of recentErrors || []) {
      const metadata = (row as { metadata?: Record<string, unknown> }).metadata || {};
      const sourceId = typeof metadata.sourceId === "string" ? metadata.sourceId : null;
      const errorMessage = typeof metadata.error === "string"
        ? metadata.error
        : typeof (row as { message?: string }).message === "string"
          ? (row as { message?: string }).message || ""
          : "";

      if (sourceId && errorMessage && !latestErrorsBySource.has(sourceId)) {
        latestErrorsBySource.set(sourceId, {
          message: errorMessage,
          created_at: typeof (row as { created_at?: string }).created_at === "string"
            ? (row as { created_at?: string }).created_at || null
            : null,
        });
      }
    }

    const sourceSummary = sources.map((source) => ({
      id: source.id,
      name: source.name,
      url: source.url,
      fellowship: source.fellowship || null,
      count: countsBySource.get(source.id) || 0,
      latestError: latestErrorsBySource.get(source.id)?.message || null,
      latestErrorAt: latestErrorsBySource.get(source.id)?.created_at || null,
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

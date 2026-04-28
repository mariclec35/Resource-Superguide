import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../_lib/supabase.js";
import { fetchSourceMeetings, loadTsmlSources, type ResourceMatchCandidate } from "../_lib/meetings.js";

async function logSourceFailure(sourceId: string, sourceName: string, syncTimestamp: string, message: string) {
  try {
    await supabase.from("error_events").insert({
      source: "job",
      severity: "warning",
      message: `Meeting sync failed for ${sourceName}`,
      endpoint: "/api/cron/sync-meetings",
      metadata: {
        sourceId,
        sourceName,
        syncTimestamp,
        error: message,
      },
    });
  } catch {
    // Avoid breaking sync reporting if logging fails.
  }
}

function isAuthorized(req: VercelRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;

  const authHeader = req.headers.authorization;
  if (!authHeader) return false;

  return authHeader === `Bearer ${expected}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const sources = await loadTsmlSources();
    const syncTimestamp = new Date().toISOString();
    const summary: Array<{
      source: string;
      name: string;
      status: "ok" | "error";
      fetched: number;
      upserted: number;
      removed: number;
      error?: string;
    }> = [];
    const { data: resources, error: resourcesError } = await supabase
      .from("resources")
      .select("org_slug, name, name_aliases")
      .not("org_slug", "is", null);

    if (resourcesError) throw resourcesError;

    const resourceCandidates = (resources || []) as ResourceMatchCandidate[];

    for (const source of sources) {
      try {
        const meetings = await fetchSourceMeetings(source, syncTimestamp, resourceCandidates);
        const meetingIds = meetings.map((meeting) => meeting.meeting_id);

        if (meetings.length) {
          const { error: upsertError } = await supabase
            .from("meetings")
            .upsert(meetings, { onConflict: "meeting_id" });

          if (upsertError) throw upsertError;
        }

        let removed = 0;
        const { data: existingRows, error: existingError } = await supabase
          .from("meetings")
          .select("meeting_id")
          .eq("source_server", source.id);

        if (existingError) throw existingError;

        const existingIds = (existingRows || []).map((row) => row.meeting_id as string);
        const staleIds = meetingIds.length
          ? existingIds.filter((id) => !meetingIds.includes(id))
          : existingIds;

        if (staleIds.length) {
          const { data: removedRows, error: deleteError } = await supabase
            .from("meetings")
            .delete()
            .in("meeting_id", staleIds)
            .select("meeting_id");

          if (deleteError) throw deleteError;
          removed = removedRows?.length ?? 0;
        }

        summary.push({
          source: source.id,
          name: source.name,
          status: "ok",
          fetched: meetings.length,
          upserted: meetings.length,
          removed,
        });
      } catch (sourceError: any) {
        const errorMessage = sourceError?.message || "Unknown source sync failure";
        await logSourceFailure(source.id, source.name, syncTimestamp, errorMessage);

        summary.push({
          source: source.id,
          name: source.name,
          status: "error",
          fetched: 0,
          upserted: 0,
          removed: 0,
          error: errorMessage,
        });
      }
    }

    const failedSources = summary.filter((entry) => entry.status === "error");
    const okSources = summary.filter((entry) => entry.status === "ok");

    return res.status(failedSources.length ? 207 : 200).json({
      status: failedSources.length ? "partial" : "ok",
      syncedAt: syncTimestamp,
      totals: {
        sources: summary.length,
        succeeded: okSources.length,
        failed: failedSources.length,
      },
      sources: summary,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || "Meeting sync failed",
    });
  }
}

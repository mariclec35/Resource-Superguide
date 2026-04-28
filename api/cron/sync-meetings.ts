import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../_lib/supabase";
import { fetchSourceMeetings, loadTsmlSources, type ResourceMatchCandidate } from "../_lib/meetings";

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
    const summary: Array<{ source: string; fetched: number; upserted: number; removed: number }> = [];
    const { data: resources, error: resourcesError } = await supabase
      .from("resources")
      .select("org_slug, name, name_aliases")
      .not("org_slug", "is", null);

    if (resourcesError) throw resourcesError;

    const resourceCandidates = (resources || []) as ResourceMatchCandidate[];

    for (const source of sources) {
      const meetings = await fetchSourceMeetings(source, syncTimestamp, resourceCandidates);
      const meetingIds = meetings.map((meeting) => meeting.meeting_id);

      if (meetings.length) {
        const { error: upsertError } = await supabase
          .from("meetings")
          .upsert(meetings, { onConflict: "meeting_id" });

        if (upsertError) throw upsertError;
      }

      let removed = 0;
      if (meetingIds.length) {
        const { data: removedRows, error: deleteError } = await supabase
          .from("meetings")
          .delete()
          .eq("source_server", source.id)
          .not("meeting_id", "in", `(${meetingIds.map((id) => `"${id}"`).join(",")})`)
          .select("meeting_id");

        if (deleteError) throw deleteError;
        removed = removedRows?.length ?? 0;
      } else {
        const { data: removedRows, error: deleteError } = await supabase
          .from("meetings")
          .delete()
          .eq("source_server", source.id)
          .select("meeting_id");

        if (deleteError) throw deleteError;
        removed = removedRows?.length ?? 0;
      }

      summary.push({
        source: source.id,
        fetched: meetings.length,
        upserted: meetings.length,
        removed,
      });
    }

    return res.status(200).json({
      status: "ok",
      syncedAt: syncTimestamp,
      sources: summary,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || "Meeting sync failed",
    });
  }
}

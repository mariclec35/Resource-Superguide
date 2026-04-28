import { useEffect, useMemo } from "react";
import useSWR from "swr";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Meeting, MeetingFilters } from "../types";

const DEFAULT_SELECT = [
  "meeting_id",
  "source_id",
  "source_server",
  "parent_org_slug",
  "subtype",
  "meeting_name",
  "day",
  "time",
  "location_name",
  "address",
  "latitude",
  "longitude",
  "contact_info",
  "details",
  "last_sync",
  "created_at",
  "updated_at",
].join(", ");

async function fetchMeetings(filters: MeetingFilters): Promise<Meeting[]> {
  const pageSize = 1000;
  const rows: Meeting[] = [];

  for (let start = 0; ; start += pageSize) {
    let query = supabase
      .from("meetings")
      .select(DEFAULT_SELECT)
      .order("day", { ascending: true })
      .order("time", { ascending: true })
      .order("meeting_name", { ascending: true })
      .range(start, start + pageSize - 1);

    if (typeof filters.day === "number") {
      query = query.eq("day", filters.day);
    }

    if (filters.timeFrom) {
      query = query.gte("time", filters.timeFrom);
    }

    if (filters.timeTo) {
      query = query.lte("time", filters.timeTo);
    }

    if (filters.parentOrgSlug) {
      query = query.eq("parent_org_slug", filters.parentOrgSlug);
    }

    if (filters.subtype) {
      query = query.eq("subtype", filters.subtype);
    }

    if (filters.searchText?.trim()) {
      const term = filters.searchText.trim();
      query = query.or(`meeting_name.ilike.%${term}%,location_name.ilike.%${term}%,address.ilike.%${term}%`);
    }

    if (filters.formats?.length) {
      query = query.contains("details", { formats: filters.formats });
    }

    const { data, error } = await query;
    if (error) throw error;

    const batch = ((data || []) as unknown) as Meeting[];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }
  }

  return rows;
}

export function useMeetings(filters: MeetingFilters = {}) {
  const key = useMemo(() => ["meetings", JSON.stringify(filters)], [filters]);
  const swr = useSWR(key, () => fetchMeetings(filters), {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  useEffect(() => {
    const channelName = `meetings-realtime-${JSON.stringify(filters)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meetings" },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          void swr.mutate();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [filters, swr]);

  const meetings = swr.data || [];

  return {
    meetings,
    isLoading: swr.isLoading,
    isValidating: swr.isValidating,
    error: swr.error,
    refresh: () => swr.mutate(),
  };
}

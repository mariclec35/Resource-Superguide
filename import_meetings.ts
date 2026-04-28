import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import Papa from "papaparse";

dotenv.config({ path: ".env.local" });
dotenv.config();

type CsvMeetingRow = {
  meeting_id?: string;
  subtype?: string;
  meeting_name?: string;
  day_name?: string;
  time?: string;
  location_name?: string;
  address?: string;
  latitude?: string;
  longitude?: string;
  website?: string;
  contact_phone?: string;
  contact_email?: string;
};

const DAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase configuration in .env.local");
  process.exit(1);
}

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve("C:\\Users\\Others\\Downloads\\cleaned_meetings.csv");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function readString(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeDay(dayName: string | undefined): number | null {
  const key = dayName?.trim().toLowerCase();
  return key ? DAY_MAP[key] ?? null : null;
}

function normalizeTime(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? "0");
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function normalizeNumber(value: string | undefined): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMeetingId(meetingId: string) {
  const [sourceServer, ...rest] = meetingId.split(":");
  return {
    source_server: sourceServer || "manual-import",
    source_id: rest.join(":") || meetingId,
  };
}

function inferPathwayType(subtype: string | null): string | null {
  if (!subtype) return null;
  if (["AA", "NA", "CA", "CMA"].includes(subtype)) return "12-Step";
  if (subtype === "SMART") return "SMART Recovery";
  if (subtype === "All-Recovery") return "All-Recovery";
  return subtype;
}

function mapRow(row: CsvMeetingRow, syncedAt: string) {
  const meetingId = readString(row.meeting_id);
  const subtype = readString(row.subtype);
  const day = normalizeDay(row.day_name);
  const time = normalizeTime(row.time);

  if (!meetingId || !readString(row.meeting_name) || day === null || !time) {
    throw new Error(`Invalid meeting row: ${JSON.stringify(row)}`);
  }

  const { source_server, source_id } = parseMeetingId(meetingId);
  const website = readString(row.website);
  const locationName = readString(row.location_name);
  const address = readString(row.address);
  const isVirtual = Boolean(
    (locationName && /online|virtual/i.test(locationName)) ||
    (address && /online|virtual/i.test(address))
  );

  return {
    meeting_id: meetingId,
    source_id,
    source_server,
    parent_org_slug: null,
    subtype,
    meeting_name: readString(row.meeting_name),
    day,
    time,
    location_name: locationName,
    address,
    latitude: normalizeNumber(row.latitude),
    longitude: normalizeNumber(row.longitude),
    contact_info: {
      contact_phone: readString(row.contact_phone),
      contact_email: readString(row.contact_email),
      website,
    },
    details: {
      fellowship: subtype,
      formats: [],
      virtual: isVirtual,
      pathway_type: inferPathwayType(subtype),
      raw: row,
    },
    last_sync: syncedAt,
  };
}

async function runImport() {
  const raw = await fs.readFile(inputPath, "utf-8");
  const parsed = Papa.parse<CsvMeetingRow>(raw, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse failed: ${parsed.errors[0]?.message || "Unknown error"}`);
  }

  if (!parsed.data.length) {
    throw new Error(`No meeting rows found in ${inputPath}`);
  }

  const syncedAt = new Date().toISOString();
  const rows = parsed.data.map((row) => mapRow(row, syncedAt));
  const importedIds = new Set(rows.map((row) => row.meeting_id));
  const batchSize = 200;

  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const { error } = await supabase.from("meetings").upsert(batch, { onConflict: "meeting_id" });
    if (error) {
      throw new Error(`Batch starting at ${start} failed: ${error.message}`);
    }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from("meetings")
    .select("meeting_id");

  if (existingError) {
    throw new Error(`Imported rows, but failed to fetch existing meetings for cleanup: ${existingError.message}`);
  }

  const staleIds = (existingRows || [])
    .map((row) => row.meeting_id)
    .filter((meetingId) => !importedIds.has(meetingId));

  for (let start = 0; start < staleIds.length; start += batchSize) {
    const batch = staleIds.slice(start, start + batchSize);
    const { error } = await supabase.from("meetings").delete().in("meeting_id", batch);
    if (error) {
      throw new Error(`Cleanup batch starting at ${start} failed: ${error.message}`);
    }
  }

  const { count, error: countError } = await supabase
    .from("meetings")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Import succeeded, but count check failed: ${countError.message}`);
  }

  console.log(`Imported ${rows.length} meetings from ${inputPath}.`);
  console.log(`Removed ${staleIds.length} stale meetings not present in the cleaned CSV.`);
  console.log(`Meetings table now contains ${count ?? "an unknown number of"} records.`);
}

runImport().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

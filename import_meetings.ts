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

type JsonMeetingRow = {
  meeting_id?: string;
  source_id?: string | number | null;
  source_server?: string | null;
  parent_org_slug?: string | null;
  subtype?: string | null;
  meeting_name?: string;
  day?: number | string | null;
  day_name?: string | null;
  time?: string | null;
  location_name?: string | null;
  address?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  contact_info?: string | Record<string, unknown> | null;
  details?: string | Record<string, unknown> | null;
  website?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  Open?: boolean | string | null;
  Closed?: boolean | string | null;
  Women?: boolean | string | null;
  Men?: boolean | string | null;
  Spanish?: boolean | string | null;
  Virtual?: boolean | string | null;
  Beginners?: boolean | string | null;
  formats_clean?: Record<string, boolean> | null;
  [key: string]: unknown;
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

const FORMAT_KEYS = ["Open", "Closed", "Women", "Men", "Spanish", "Virtual", "Beginners"] as const;

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

function readString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined" || trimmed === "NaN") return null;
  return trimmed;
}

function normalizeDay(dayName: string | undefined): number | null {
  const key = dayName?.trim().toLowerCase();
  return key ? DAY_MAP[key] ?? null : null;
}

function normalizeDayValue(value: unknown, dayName?: string | null): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6) {
    return value;
  }

  const numeric = Number(value);
  if (Number.isInteger(numeric) && numeric >= 0 && numeric <= 6) {
    return numeric;
  }

  return normalizeDay(dayName ?? undefined);
}

function normalizeTime(value: unknown): string | null {
  const trimmed = readString(value);
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? "0");
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function normalizeNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "" || value === "NaN") return null;
  const parsed = Number(value);
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

function parseMaybeJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  return null;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function extractFormatLabels(row: JsonMeetingRow, existingDetails?: Record<string, unknown> | null) {
  const fromExistingDetails = Array.isArray(existingDetails?.formats)
    ? (existingDetails?.formats as unknown[]).map((entry) => String(entry)).filter(Boolean)
    : [];

  const fromCleanMap = Object.entries(row.formats_clean || {})
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);

  const fromTopLevelFlags = FORMAT_KEYS.filter((key) => normalizeBoolean(row[key])).map((key) => key);

  return Array.from(new Set([...fromExistingDetails, ...fromCleanMap, ...fromTopLevelFlags]));
}

function sanitizeJsonRaw(row: JsonMeetingRow) {
  const {
    contact_info,
    details,
    coordinates,
    formats_clean,
    Open,
    Closed,
    Women,
    Men,
    Spanish,
    Virtual,
    Beginners,
    ...rest
  } = row as JsonMeetingRow & { coordinates?: unknown };

  return {
    ...rest,
    Open: normalizeBoolean(Open),
    Closed: normalizeBoolean(Closed),
    Women: normalizeBoolean(Women),
    Men: normalizeBoolean(Men),
    Spanish: normalizeBoolean(Spanish),
    Virtual: normalizeBoolean(Virtual),
    Beginners: normalizeBoolean(Beginners),
  };
}

function mapCsvRow(row: CsvMeetingRow, syncedAt: string) {
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
      formats: isVirtual ? ["Virtual"] : [],
      virtual: isVirtual,
      pathway_type: inferPathwayType(subtype),
      raw: row,
    },
    last_sync: syncedAt,
  };
}

function mapJsonRow(row: JsonMeetingRow, syncedAt: string) {
  const meetingId = readString(row.meeting_id);
  const subtype = readString(row.subtype);
  const day = normalizeDayValue(row.day, row.day_name);
  const time = normalizeTime(row.time);

  if (!meetingId || !readString(row.meeting_name) || day === null || !time) {
    throw new Error(`Invalid meeting row: ${JSON.stringify(row)}`);
  }

  const parsedMeetingId = parseMeetingId(meetingId);
  const details = parseMaybeJsonObject(row.details);
  const contactInfo = parseMaybeJsonObject(row.contact_info);
  const website = readString(row.website) || readString(contactInfo?.website);
  const locationName = readString(row.location_name);
  const address = readString(row.address);
  const formats = extractFormatLabels(row, details);
  const isVirtual =
    formats.includes("Virtual") ||
    normalizeBoolean(details?.virtual) ||
    Boolean((locationName && /online|virtual/i.test(locationName)) || (address && /online|virtual/i.test(address)));

  return {
    meeting_id: meetingId,
    source_id: readString(row.source_id) || parsedMeetingId.source_id,
    source_server: readString(row.source_server) || parsedMeetingId.source_server,
    parent_org_slug: readString(row.parent_org_slug),
    subtype,
    meeting_name: readString(row.meeting_name),
    day,
    time,
    location_name: locationName,
    address,
    latitude: normalizeNumber(row.latitude),
    longitude: normalizeNumber(row.longitude),
    contact_info: {
      contact_name: readString(contactInfo?.contact_name),
      contact_phone: readString(row.contact_phone) || readString(contactInfo?.contact_phone),
      contact_email: readString(row.contact_email) || readString(contactInfo?.contact_email),
      website,
    },
    details: {
      fellowship: readString(details?.fellowship) || subtype,
      formats,
      virtual: isVirtual,
      notes: readString(details?.notes),
      pathway_type: readString(details?.pathway_type) || inferPathwayType(subtype),
      tool_based_description: readString(details?.tool_based_description),
      raw: sanitizeJsonRaw(row),
    },
    last_sync: syncedAt,
  };
}

async function parseInput() {
  const raw = await fs.readFile(inputPath, "utf-8");
  const extension = path.extname(inputPath).toLowerCase();

  if (extension === ".csv") {
    const parsed = Papa.parse<CsvMeetingRow>(raw, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      throw new Error(`CSV parse failed: ${parsed.errors[0]?.message || "Unknown error"}`);
    }

    return parsed.data;
  }

  if (extension === ".json") {
    const repaired = raw.replace(/:\s*NaN\b/g, ": null");
    const parsed = JSON.parse(repaired);
    if (!Array.isArray(parsed)) {
      throw new Error(`Expected an array of meetings in ${inputPath}`);
    }
    return parsed as JsonMeetingRow[];
  }

  throw new Error(`Unsupported meeting import file type: ${extension}`);
}

async function runImport() {
  const parsedRows = await parseInput();

  if (!parsedRows.length) {
    throw new Error(`No meeting rows found in ${inputPath}`);
  }

  const syncedAt = new Date().toISOString();
  const rows = parsedRows.map((row) =>
    path.extname(inputPath).toLowerCase() === ".csv"
      ? mapCsvRow(row as CsvMeetingRow, syncedAt)
      : mapJsonRow(row as JsonMeetingRow, syncedAt)
  );

  const importedIds = new Set(rows.map((row) => row.meeting_id));
  const batchSize = 50;

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
  console.log(`Removed ${staleIds.length} stale meetings not present in the source file.`);
  console.log(`Meetings table now contains ${count ?? "an unknown number of"} records.`);
}

runImport().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

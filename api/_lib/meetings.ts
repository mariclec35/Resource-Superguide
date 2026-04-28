import { createHash } from "node:crypto";
import Papa from "papaparse";

export interface TsmlSourceConfig {
  id: string;
  name: string;
  url: string;
  parentOrgSlug?: string;
  fellowship?: string;
  subtype?: string;
  format?: "json" | "csv";
  parser?: "tsml" | "smartrecovery";
  minnesotaOnly?: boolean;
  twinCitiesOnly?: boolean;
  headers?: Record<string, string>;
}

export interface ResourceMatchCandidate {
  org_slug: string | null;
  name: string | null;
  name_aliases?: string[] | null;
}

export interface MeetingSyncRecord {
  meeting_id: string;
  source_id: string;
  source_server: string;
  parent_org_slug: string | null;
  subtype: string | null;
  meeting_name: string;
  day: number;
  time: string;
  location_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_info: Record<string, unknown>;
  details: Record<string, unknown>;
  last_sync: string;
}

type RawMeeting = Record<string, unknown>;

export const meetingSources: TsmlSourceConfig[] = [
  {
    id: "minneapolis-intergroup",
    name: "Minneapolis Intergroup (Area 36)",
    url: "https://aaminneapolis.org/wp-admin/admin-ajax.php?action=meetings",
    fellowship: "AA",
    subtype: "AA",
    format: "json",
  },
  {
    id: "st-paul-intergroup",
    name: "St. Paul Intergroup",
    url: "https://aastpaul.org/meetings/?format=json",
    fellowship: "AA",
    subtype: "AA",
    format: "json",
  },
  {
    id: "na-minnesota-region",
    name: "NA Minnesota Region",
    url: "https://naminnesota.org/meetings/?format=json",
    fellowship: "NA",
    subtype: "NA",
    format: "json",
  },
  {
    id: "greater-mn-area-36",
    name: "Greater MN (Duluth/Rochester)",
    url: "https://area36.org/wp-json/tsml/v1/meetings",
    fellowship: "AA",
    subtype: "AA",
    format: "json",
  },
];

const optionalMeetingSourceTemplates: Array<(env: NodeJS.ProcessEnv) => TsmlSourceConfig | null> = [
  (env) =>
    env.SMART_RECOVERY_API_URL
      ? {
          id: "smart-recovery",
          name: "SMART Recovery",
          url: env.SMART_RECOVERY_API_URL,
          subtype: "SMART",
          parser: "smartrecovery",
          format: "json",
          minnesotaOnly: true,
        }
      : null,
  (env) =>
    env.CMA_FEED_URL
      ? {
          id: "crystal-meth-anonymous",
          name: "Crystal Meth Anonymous (CMA)",
          url: env.CMA_FEED_URL,
          fellowship: "CMA",
          subtype: "CMA",
          format: "json",
          minnesotaOnly: true,
        }
      : null,
  (env) =>
    env.CA_MN_FEED_URL
      ? {
          id: "cocaine-anonymous-mn",
          name: "Cocaine Anonymous (CA) Minnesota",
          url: env.CA_MN_FEED_URL,
          fellowship: "CA",
          subtype: "CA",
          format: "json",
          minnesotaOnly: true,
        }
      : null,
  (env) =>
    env.ALL_RECOVERY_FEED_URL
      ? {
          id: "all-recovery-mn",
          name: "All Recovery Meetings",
          url: env.ALL_RECOVERY_FEED_URL,
          subtype: "All-Recovery",
          format: "json",
          minnesotaOnly: true,
        }
      : null,
];

const MINNESOTA_BOUNDS = {
  minLat: 43.49,
  maxLat: 49.38,
  minLng: -97.24,
  maxLng: -89.49,
};

const TWIN_CITIES_BOUNDS = {
  minLat: 44.71,
  maxLat: 45.25,
  minLng: -93.55,
  maxLng: -92.8,
};

const DAY_MAP: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

function readString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readObjectArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (entry && typeof entry === "object") {
        const label = readString((entry as Record<string, unknown>).label)
          || readString((entry as Record<string, unknown>).name)
          || readString((entry as Record<string, unknown>).code);
        return label ?? "";
      }
      return "";
    })
    .filter(Boolean);
}

function normalizeDay(value: unknown): number | null {
  if (typeof value === "number" && value >= 0 && value <= 6) return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (/^\d+$/.test(normalized)) {
      const parsed = Number(normalized);
      return parsed >= 0 && parsed <= 6 ? parsed : null;
    }
    return DAY_MAP[normalized] ?? null;
  }
  return null;
}

function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const twentyFourHour = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (twentyFourHour) {
    const hours = Number(twentyFourHour[1]);
    const minutes = Number(twentyFourHour[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    }
  }

  const meridiem = trimmed.match(/^(\d{1,2}):(\d{2})\s*([ap])m$/i);
  if (meridiem) {
    let hours = Number(meridiem[1]);
    const minutes = Number(meridiem[2]);
    const suffix = meridiem[3].toLowerCase();
    if (hours === 12) hours = 0;
    if (suffix === "p") hours += 12;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  }

  return null;
}

function sanitizeAddress(...parts: Array<unknown>): string | null {
  const flattened = parts
    .flatMap((part) => {
      if (typeof part !== "string") return [];
      return part.split(/\r?\n/).map((segment) => segment.trim());
    })
    .filter(Boolean);

  if (!flattened.length) return null;

  return flattened
    .join(", ")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,+/g, ",")
    .replace(/,\s*,/g, ", ")
    .trim();
}

function looksExpired(raw: RawMeeting): boolean {
  const endDate = readString(raw.end_date) || readString(raw.ends_at) || readString(raw.end);
  if (!endDate) return false;
  const parsed = Date.parse(endDate);
  return Number.isFinite(parsed) && parsed < Date.now();
}

function normalizeLookupText(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(group|club|center|centre|hall|church|recovery|meeting|meetings)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isWithinBounds(lat: number | null, lng: number | null, bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }) {
  if (lat === null || lng === null) return false;
  return lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng;
}

function inferState(raw: RawMeeting): string | null {
  return (
    readString(raw.state)
    || readString(raw.province)
    || readString(raw.region)
    || readString((raw.address as Record<string, unknown> | undefined)?.state)
  );
}

function isMinnesotaRow(raw: RawMeeting, latitude: number | null, longitude: number | null): boolean {
  const state = inferState(raw)?.toUpperCase();
  if (state === "MN" || state === "MINNESOTA") return true;

  const city = readString(raw.city)?.toLowerCase() || "";
  if (city.includes("minneapolis") || city.includes("saint paul") || city.includes("st paul")) return true;

  const addressText = sanitizeAddress(raw.address, raw.street, raw.city, raw.state, raw.postal_code ?? raw.zip)?.toLowerCase() || "";
  if (addressText.includes(", mn") || addressText.includes(" minnesota")) return true;

  return isWithinBounds(latitude, longitude, MINNESOTA_BOUNDS);
}

function pathwayTypeForSubtype(subtype: string | null | undefined): string | null {
  if (!subtype) return null;
  const normalized = subtype.toLowerCase();
  if (["aa", "na", "ca", "cma"].includes(normalized)) return "12-Step";
  if (normalized === "smart") return "Tool-based";
  if (normalized === "all-recovery") return "Peer-led";
  return null;
}

function resolveParentOrgSlug(
  locationName: string | null,
  candidates: ResourceMatchCandidate[],
  explicitParentOrgSlug?: string
): string | null {
  if (explicitParentOrgSlug) return explicitParentOrgSlug;
  if (!locationName) return null;

  const target = normalizeLookupText(locationName);
  if (!target) return null;

  for (const candidate of candidates) {
    const labels = [
      candidate.name,
      ...(candidate.name_aliases || []),
    ].map((entry) => normalizeLookupText(entry || ""));

    if (labels.some((label) => label && (label === target || label.includes(target) || target.includes(label)))) {
      return candidate.org_slug || null;
    }
  }

  return null;
}

function buildMeetingId(source: TsmlSourceConfig, raw: RawMeeting): string {
  const stableSourceId =
    readString(raw.id)
    || readString(raw.meeting_id)
    || readString(raw.slug)
    || readString(raw.uid)
    || readString(raw.source_id);

  if (stableSourceId) {
    return `${source.id}:${stableSourceId}`;
  }

  const fingerprint = JSON.stringify({
    name: readString(raw.name) || readString(raw.meeting_name) || readString(raw.title),
    day: normalizeDay(raw.day ?? raw.weekday),
    time: normalizeTime(raw.time ?? raw.start_time ?? raw.formatted_time),
    address: sanitizeAddress(raw.address, raw.street, raw.city, raw.state, raw.postal_code),
    location: readString(raw.location_name) || readString(raw.location),
  });

  return `${source.id}:${createHash("sha1").update(fingerprint).digest("hex")}`;
}

function extractRows(payload: unknown): RawMeeting[] {
  if (Array.isArray(payload)) return payload.filter((row): row is RawMeeting => !!row && typeof row === "object");
  if (!payload || typeof payload !== "object") return [];

  const objectPayload = payload as Record<string, unknown>;
  const candidates = [objectPayload.meetings, objectPayload.data, objectPayload.items, objectPayload.results];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((row): row is RawMeeting => !!row && typeof row === "object");
    }
  }

  return [];
}

async function loadSourcePayload(source: TsmlSourceConfig): Promise<unknown> {
  const response = await fetch(source.url, { headers: source.headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${source.url}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const format = source.format
    || (contentType.includes("csv") || source.url.toLowerCase().endsWith(".csv") ? "csv" : "json");

  if (format === "csv") {
    const text = await response.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    if (parsed.errors.length) {
      throw new Error(`CSV parse failed for ${source.id}: ${parsed.errors[0].message}`);
    }
    return parsed.data;
  }

  return response.json();
}

function extractSmartDescription(raw: RawMeeting): string | null {
  return (
    readString(raw.description)
    || readString(raw.meeting_description)
    || readString(raw.notes)
    || readString(raw.comments)
  );
}

export async function loadTsmlSources(): Promise<TsmlSourceConfig[]> {
  const raw = process.env.TSML_SOURCES_JSON;
  const optionalSources = optionalMeetingSourceTemplates
    .map((factory) => factory(process.env))
    .filter((source): source is TsmlSourceConfig => !!source);
  if (!raw) return [...meetingSources, ...optionalSources];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error("TSML_SOURCES_JSON must be valid JSON.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("TSML_SOURCES_JSON must be a JSON array.");
  }

  const envSources: TsmlSourceConfig[] = parsed
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
    .map((entry) => {
      const format: TsmlSourceConfig["format"] =
        entry.format === "csv" || entry.format === "json" ? entry.format : undefined;
      const parser: TsmlSourceConfig["parser"] =
        entry.parser === "smartrecovery" ? "smartrecovery" : "tsml";

      return {
        id: String(entry.id || "").trim(),
        name: readString(entry.name) || String(entry.id || "").trim(),
        url: String(entry.url || "").trim(),
        parentOrgSlug: readString(entry.parentOrgSlug) || undefined,
        fellowship: readString(entry.fellowship) || undefined,
        subtype: readString(entry.subtype) || undefined,
        format,
        parser,
        minnesotaOnly: Boolean(entry.minnesotaOnly),
        twinCitiesOnly: Boolean(entry.twinCitiesOnly),
        headers: entry.headers && typeof entry.headers === "object" ? (entry.headers as Record<string, string>) : undefined,
      };
    })
    .filter((entry) => entry.id && entry.url);

  const mergedMap = new Map<string, TsmlSourceConfig>();
  for (const source of meetingSources) {
    mergedMap.set(source.id, source);
  }
  for (const source of optionalSources) {
    mergedMap.set(source.id, source);
  }
  for (const source of envSources) {
    mergedMap.set(source.id, source);
  }

  const merged = [...mergedMap.values()].filter((source) => source.id && source.url);

  if (!merged.length) {
    throw new Error("TSML_SOURCES_JSON does not contain any usable sources.");
  }

  return merged;
}

function mapTsmlMeeting(
  source: TsmlSourceConfig,
  row: RawMeeting,
  syncTimestamp: string,
  resourceCandidates: ResourceMatchCandidate[]
): MeetingSyncRecord | null {
  const meetingName = readString(row.meeting_name)
    || readString(row.name)
    || readString(row.title)
    || "Untitled Meeting";
  const day = normalizeDay(row.day ?? row.weekday ?? row.day_of_week);
  const time = normalizeTime(row.time ?? row.start_time ?? row.formatted_time ?? row.start);
  const latitude = readNumber(row.latitude ?? row.lat ?? row.y);
  const longitude = readNumber(row.longitude ?? row.lng ?? row.lon ?? row.x);
  const sourceId = readString(row.id)
    || readString(row.meeting_id)
    || readString(row.slug)
    || readString(row.uid)
    || buildMeetingId(source, row);
  const formatCodes = readObjectArray(row.formats ?? row.types ?? row.tags ?? row.codes);
  const locationName = readString(row.location_name) || readString(row.location) || readString(row.venue);
  const address = sanitizeAddress(
    row.address,
    row.street,
    row.street_1,
    row.street_2,
    row.city,
    row.state,
    row.postal_code ?? row.zip
  );
  const subtype = source.subtype || readString(row.subtype) || readString(row.fellowship) || null;
  const pathwayType = pathwayTypeForSubtype(subtype);
  const contactName = readString(row.contact_name) || readString(row.contact) || readString(row.local_contact);
  const contactPhone = readString(row.contact_phone) || readString(row.phone) || readString(row.local_phone);
  const contactEmail = readString(row.contact_email) || readString(row.email);

  if (source.minnesotaOnly && !isMinnesotaRow(row, latitude, longitude)) return null;
  if (source.twinCitiesOnly && !isWithinBounds(latitude, longitude, TWIN_CITIES_BOUNDS)) return null;

  if (day === null || !time) return null;

  return {
    meeting_id: buildMeetingId(source, row),
    source_id: sourceId,
    source_server: source.id,
    parent_org_slug: resolveParentOrgSlug(locationName, resourceCandidates, source.parentOrgSlug),
    subtype,
    meeting_name: meetingName,
    day,
    time,
    location_name: locationName,
    address,
    latitude,
    longitude,
    contact_info: {
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      website: readString(row.website) || readString(row.url),
    },
    details: {
      source_name: source.name,
      fellowship: source.fellowship ?? null,
      pathway_type: pathwayType,
      formats: formatCodes,
      virtual: Boolean(row.virtual || row.is_virtual),
      notes: readString(row.notes) || readString(row.comments),
      tool_based_description: source.parser === "smartrecovery" ? extractSmartDescription(row) : null,
      raw: row,
    },
    last_sync: syncTimestamp,
  };
}

export async function fetchSourceMeetings(
  source: TsmlSourceConfig,
  syncTimestamp: string,
  resourceCandidates: ResourceMatchCandidate[] = []
): Promise<MeetingSyncRecord[]> {
  const payload = await loadSourcePayload(source);
  const rows = extractRows(payload);

  return rows
    .filter((row) => !looksExpired(row))
    .map((row) => mapTsmlMeeting(source, row, syncTimestamp, resourceCandidates))
    .filter((row): row is MeetingSyncRecord => !!row);
}

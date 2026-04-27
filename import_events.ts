import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

type EventImportRow = {
  "Event Title"?: string;
  "Category"?: string;
  "Cost Type"?: string;
  "Cost Details"?: string | null;
  "Description"?: string;
  "Organizer Name"?: string;
  "Organizer Type"?: string | null;
  "Contact Email"?: string | null;
  "Contact Phone"?: string | null;
  "Website"?: string | null;
  "Registration Link"?: string | null;
  "Location Name"?: string | null;
  "Address"?: string | null;
  "City"?: string | null;
  "State"?: string | null;
  "ZIP"?: string | null;
  "Virtual Event toggle / checkbox"?: boolean;
  "Virtual Event URL"?: string | null;
  "Start Date & Time"?: string;
  "End Date & Time"?: string | null;
  "Timezone"?: string | null;
  "Recurring Event toggle / checkbox"?: boolean;
  "Recurrence Pattern"?: string | null;
  "Submitted By Name"?: string | null;
  "Submitted By Email"?: string | null;
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase configuration in .env.local");
  process.exit(1);
}

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve("C:\\Users\\Others\\Downloads\\recovery_events_2026.json");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function buildSlug(row: EventImportRow) {
  const title = row["Event Title"]?.trim() || "event";
  const startDate = row["Start Date & Time"]?.slice(0, 10) || "undated";
  const city = row["City"]?.trim() || "";
  return slugify([title, city, startDate].filter(Boolean).join("-"));
}

function mapRow(row: EventImportRow, sourceName: string) {
  const title = row["Event Title"]?.trim();
  const description = row["Description"]?.trim();
  const organizerName = row["Organizer Name"]?.trim();
  const startDateTime = row["Start Date & Time"]?.trim();

  if (!title || !description || !organizerName || !startDateTime) {
    throw new Error(`Invalid event record: missing title, description, organizer, or start datetime for ${JSON.stringify(row)}`);
  }

  const isVirtual = Boolean(row["Virtual Event toggle / checkbox"]);
  const slug = buildSlug(row);

  return {
    title,
    slug,
    description,
    category: row["Category"]?.trim() || "Community",
    organizer_name: organizerName,
    organizer_type: row["Organizer Type"]?.trim() || null,
    contact_email: row["Contact Email"]?.trim() || null,
    contact_phone: row["Contact Phone"]?.trim() || null,
    website: row["Website"]?.trim() || null,
    registration_link: row["Registration Link"]?.trim() || null,
    location_name: row["Location Name"]?.trim() || null,
    address: row["Address"]?.trim() || null,
    city: row["City"]?.trim() || null,
    state: row["State"]?.trim() || null,
    zip: row["ZIP"]?.trim() || null,
    latitude: null,
    longitude: null,
    is_virtual: isVirtual,
    virtual_event_url: row["Virtual Event URL"]?.trim() || null,
    start_datetime: startDateTime,
    end_datetime: row["End Date & Time"]?.trim() || null,
    timezone: row["Timezone"]?.trim() || "Central Time (US & Canada)",
    recurring: Boolean(row["Recurring Event toggle / checkbox"]),
    recurrence_pattern: row["Recurrence Pattern"]?.trim() || null,
    cost_type: row["Cost Type"]?.trim().toLowerCase() || "free",
    cost_details: row["Cost Details"]?.trim() || null,
    status: "published",
  };
}

async function runImport() {
  const raw = await fs.readFile(inputPath, "utf-8");
  const parsed = JSON.parse(raw) as EventImportRow[];

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`No event records found in ${inputPath}`);
  }

  const sourceName = path.basename(inputPath);
  const rows = parsed.map((row) => mapRow(row, sourceName));
  const batchSize = 100;

  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const { error } = await supabase
      .from("events")
      .upsert(batch, { onConflict: "slug" });

    if (error) {
      throw new Error(`Batch starting at ${start} failed: ${error.message}`);
    }
  }

  const { count, error: countError } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Import succeeded, but count check failed: ${countError.message}`);
  }

  console.log(`Imported ${rows.length} events from ${inputPath}.`);
  console.log(`Events table now contains ${count ?? "an unknown number of"} records.`);
}

runImport().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

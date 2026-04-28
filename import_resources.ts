import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import Papa from "papaparse";

dotenv.config({ path: ".env.local" });
dotenv.config();

type ResourceRecord = {
  id?: string;
  org_slug?: string;
  name?: string;
  name_aliases?: string[] | string;
  search_keywords?: string[] | string;
  search_embeddings_text?: string;
  metadata?: Record<string, unknown> | string;
  eligibility?: Record<string, unknown> | string;
  relational_graph?: Record<string, unknown> | string;
  locations?: Array<{
    label?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    coordinates?: {
      lat?: number;
      lng?: number;
    };
  }> | string;
  contact?: {
    phone?: string;
    website?: string;
    [key: string]: unknown;
  } | string;
  verification_status?: string;
  last_verified?: string;
  category?: string;
  address?: string;
  phone?: string;
  website?: string;
  description?: string;
  status?: string;
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase configuration in .env.local");
  process.exit(1);
}

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve("C:\\Users\\Others\\Downloads\\resources_with_keywords.csv");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function parseJsonValue<T>(value: unknown, fallback: T): T {
  if (value == null || value === "") return fallback;
  if (typeof value !== "string") return value as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  const parsed = parseJsonValue<string[] | string>(value, []);
  if (Array.isArray(parsed)) {
    return parsed.map((entry) => String(entry).trim()).filter(Boolean);
  }

  return String(parsed)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function mapRecord(row: ResourceRecord) {
  const metadata = parseJsonValue<Record<string, unknown>>(row.metadata, {});
  const eligibility = parseJsonValue<Record<string, unknown>>(row.eligibility, {});
  const relationalGraph = parseJsonValue<Record<string, unknown>>(row.relational_graph, {});
  const locations = parseJsonValue<ResourceRecord["locations"]>(row.locations, []) as ResourceRecord["locations"];
  const contact = parseJsonValue<Record<string, unknown>>(row.contact, {});
  const primaryLocation = Array.isArray(locations) ? locations[0] : undefined;

  const searchKeywords = parseStringArray(row.search_keywords);
  const mergedMetadata = {
    ...metadata,
    search_keywords: searchKeywords,
  };

  return {
    id: row.id ?? null,
    org_slug: row.org_slug ?? null,
    name: row.name?.trim() || null,
    category:
      row.category?.trim() ||
      (Array.isArray((metadata as any).pathway_tags) ? (metadata as any).pathway_tags[0] : null) ||
      "Other",
    address: row.address ?? primaryLocation?.address ?? null,
    phone: row.phone ?? (contact as any)?.phone ?? null,
    website: row.website ?? (contact as any)?.website ?? null,
    description: row.description ?? row.search_embeddings_text ?? null,
    status: row.status ?? "active",
    name_aliases: parseStringArray(row.name_aliases),
    search_embeddings_text: row.search_embeddings_text ?? null,
    metadata: mergedMetadata,
    eligibility,
    relational_graph: relationalGraph,
    locations: Array.isArray(locations) ? locations : [],
    contact,
    verification_status: row.verification_status ?? null,
    last_verified: row.last_verified ?? null,
  };
}

async function loadInputFile() {
  const raw = await fs.readFile(inputPath, "utf-8");

  if (inputPath.toLowerCase().endsWith(".csv")) {
    const parsed = Papa.parse<ResourceRecord>(raw, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      throw new Error(`CSV parse failed: ${parsed.errors[0].message}`);
    }

    return parsed.data;
  }

  return JSON.parse(raw) as ResourceRecord[];
}

async function runImport() {
  const parsed = await loadInputFile();

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`No resource records found in ${inputPath}`);
  }

  const invalidRows = parsed.filter((row) => !row.org_slug || !row.name);
  if (invalidRows.length > 0) {
    throw new Error(`Found ${invalidRows.length} invalid records missing org_slug or name.`);
  }

  const rows = parsed.map(mapRecord);
  const batchSize = 100;

  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);
    const { error } = await supabase
      .from("resources")
      .upsert(batch, { onConflict: "org_slug" });

    if (error) {
      throw new Error(`Batch starting at ${start} failed: ${error.message}`);
    }
  }

  const { count, error: countError } = await supabase
    .from("resources")
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw new Error(`Import succeeded, but count check failed: ${countError.message}`);
  }

  console.log(`Imported ${rows.length} resources from ${inputPath}.`);
  console.log(`Resources table now contains ${count ?? "an unknown number of"} records.`);
}

runImport().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

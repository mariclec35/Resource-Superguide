import fs from "fs/promises";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

type ResourceRecord = {
  org_slug?: string;
  name?: string;
  name_aliases?: string[];
  search_embeddings_text?: string;
  metadata?: {
    pathway_tags?: string[];
    [key: string]: unknown;
  };
  eligibility?: Record<string, unknown>;
  relational_graph?: Record<string, unknown>;
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
  }>;
  contact?: {
    phone?: string;
    website?: string;
    [key: string]: unknown;
  };
};

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase configuration in .env.local");
  process.exit(1);
}

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve("C:\\Users\\Others\\Downloads\\mn_recovery_hub_full_347_canonical_records.json");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function mapRecord(row: ResourceRecord) {
  const primaryLocation = row.locations?.[0];

  return {
    org_slug: row.org_slug ?? null,
    name: row.name?.trim(),
    category: row.metadata?.pathway_tags?.[0] ?? "Other",
    address: primaryLocation?.address ?? null,
    phone: row.contact?.phone ?? null,
    website: row.contact?.website ?? null,
    description: row.search_embeddings_text ?? null,
    status: "active",
    name_aliases: row.name_aliases ?? [],
    search_embeddings_text: row.search_embeddings_text ?? null,
    metadata: row.metadata ?? {},
    eligibility: row.eligibility ?? {},
    relational_graph: row.relational_graph ?? {},
    locations: row.locations ?? [],
    contact: row.contact ?? {},
  };
}

async function runImport() {
  const raw = await fs.readFile(inputPath, "utf-8");
  const parsed = JSON.parse(raw) as ResourceRecord[];

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

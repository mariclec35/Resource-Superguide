import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

fs.writeFileSync("server_start.log", `${new Date().toISOString()} - Server process started\n`);

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const PORT = 3000;

// Supabase Admin Client for backend logging
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseServiceKey) {
  fs.appendFileSync("server_start.log", `${new Date().toISOString()} - Missing Supabase configuration\n`);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const ai = new GoogleGenAI({ apiKey: process.env.VITE_CUSTOM_GEMINI_KEY || process.env.GEMINI_API_KEY || "" });

type SearchExtraction = {
  need_types: string[];
  urgency: string;
  location?: string;
  preferences: string[];
  barriers: string[];
  eligibility_clues: string[];
  keywords: string[];
  ai_summary: string;
};

type SearchResource = {
  id: string;
  name?: string;
  category?: string;
  subcategory?: string | null;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  provides?: string | null;
  remarks?: string | null;
  details?: string | null;
  status?: string;
  org_slug?: string;
  name_aliases?: string[];
  search_embeddings_text?: string;
  metadata?: {
    pathway_tags?: string[];
    referral_required?: string;
    [key: string]: unknown;
  };
  eligibility?: {
    populations?: string[];
    gender_focus?: string;
    min_age?: number;
    sober_living_required?: boolean;
    [key: string]: unknown;
  };
  relational_graph?: {
    child_programs?: string[];
    next_step_referrals?: string[];
    [key: string]: unknown;
  };
  locations?: Array<{
    label?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  }>;
  contact?: {
    phone?: string;
    website?: string;
  };
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

const SEARCH_SYNONYMS: Record<string, string[]> = {
  housing: ["housing", "shelter", "transitional-housing", "supportive-housing", "recovery housing"],
  shelter: ["shelter", "emergency shelter", "overnight shelter", "housing-first"],
  food: ["food", "meal", "food-security", "food shelf", "pantry"],
  treatment: ["treatment", "clinical", "detox", "outpatient", "residential"],
  employment: ["employment", "job", "workforce-development", "vocational-rehab", "career"],
  transportation: ["transportation", "bus", "ride"],
  legal: ["legal", "legal-aid", "advocacy"],
  healthcare: ["healthcare", "medical", "clinic"],
  "mental health": ["mental-health", "counseling", "therapy", "trauma-informed"],
  "harm reduction": ["harm-reduction", "naloxone", "narcan", "overdose-prevention"],
  youth: ["youth", "teen", "young adult"],
  family: ["family", "families", "children", "parent"],
  veterans: ["veteran", "veterans"],
  sober: ["sober", "sober-living", "recovery housing"],
};

const LOW_SIGNAL_TERMS = new Set([
  "and",
  "for",
  "from",
  "get",
  "help",
  "house",
  "housing",
  "in",
  "need",
  "near",
  "of",
  "or",
  "paul",
  "place",
  "program",
  "recovery",
  "resource",
  "resources",
  "services",
  "st",
  "support",
  "the",
  "this",
  "where",
]);

const STRONG_PATHWAY_TERMS = [
  "sober-living",
  "recovery housing",
  "transitional-housing",
  "residential-support",
  "harm-reduction",
  "overdose-prevention",
];

function textValue(value: unknown) {
  return String(value || "").toLowerCase();
}

function isUsefulTerm(term: string) {
  const normalized = textValue(term).trim();
  return normalized.length >= 3 && !LOW_SIGNAL_TERMS.has(normalized);
}

function matchesStructuredTerm(value: string, term: string) {
  const normalizedValue = textValue(value).trim();
  const normalizedTerm = textValue(term).trim();
  if (!normalizedValue || !normalizedTerm) return false;
  if (normalizedValue === normalizedTerm) return true;

  const valueParts = normalizedValue.split(/[\s,_-]+/).filter(Boolean);
  const termParts = normalizedTerm.split(/[\s,_-]+/).filter(Boolean);

  return (
    valueParts.includes(normalizedTerm) ||
    termParts.includes(normalizedValue) ||
    termParts.every((part) => valueParts.includes(part))
  );
}

function normalizeSearchResource(resource: SearchResource) {
  const primaryLocation = resource.locations?.[0];

  return {
    ...resource,
    address: resource.address || primaryLocation?.address || "",
    city: resource.city || primaryLocation?.city || "",
    phone: resource.phone || resource.contact?.phone || "",
    website: resource.website || resource.contact?.website || "",
    provides: resource.provides || resource.search_embeddings_text || "",
  };
}

function getSearchFields(resource: ReturnType<typeof normalizeSearchResource>) {
  const aliases = resource.name_aliases || [];
  const pathTags = resource.metadata?.pathway_tags || [];
  const populations = resource.eligibility?.populations || [];
  const childPrograms = resource.relational_graph?.child_programs || [];
  const nextStepReferrals = resource.relational_graph?.next_step_referrals || [];
  const locations = (resource.locations || []).flatMap((location) => [
    location.label || "",
    location.address || "",
    location.city || "",
    location.state || "",
    location.zip || "",
  ]);

  return [
    resource.name,
    resource.category,
    resource.subcategory,
    resource.city,
    resource.address,
    resource.phone,
    resource.website,
    resource.provides,
    resource.remarks,
    resource.details,
    resource.search_embeddings_text,
    resource.metadata?.referral_required,
    ...aliases,
    ...pathTags,
    ...populations,
    ...childPrograms,
    ...nextStepReferrals,
    ...locations,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function expandTerms(terms: string[]) {
  const expanded = new Set<string>();

  for (const term of terms) {
    const normalized = textValue(term).trim();
    if (!normalized) continue;
    if (isUsefulTerm(normalized) || normalized.includes(" ")) {
      expanded.add(normalized);
    }
    normalized
      .split(/[\s,/()-]+/)
      .filter(Boolean)
      .filter(isUsefulTerm)
      .forEach((part) => expanded.add(part));

    for (const [key, synonyms] of Object.entries(SEARCH_SYNONYMS)) {
      if (normalized === key || synonyms.some((synonym) => normalized.includes(synonym) || synonym.includes(normalized))) {
        if (isUsefulTerm(key) || key.includes(" ")) {
          expanded.add(key);
        }
        synonyms
          .filter((synonym) => isUsefulTerm(synonym) || synonym.includes(" "))
          .forEach((synonym) => expanded.add(synonym));
      }
    }
  }

  return Array.from(expanded);
}

async function extractNeeds(prompt: string): Promise<SearchExtraction> {
  const fallbackKeywords = prompt.toLowerCase().split(/\W+/).filter((word) => word.length > 2);
  const fallback: SearchExtraction = {
    need_types: [],
    urgency: "ongoing",
    location: "",
    preferences: [],
    barriers: [],
    eligibility_clues: [],
    keywords: fallbackKeywords,
    ai_summary: "We searched using your keywords.",
  };

  const apiKey = process.env.VITE_CUSTOM_GEMINI_KEY || process.env.GEMINI_API_KEY || "";
  if (!apiKey) return fallback;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: `Extract structured needs from the user's community resource request.
Return a JSON object with:
- need_types: string[] (housing, shelter, food, treatment, recovery support, employment, transportation, legal, healthcare, mental health, youth services, family services, domestic violence support, financial assistance, harm reduction, veterans)
- urgency: string (immediate, this_week, ongoing)
- location: string
- preferences: string[]
- barriers: string[]
- eligibility_clues: string[]
- keywords: string[]
- ai_summary: string`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            need_types: { type: Type.ARRAY, items: { type: Type.STRING } },
            urgency: { type: Type.STRING },
            location: { type: Type.STRING },
            preferences: { type: Type.ARRAY, items: { type: Type.STRING } },
            barriers: { type: Type.ARRAY, items: { type: Type.STRING } },
            eligibility_clues: { type: Type.ARRAY, items: { type: Type.STRING } },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            ai_summary: { type: Type.STRING },
          },
          required: ["need_types", "urgency", "preferences", "barriers", "eligibility_clues", "keywords", "ai_summary"],
        },
      },
    });

    const rawText = (response.text || "{}").replace(/^```json\s*/, "").replace(/\s*```$/, "");
    return { ...fallback, ...JSON.parse(rawText) };
  } catch (error) {
    console.error("AI extraction failed:", error);
    return fallback;
  }
}

function scoreResource(resource: ReturnType<typeof normalizeSearchResource>, extraction: SearchExtraction, prompt: string) {
  const searchFields = getSearchFields(resource);
  const promptLower = prompt.toLowerCase();
  const needTerms = expandTerms(extraction.need_types || []);
  const keywordTerms = expandTerms([...(extraction.keywords || []), ...(extraction.preferences || []), ...(extraction.barriers || [])]);
  const eligibilityTerms = expandTerms(extraction.eligibility_clues || []);
  const categoryTerms = [
    textValue(resource.category),
    textValue(resource.subcategory),
    ...(resource.metadata?.pathway_tags || []).map(textValue),
  ].filter(Boolean);
  const populations = (resource.eligibility?.populations || []).map(textValue);
  const genderFocus = textValue(resource.eligibility?.gender_focus);
  const locationTerm = textValue(extraction.location).replace(/^not specified$/, "").trim();
  const reasons: string[] = [];
  let score = 0;

  const aliases = (resource.name_aliases || []).map(textValue);
  const searchableNames = [textValue(resource.name), ...aliases].filter(Boolean);
  const strongKeywordTerms = keywordTerms.filter((term) => term.length >= 5 && !LOW_SIGNAL_TERMS.has(term));
  const strongNeedTerms = needTerms.filter((term) => term.length >= 5 && !LOW_SIGNAL_TERMS.has(term));
  const promptServiceTerms = Array.from(
    new Set(
      Object.entries(SEARCH_SYNONYMS)
        .flatMap(([key, synonyms]) => {
          const candidates = [key, ...synonyms];
          return candidates.some((candidate) => promptLower.includes(candidate)) ? candidates : [];
        })
        .filter((term) => isUsefulTerm(term) || term.includes(" "))
    )
  );
  const hasSoberIntent =
    promptLower.includes("sober") ||
    promptLower.includes("recovery housing") ||
    strongKeywordTerms.some((term) => term.includes("sober") || term.includes("recovery housing")) ||
    strongNeedTerms.includes("sober-living");
  const hasWomenIntent =
    /\bwoman\b|\bwomen\b|\bfemale\b/.test(promptLower) ||
    eligibilityTerms.includes("female") ||
    eligibilityTerms.includes("women");
  const hasMenIntent =
    /\bman\b|\bmen\b|\bmale\b/.test(promptLower) ||
    eligibilityTerms.includes("male") ||
    eligibilityTerms.includes("men");
  const locationTokens = locationTerm.split(/[\s,/()-]+/).filter(isUsefulTerm);
  const genericIntentTerms = new Set([
    ...needTerms.flatMap((term) => term.split(/[\s,/()-]+/).filter(Boolean)),
    ...eligibilityTerms.flatMap((term) => term.split(/[\s,/()-]+/).filter(Boolean)),
    ...locationTokens,
    ...Object.keys(SEARCH_SYNONYMS).flatMap((term) => term.split(/[\s,/()-]+/).filter(Boolean)),
    ...Object.values(SEARCH_SYNONYMS).flatMap((synonyms) =>
      synonyms.flatMap((term) => term.split(/[\s,/()-]+/).filter(Boolean))
    ),
  ]);
  const nameCandidateTerms = promptLower
    .split(/\W+/)
    .filter(isUsefulTerm)
    .filter((term) => term.length >= 4 && !genericIntentTerms.has(term));
  const exactPromptNameMatch = searchableNames.some((name) => name.includes(promptLower));
  const nameTermMatchCount = searchableNames.reduce((best, name) => {
    const matchCount = nameCandidateTerms.filter((term) => name.includes(term)).length;
    return Math.max(best, matchCount);
  }, 0);
  const directNameMatch =
    searchableNames.some((name) => name.includes(promptLower)) ||
    aliases.some((alias) => alias.includes(promptLower)) ||
    searchableNames.some((name) =>
      strongKeywordTerms.some((term) => !LOW_SIGNAL_TERMS.has(term) && name.includes(term))
    );
  const refinedDirectNameMatch =
    exactPromptNameMatch ||
    aliases.some((alias) => alias.includes(promptLower)) ||
    (nameCandidateTerms.length > 0 && nameTermMatchCount >= Math.min(2, nameCandidateTerms.length));
  let matchedLocation = false;
  let matchedServiceType = false;
  let matchedEligibility = false;
  let matchedPathway = false;

  if (refinedDirectNameMatch) {
    score += 22;
    reasons.push("Strong title or alias match");
  }

  const matchedNeedTerms = needTerms.filter((term) => categoryTerms.some((value) => value.includes(term)));
  matchedServiceType =
    matchedNeedTerms.length > 0 ||
    strongNeedTerms.some((term) => categoryTerms.some((value) => value.includes(term))) ||
    promptServiceTerms.some((term) => categoryTerms.some((value) => value.includes(term)) || searchFields.includes(term));
  if (matchedNeedTerms.length > 0) {
    score += Math.min(32, 12 + matchedNeedTerms.length * 6);
    reasons.push(`Matches service type: ${matchedNeedTerms.slice(0, 3).join(", ")}`);
  }

  if (locationTerm) {
    const locationFields = [textValue(resource.city), textValue(resource.address), ...(resource.locations || []).flatMap((location) => [textValue(location.city), textValue(location.address), textValue(location.zip)])];
    if (locationFields.some((field) => field && (field.includes(locationTerm) || locationTerm.includes(field)))) {
      matchedLocation = true;
      score += 20;
      reasons.push(`Located in or near ${extraction.location}`);
    } else if (matchedNeedTerms.length > 0 || hasSoberIntent || hasWomenIntent || hasMenIntent) {
      score -= 14;
    }
  }

  const matchedKeywordTerms = keywordTerms.filter((term) => (term.includes(" ") || term.length > 3) && searchFields.includes(term));
  if (matchedKeywordTerms.length > 0) {
    const weightedKeywordScore = matchedKeywordTerms.reduce((total, term) => {
      if (term.includes(" ")) return total + 8;
      if (STRONG_PATHWAY_TERMS.includes(term) || term === "narcan" || term === "naloxone") return total + 7;
      if (LOW_SIGNAL_TERMS.has(term)) return total + 1;
      return total + 4;
    }, 0);
    score += Math.min(30, weightedKeywordScore);
    reasons.push(`Matches keywords: ${matchedKeywordTerms.slice(0, 4).join(", ")}`);
  }

  const matchedEligibilityTerms = eligibilityTerms.filter((term) => {
    return (
      populations.some((value) => matchesStructuredTerm(value, term)) ||
      matchesStructuredTerm(genderFocus, term) ||
      searchFields.includes(term)
    );
  });
  if (matchedEligibilityTerms.length > 0) {
    matchedEligibility = true;
    score += Math.min(18, matchedEligibilityTerms.length * 5);
    reasons.push(`Fits eligibility clues: ${matchedEligibilityTerms.slice(0, 3).join(", ")}`);
  }

  if (extraction.urgency === "immediate") {
    const urgentSignals = ["walk-in", "24/7", "same-day", "shelter", "crisis", "hotline", "emergency"];
    const hasUrgentSignal = urgentSignals.some((signal) => searchFields.includes(signal));
    if (hasUrgentSignal) {
      score += 12;
      reasons.push("Supports urgent or same-day needs");
    }
  }

  if (hasWomenIntent && genderFocus === "female") {
    matchedEligibility = true;
    score += 16;
    reasons.push("Aligned with women-specific eligibility");
  } else if (hasWomenIntent && genderFocus === "male") {
    score -= 30;
  }

  if (hasMenIntent && genderFocus === "male") {
    matchedEligibility = true;
    score += 16;
    reasons.push("Aligned with men-specific eligibility");
  } else if (hasMenIntent && genderFocus === "female") {
    score -= 30;
  }

  if (hasSoberIntent && resource.eligibility?.sober_living_required) {
    matchedPathway = true;
    score += 20;
    reasons.push("Supports sober living or recovery housing");
  }

  if (
    hasSoberIntent &&
    categoryTerms.some((term) =>
      STRONG_PATHWAY_TERMS.some((pathwayTerm) => term.includes(pathwayTerm))
    )
  ) {
    matchedPathway = true;
    score += 12;
  }

  if (hasSoberIntent && !resource.eligibility?.sober_living_required && !categoryTerms.some((term) => term.includes("sober-living") || term.includes("transitional-housing") || term.includes("residential-support"))) {
    score -= 10;
  }

  if (/(partner|provider)\s+\d+$/i.test(String(resource.name || "").trim())) {
    score -= 40;
  }

  if (
    searchableNames.some((name) => name.includes("harm reduction")) &&
    (strongKeywordTerms.includes("narcan") || strongKeywordTerms.includes("naloxone") || strongKeywordTerms.includes("fentanyl test strips"))
  ) {
    score += 10;
  }

  if (!hasSoberIntent) matchedPathway = true;
  if (!locationTerm) matchedLocation = true;
  if (!hasWomenIntent && !hasMenIntent && eligibilityTerms.length === 0) matchedEligibility = true;
  if (!matchedServiceType && (strongKeywordTerms.length === 0 && strongNeedTerms.length === 0)) matchedServiceType = true;

  return {
    ...resource,
    matchScore: score,
    matchReasons: Array.from(new Set(reasons)).slice(0, 4),
    _constraintSignals: {
      directNameMatch,
      refinedDirectNameMatch,
      matchedLocation,
      matchedServiceType,
      matchedEligibility,
      matchedPathway,
    },
  };
}

function isGenericPlaceholder(resource: ReturnType<typeof normalizeSearchResource> & { matchScore?: number }) {
  const name = String(resource.name || "").trim();
  const website = String(resource.website || "").trim().toLowerCase();
  const address = String(resource.address || "").trim().toLowerCase();
  const phone = String(resource.phone || "").trim().toLowerCase();

  return (
    /(partner|provider)\s+\d+$/i.test(name) ||
    website === "https://mnrecoveryhub.org" ||
    phone.includes("verified via") ||
    address.includes("verified via outreach")
  );
}

function buildResultBucketKey(resource: ReturnType<typeof normalizeSearchResource>) {
  const name = textValue(resource.name).replace(/\b(partner|provider)\b\s*\d+$/g, "").trim();
  const category = textValue(resource.category);
  const city = textValue(resource.city);
  return `${name}|${category}|${city}`;
}

function collapseRankedResults(results: Array<ReturnType<typeof scoreResource>>) {
  const concrete = results.filter((result) => !isGenericPlaceholder(result));
  const placeholders = results.filter((result) => isGenericPlaceholder(result));
  const seenBuckets = new Set<string>();
  const collapsed: Array<ReturnType<typeof scoreResource>> = [];

  for (const result of concrete) {
    const bucket = buildResultBucketKey(result);
    if (seenBuckets.has(bucket)) continue;
    seenBuckets.add(bucket);
    collapsed.push(result);
  }

  if (collapsed.length < 8) {
    const placeholderBuckets = new Set<string>();
    for (const result of placeholders) {
      const bucket = `${textValue(result.category)}|${textValue(result.city)}`;
      const hasConcretePeer = collapsed.some(
        (entry) => textValue(entry.category) === textValue(result.category)
      );
      if (placeholderBuckets.has(bucket) || hasConcretePeer) continue;
      placeholderBuckets.add(bucket);
      collapsed.push(result);
    }
  }

  return collapsed;
}

function trimLowConfidenceResults(results: Array<ReturnType<typeof scoreResource>>) {
  const topScore = results[0]?.matchScore || 0;
  const minimumScore = Math.max(10, Math.round(topScore * 0.18));
  return results.filter((result) => (result.matchScore || 0) >= minimumScore);
}

function applyHardSearchConstraints(
  results: Array<ReturnType<typeof scoreResource>>,
  extraction: SearchExtraction,
  prompt: string
) {
  const promptLower = prompt.toLowerCase();
  const eligibilityTerms = expandTerms(extraction.eligibility_clues || []);
  const needTerms = expandTerms(extraction.need_types || []);
  const promptServiceTerms = Array.from(
    new Set(
      Object.entries(SEARCH_SYNONYMS)
        .flatMap(([key, synonyms]) => {
          const candidates = [key, ...synonyms];
          return candidates.some((candidate) => promptLower.includes(candidate)) ? candidates : [];
        })
        .filter((term) => isUsefulTerm(term) || term.includes(" "))
    )
  );
  const hasWomenIntent =
    /\bwoman\b|\bwomen\b|\bfemale\b/.test(promptLower) ||
    eligibilityTerms.includes("female") ||
    eligibilityTerms.includes("women");
  const hasMenIntent =
    /\bman\b|\bmen\b|\bmale\b/.test(promptLower) ||
    eligibilityTerms.includes("male") ||
    eligibilityTerms.includes("men");
  const hasSoberIntent =
    promptLower.includes("sober") ||
    promptLower.includes("recovery housing") ||
    promptLower.includes("sober living");
  const hasLocationIntent = Boolean(textValue(extraction.location).replace(/^not specified$/, "").trim());
  const hasStrongServiceIntent =
    hasSoberIntent ||
    needTerms.some((term) => STRONG_PATHWAY_TERMS.includes(term) || term.includes("housing") || term.includes("shelter") || term.includes("treatment") || term.includes("food") || term.includes("employment") || term.includes("legal")) ||
    promptServiceTerms.length > 0;

  return results.filter((result) => {
    const genderFocus = textValue(result.eligibility?.gender_focus);
    const signals = (result as any)._constraintSignals || {
      directNameMatch: false,
      refinedDirectNameMatch: false,
      matchedLocation: true,
      matchedServiceType: true,
      matchedEligibility: true,
      matchedPathway: true,
    };

    if (hasMenIntent && hasSoberIntent && genderFocus === "female") {
      return false;
    }

    if (hasWomenIntent && hasSoberIntent && genderFocus === "male") {
      return false;
    }

    if (hasLocationIntent && (hasStrongServiceIntent || hasWomenIntent || hasMenIntent) && !signals.matchedLocation) {
      return false;
    }

    if (hasStrongServiceIntent && !signals.matchedServiceType) {
      return false;
    }

    if ((hasWomenIntent || hasMenIntent || eligibilityTerms.length > 0) && !signals.matchedEligibility) {
      return false;
    }

    if (hasSoberIntent && !signals.matchedPathway) {
      return false;
    }

    return true;
  });
}

// Seed requested admin user immediately
(async () => {
  try {
    console.log("Setting up events table if it doesn't exist...");
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          slug TEXT UNIQUE NOT NULL,
          description TEXT NOT NULL,
          short_description TEXT,
          category TEXT NOT NULL,
          organizer_name TEXT NOT NULL,
          organizer_type TEXT,
          contact_email TEXT,
          contact_phone TEXT,
          website TEXT,
          registration_link TEXT,
          location_name TEXT,
          address TEXT,
          city TEXT,
          state TEXT,
          zip TEXT,
          latitude DOUBLE PRECISION,
          longitude DOUBLE PRECISION,
          is_virtual BOOLEAN DEFAULT false,
          virtual_event_url TEXT,
          start_datetime TIMESTAMPTZ NOT NULL,
          end_datetime TIMESTAMPTZ,
          timezone TEXT DEFAULT 'UTC',
          recurring BOOLEAN DEFAULT false,
          recurrence_pattern TEXT,
          cost_type TEXT DEFAULT 'free',
          cost_details TEXT,
          status TEXT NOT NULL DEFAULT 'pending_review',
          source_type TEXT DEFAULT 'user_submission',
          source_name TEXT,
          source_url TEXT,
          submitted_by_name TEXT,
          submitted_by_email TEXT,
          verification_notes TEXT,
          ai_summary TEXT,
          ai_category_suggestion TEXT,
          duplicate_check_hash TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          published_at TIMESTAMPTZ,
          archived_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS event_audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          event_id UUID REFERENCES events(id) ON DELETE CASCADE,
          action TEXT NOT NULL,
          previous_status TEXT,
          new_status TEXT,
          changed_by TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    if (tableError) {
      console.log("Could not create events table via RPC (might need manual creation or RPC doesn't exist):", tableError.message);
      // We will just assume the table exists or will be created by the user.
    }

    const adminAccounts: Array<{ email: string; password: string }> = [
      { email: "rosesroses1212@gmail.com", password: "Lovechris*1212" },
      { email: "mariclec35@gmail.com", password: "Lovechris*1212" }
    ];
    const logFile = "seed_results.log";
    
    fs.appendFileSync(logFile, `${new Date().toISOString()} - Seeding check started\n`);
    
    const { data, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      const msg = `Failed to list users during seeding: ${listError.message}`;
      console.error(msg);
      fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
    } else {
      const users = (data.users ?? []) as Array<{ id: string; email?: string | null }>;
      const existingEmails = users.map(u => u.email?.toLowerCase().trim());
      fs.appendFileSync(logFile, `${new Date().toISOString()} - Found ${users.length} existing users: ${existingEmails.join(', ')}\n`);
      
      for (const account of adminAccounts) {
        const targetEmail = account.email.toLowerCase().trim();
        const existingUser = users.find(u => u.email?.toLowerCase().trim() === targetEmail);
        
        if (!existingUser) {
          console.log(`Creating admin user: ${targetEmail}`);
          fs.appendFileSync(logFile, `${new Date().toISOString()} - Attempting to create user ${targetEmail}\n`);
          
          const { data: createData, error: createError } = await supabase.auth.admin.createUser({
            email: targetEmail,
            password: account.password,
            email_confirm: true
          });
          
          if (createError) {
            // If it fails with 500, it might be a Supabase internal state issue.
            // We'll log it more cleanly.
            const msg = `Failed to create admin user ${targetEmail}: ${createError.message} (${createError.status})`;
            console.error(msg);
            fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
            
            // If it failed but maybe the user actually exists (Supabase glitch), 
            // we'll try to find it again in the next run or just skip for now.
          } else {
            const msg = `Successfully created admin user: ${targetEmail}`;
            console.log(msg);
            fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
          }
        } else {
          // If user exists, ensure password is set to the expected one for recovery
          console.log(`Updating admin user ${account.email} password...`);
          fs.appendFileSync(logFile, `${new Date().toISOString()} - Updating user ${account.email}\n`);
          const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
            password: account.password,
            email_confirm: true
          });
          
          if (updateError) {
            const msg = `Failed to update admin user ${account.email}: ${JSON.stringify(updateError)}`;
            console.error(msg);
            fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
          } else {
            const msg = `Successfully updated admin user ${account.email}`;
            console.log(msg);
            fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
          }
        }
      }
    }
  } catch (err: any) {
    const msg = `Unexpected error during seeding: ${err.message}`;
    console.error(msg);
    fs.appendFileSync("seed_results.log", `${new Date().toISOString()} - ${msg}\n`);
  }
})();

app.use(express.json());

// API: Log Error
app.post("/api/log-error", async (req, res) => {
  const { 
    source, 
    severity, 
    message, 
    stack, 
    route, 
    endpoint, 
    user_id, 
    session_id, 
    metadata 
  } = req.body;

  // Basic validation
  if (!message || !source || !severity) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { error } = await supabase.from("error_events").insert({
      source,
      severity,
      message,
      stack,
      route,
      endpoint,
      user_id,
      session_id,
      metadata,
    });

    if (error) throw error;
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("Failed to log error to Supabase:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API: List Admin Users
app.get("/api/admin/users", async (req, res) => {
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    
    // Return only necessary info
    const sanitizedUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      last_sign_in_at: u.last_sign_in_at,
      created_at: u.created_at
    }));
    
    res.status(200).json(sanitizedUsers);
  } catch (err: any) {
    console.error("Failed to list users:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API: Create Admin User
app.post("/api/admin/users", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    console.log(`Attempting to create admin user: ${email}`);
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    
    if (error) {
      console.error("Supabase createUser error:", error);
      const authError = error as any;
      return res.status(error.status || 500).json({ 
        error: error.message || "Internal server error",
        details: authError.details || undefined
      });
    }
    
    console.log(`Successfully created admin user: ${data.user.id}`);
    res.status(201).json(data.user);
  } catch (err: any) {
    console.error("Failed to create user:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API: Delete Admin User
app.delete("/api/admin/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("Failed to delete user:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API: Reset Password (Send Email)
app.post("/api/admin/users/:id/reset-password", async (req, res) => {
  const { id } = req.params;
  try {
    // Get user email first
    const { data: { user }, error: getError } = await supabase.auth.admin.getUserById(id);
    if (getError || !user || !user.email) throw getError || new Error("User not found");

    const { error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: user.email,
    });
    if (error) throw error;
    res.status(200).json({ status: "ok", message: "Reset link generated (check server logs or email if configured)" });
  } catch (err: any) {
    console.error("Failed to reset password:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API: Reset Categories
app.post("/api/admin/categories/reset", async (req, res) => {
  try {
    // 1. Delete all existing categories
    const { error: deleteError } = await supabase.from("categories").delete().neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all
    if (deleteError) throw deleteError;

    const newCategories = [
      { name: "The Basics", sub: ["Clothes", "Food Resources", "Free Meals", "Showers", "Drop-in Centers", "Overnight Shelter", "Transitional & Supportive Housing", "Housing Assistance", "Furniture", "Advocacy & Case Management", "Pet Resources"] },
      { name: "Public Assistance", sub: ["Minnesota Family Investment Program (MFIP)", "Emergency Assistance / Emergency GA (EA/EGA)", "Energy Assistance", "Supplemental Nutrition Assistance Program", "General Assistance (GA)", "Medical Assistance & MinnesotaCare", "Minnesota Supplemental Aid (MSA)", "Social Security"] },
      { name: "Health Care", sub: ["Community Clinics", "Health Care for the Homeless", "HIV / STI / Pregnancy Testing", "Dental Care", "Mental Health Services", "Veterans", "Youth", "Substance Use Disorder Counseling & Treatment"] },
      { name: "Education & Employment", sub: ["Educational Programs", "Job Training & Placement", "Day and Temporary Labor"] },
      { name: "Special Help & Advocacy", sub: ["Youth Programs", "Services for Immigrants", "Help for Veterans", "Victims of Abuse and Crime", "Legal Assistance", "Police Misconduct", "Programs for Ex-Offenders"] }
    ];

    for (let i = 0; i < newCategories.length; i++) {
      const primary = newCategories[i];
      const { data: primaryData, error: primaryError } = await supabase
        .from("categories")
        .insert({ name: primary.name, sequence: (i + 1) * 10 })
        .select()
        .single();

      if (primaryError) throw primaryError;

      const subInserts = primary.sub.map((name, index) => ({
        name,
        parent_id: primaryData.id,
        sequence: (index + 1)
      }));

      const { error: subError } = await supabase.from("categories").insert(subInserts);
      if (subError) throw subError;
    }

    res.status(200).json({ status: "ok", message: "Categories reset successfully" });
  } catch (err: any) {
    console.error("Failed to reset categories:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API: Maintenance - Clear Categories and Set Resources to Pending
app.post("/api/admin/maintenance/clear-and-pending", async (req, res) => {
  try {
    console.log("Starting maintenance: Clear categories and set resources to pending");
    
    // 1. Delete all categories
    const { error: catError } = await supabase
      .from("categories")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    
    if (catError) throw catError;

    // 2. Update all resources to needs_verification
    const { error: resError } = await supabase
      .from("resources")
      .update({ status: "needs_verification" })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    
    if (resError) throw resError;

    console.log("Maintenance completed successfully");
    res.status(200).json({ 
      status: "ok", 
      message: "Successfully removed all categories and marked all resources for verification." 
    });
  } catch (err: any) {
    console.error("Maintenance reset error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// API: Search Analytics
app.post("/api/search/analytics", async (req, res) => {
  const { 
    raw_prompt, 
    extracted_needs_json, 
    inferred_location, 
    inferred_urgency, 
    inferred_need_types, 
    results_count, 
    matched_resource_ids, 
    search_success,
    session_id
  } = req.body;

  try {
    const { error } = await supabase.from("search_analytics").insert({
      raw_prompt,
      extracted_needs_json,
      inferred_location,
      inferred_urgency,
      inferred_need_types,
      results_count,
      matched_resource_ids,
      search_success,
      session_id
    });

    if (error) throw error;
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("Analytics logging error:", err);
    res.status(500).json({ error: "Failed to log analytics" });
  }
});

// API: Search Resources
app.post("/api/search/resources", async (req, res) => {
  const { prompt } = req.body || {};

  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  try {
    const extraction = await extractNeeds(prompt.trim());
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .neq("status", "temporarily_closed");

    if (error) throw error;

    const normalizedResources = ((data || []) as SearchResource[]).map(normalizeSearchResource);
    const ranked = normalizedResources
      .map((resource) => scoreResource(resource, extraction, prompt.trim()))
      .filter((resource) => (resource as any).matchScore > 0)
      .sort((a, b) => ((b as any).matchScore || 0) - ((a as any).matchScore || 0));

    const constrained = applyHardSearchConstraints(ranked, extraction, prompt.trim());
    const collapsed = trimLowConfidenceResults(collapseRankedResults(constrained)).slice(0, 24);

    res.status(200).json({
      extraction,
      results: collapsed,
      result_count: collapsed.length,
    });
  } catch (err: any) {
    console.error("Resource search failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public: Get resources for the directory
app.get("/api/resources", async (req, res) => {
  try {
    const { ids, org_slug, parent_org_slug, includeRelations } = req.query;
    let query = supabase
      .from("resources")
      .select("*")
      .neq("status", "temporarily_closed");

    if (typeof ids === "string" && ids.trim()) {
      const parsedIds = ids
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      if (parsedIds.length > 0) {
        query = query.in("id", parsedIds);
      }
    } else if (typeof org_slug === "string" && org_slug.trim()) {
      query = query.eq("org_slug", org_slug.trim()).limit(1);
    } else if (typeof parent_org_slug === "string" && parent_org_slug.trim()) {
      query = query.eq("parent_org_slug", parent_org_slug.trim()).order("name");
    } else {
      query = query.order("name");
    }

    const { data, error } = await query;
    if (error) throw error;

    if (typeof org_slug === "string" && org_slug.trim()) {
      const resource = (data || [])[0] || null;

      if (includeRelations === "true" && resource) {
        const parentSlug = typeof resource.parent_org_slug === "string" ? resource.parent_org_slug.trim() : "";
        const resourceOrgSlug = typeof resource.org_slug === "string" ? resource.org_slug.trim() : "";

        let parentOrganization = null;
        let childLocations: any[] = [];

        if (parentSlug && parentSlug !== "independent-provider") {
          const { data: parent } = await supabase
            .from("resources")
            .select("*")
            .eq("org_slug", parentSlug)
            .neq("status", "temporarily_closed")
            .limit(1)
            .maybeSingle();

          parentOrganization = parent || null;
        }

        if (resourceOrgSlug) {
          const { data: children } = await supabase
            .from("resources")
            .select("*")
            .eq("parent_org_slug", resourceOrgSlug)
            .neq("status", "temporarily_closed")
            .order("name");

          childLocations = children || [];
        }

        return res.status(200).json({
          ...resource,
          parent_organization: parentOrganization,
          child_locations: childLocations,
          map_cluster_children: childLocations,
        });
      }

      return res.status(200).json(resource);
    }

    if (includeRelations === "true") {
      const relatedResources = await Promise.all(
        (data || []).map(async (resource: any) => {
          const parentSlug = typeof resource.parent_org_slug === "string" ? resource.parent_org_slug.trim() : "";
          const resourceOrgSlug = typeof resource.org_slug === "string" ? resource.org_slug.trim() : "";

          let parentOrganization = null;
          let childLocations: any[] = [];

          if (parentSlug && parentSlug !== "independent-provider") {
            const { data: parent } = await supabase
              .from("resources")
              .select("*")
              .eq("org_slug", parentSlug)
              .neq("status", "temporarily_closed")
              .limit(1)
              .maybeSingle();

            parentOrganization = parent || null;
          }

          if (resourceOrgSlug) {
            const { data: children } = await supabase
              .from("resources")
              .select("*")
              .eq("parent_org_slug", resourceOrgSlug)
              .neq("status", "temporarily_closed")
              .order("name");

            childLocations = children || [];
          }

          return {
            ...resource,
            parent_organization: parentOrganization,
            child_locations: childLocations,
            map_cluster_children: childLocations,
          };
        })
      );

      return res.status(200).json(relatedResources);
    }

    res.status(200).json(data || []);
  } catch (err: any) {
    console.error("Failed to fetch resources:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public: Get a single resource
app.get("/api/resources/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("id", id)
      .neq("status", "temporarily_closed")
      .single();

    if (error) throw error;

    if (req.query.includeRelations === "true") {
      const parentSlug = typeof data.parent_org_slug === "string" ? data.parent_org_slug.trim() : "";
      const orgSlug = typeof data.org_slug === "string" ? data.org_slug.trim() : "";

      let parentOrganization = null;
      let childLocations: any[] = [];

      if (parentSlug && parentSlug !== "independent-provider") {
        const { data: parent } = await supabase
          .from("resources")
          .select("*")
          .eq("org_slug", parentSlug)
          .neq("status", "temporarily_closed")
          .limit(1)
          .maybeSingle();

        parentOrganization = parent || null;
      }

      if (orgSlug) {
        const { data: children } = await supabase
          .from("resources")
          .select("*")
          .eq("parent_org_slug", orgSlug)
          .neq("status", "temporarily_closed")
          .order("name");

        childLocations = children || [];
      }

      return res.status(200).json({
        ...data,
        parent_organization: parentOrganization,
        child_locations: childLocations,
        map_cluster_children: childLocations,
      });
    }

    res.status(200).json(data);
  } catch (err: any) {
    console.error("Failed to fetch resource:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public: Get browse categories
app.get("/api/categories", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .is("parent_id", null);

    if (error) throw error;

    const activeCategories = (data || [])
      .filter((category: any) => category.is_active !== false)
      .sort((a: any, b: any) => {
        const sequenceDiff = (a.sequence ?? a.display_order ?? 0) - (b.sequence ?? b.display_order ?? 0);
        if (sequenceDiff !== 0) return sequenceDiff;
        return String(a.name || "").localeCompare(String(b.name || ""));
      });
    res.status(200).json(activeCategories);
  } catch (err: any) {
    console.error("Failed to fetch categories:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public: Get homepage stats
app.get("/api/stats/homepage", async (_req, res) => {
  try {
    const nowIso = new Date().toISOString();

    const [resourcesResult, meetingsResult, eventsResult] = await Promise.all([
      supabase
        .from("resources")
        .select("*", { count: "exact", head: true })
        .neq("status", "temporarily_closed"),
      supabase
        .from("meetings")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("events")
        .select("*", { count: "exact", head: true })
        .eq("status", "published")
        .gte("start_datetime", nowIso),
    ]);

    if (resourcesResult.error) throw resourcesResult.error;
    if (meetingsResult.error) throw meetingsResult.error;
    if (eventsResult.error) throw eventsResult.error;

    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      "Surrogate-Control": "no-store",
    });

    res.status(200).json({
      resources: resourcesResult.count || 0,
      meetings: meetingsResult.count || 0,
      events: eventsResult.count || 0,
    });
  } catch (err: any) {
    console.error("Failed to fetch homepage stats:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API: Get Homepage Settings
app.get("/api/homepage-settings", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("resources")
      .select("description")
      .eq("name", "HOMEPAGE_SETTINGS")
      .eq("category", "SYSTEM")
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw error;
    }

    if (!data) {
      // Return default settings
      return res.status(200).json({
        primaryHeader: "Find the support you need.",
        secondaryHeader: "Whether you know exactly what you're looking for or just need to describe your situation, we're here to help.",
        quickActions: [
          { name: "Shelter Tonight", prompt: "I need emergency shelter tonight.", icon: "Moon" },
          { name: "Find a Meeting", prompt: "I want to find a recovery meeting near me.", icon: "Users" },
          { name: "Food This Week", prompt: "I need help getting food this week.", icon: "Utensils" },
          { name: "Job Help", prompt: "I am looking for employment assistance.", icon: "Briefcase" },
          { name: "Transportation Help", prompt: "I need help with transportation or bus passes.", icon: "Car" },
          { name: "Help for Families", prompt: "I need support services for my family and children.", icon: "Heart" }
        ]
      });
    }

    res.status(200).json(JSON.parse(data.description));
  } catch (err: any) {
    console.error("Failed to get homepage settings:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// API: Update Homepage Settings
app.post("/api/homepage-settings", async (req, res) => {
  const settings = req.body;
  try {
    // Check if it exists
    const { data: existing } = await supabase
      .from("resources")
      .select("id")
      .eq("name", "HOMEPAGE_SETTINGS")
      .eq("category", "SYSTEM")
      .single();

    if (existing) {
      const { error } = await supabase
        .from("resources")
        .update({ description: JSON.stringify(settings) })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("resources")
        .insert({
          name: "HOMEPAGE_SETTINGS",
          category: "SYSTEM",
          description: JSON.stringify(settings),
          status: "active"
        });
      if (error) throw error;
    }

    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("Failed to update homepage settings:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- EVENTS API ---

// Public: Get all published events
app.get("/api/events", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("status", "published")
      .order("start_datetime", { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err: any) {
    console.error("Failed to fetch events:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public: Get single published event
app.get("/api/events/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", id)
      .eq("status", "published")
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err: any) {
    console.error("Failed to fetch event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Public: Submit an event (goes to pending_review)
app.post("/api/events", async (req, res) => {
  const eventData = req.body;
  
  // Generate a basic slug from the title
  const baseSlug = eventData.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  try {
    const { data, error } = await supabase
      .from("events")
      .insert({ ...eventData, slug, status: "pending_review" })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    console.error("Failed to submit event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Get all events (any status)
app.get("/api/admin/events", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (err: any) {
    console.error("Failed to fetch admin events:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Create event
app.post("/api/admin/events", async (req, res) => {
  const eventData = req.body;
  
  // Generate a basic slug from the title if not provided
  if (!eventData.slug) {
    const baseSlug = eventData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    eventData.slug = `${baseSlug}-${Date.now().toString(36)}`;
  }

  try {
    const { data, error } = await supabase
      .from("events")
      .insert(eventData)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    console.error("Failed to create event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Update event
app.put("/api/admin/events/:id", async (req, res) => {
  const { id } = req.params;
  const eventData = req.body;
  try {
    const { data, error } = await supabase
      .from("events")
      .update({ ...eventData, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (err: any) {
    console.error("Failed to update event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: Delete event
app.delete("/api/admin/events/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", id);

    if (error) throw error;
    res.status(200).json({ status: "ok" });
  } catch (err: any) {
    console.error("Failed to delete event:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Middleware for automatic API error logging
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("API Error:", err);
  
  // Log to Supabase asynchronously
  supabase.from("error_events").insert({
    source: "api",
    severity: "error",
    message: err.message || "Unknown API Error",
    stack: err.stack,
    endpoint: req.originalUrl,
    metadata: {
      method: req.method,
      body: req.body,
      query: req.query,
      headers: req.headers,
    }
  }).then(({ error }) => {
    if (error) console.error("Failed to log API error to Supabase:", error);
  });

  res.status(500).json({ error: "Internal server error" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist", { index: false }));
    let htmlTemplate = "";
    try {
      htmlTemplate = fs.readFileSync("dist/index.html", "utf-8");
    } catch (e) {
      console.error("Could not read dist/index.html", e);
    }
    app.get("*", (req, res) => {
      try {
        const envScript = `<script>window.ENV = ${JSON.stringify({
          VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "",
          VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "",
          GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.VITE_CUSTOM_GEMINI_KEY || ""
        })};</script>`;
        const html = htmlTemplate.replace("</head>", `${envScript}</head>`);
        res.send(html);
      } catch (err) {
        console.error("Error serving index.html:", err);
        res.status(500).send("Internal Server Error");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

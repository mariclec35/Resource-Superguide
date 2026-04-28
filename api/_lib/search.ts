import { GoogleGenAI, Type } from "@google/genai";

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
  "and", "for", "from", "get", "help", "house", "housing", "in", "need", "near",
  "of", "or", "paul", "place", "program", "recovery", "resource", "resources",
  "services", "st", "support", "the", "this", "where",
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
  return valueParts.includes(normalizedTerm) || termParts.includes(normalizedValue) || termParts.every((part) => valueParts.includes(part));
}

function expandTerms(terms: string[]) {
  const expanded = new Set<string>();
  for (const term of terms) {
    const normalized = textValue(term).trim();
    if (!normalized) continue;
    if (isUsefulTerm(normalized) || normalized.includes(" ")) expanded.add(normalized);
    normalized.split(/[\s,/()-]+/).filter(Boolean).filter(isUsefulTerm).forEach((part) => expanded.add(part));
    for (const [key, synonyms] of Object.entries(SEARCH_SYNONYMS)) {
      if (normalized === key || synonyms.some((synonym) => normalized.includes(synonym) || synonym.includes(normalized))) {
        if (isUsefulTerm(key) || key.includes(" ")) expanded.add(key);
        synonyms.filter((synonym) => isUsefulTerm(synonym) || synonym.includes(" ")).forEach((synonym) => expanded.add(synonym));
      }
    }
  }
  return Array.from(expanded);
}

export function normalizeSearchResource(resource: SearchResource) {
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
    location.label || "", location.address || "", location.city || "", location.state || "", location.zip || "",
  ]);

  return [
    resource.name, resource.category, resource.subcategory, resource.city, resource.address, resource.phone,
    resource.website, resource.provides, resource.remarks, resource.details, resource.search_embeddings_text,
    resource.metadata?.referral_required, ...aliases, ...pathTags, ...populations, ...childPrograms, ...nextStepReferrals, ...locations,
  ].filter(Boolean).join(" ").toLowerCase();
}

export async function extractNeeds(prompt: string): Promise<SearchExtraction> {
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
    const ai = new GoogleGenAI({ apiKey });
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
  } catch {
    return fallback;
  }
}

function scoreResource(resource: ReturnType<typeof normalizeSearchResource>, extraction: SearchExtraction, prompt: string) {
  const searchFields = getSearchFields(resource);
  const promptLower = prompt.toLowerCase();
  const needTerms = expandTerms(extraction.need_types || []);
  const keywordTerms = expandTerms([...(extraction.keywords || []), ...(extraction.preferences || []), ...(extraction.barriers || [])]);
  const eligibilityTerms = expandTerms(extraction.eligibility_clues || []);
  const categoryTerms = [textValue(resource.category), textValue(resource.subcategory), ...(resource.metadata?.pathway_tags || []).map(textValue)].filter(Boolean);
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
  const hasSoberIntent = promptLower.includes("sober") || promptLower.includes("recovery housing") || strongKeywordTerms.some((term) => term.includes("sober") || term.includes("recovery housing")) || strongNeedTerms.includes("sober-living");
  const hasWomenIntent = /\bwoman\b|\bwomen\b|\bfemale\b/.test(promptLower) || eligibilityTerms.includes("female") || eligibilityTerms.includes("women");
  const hasMenIntent = /\bman\b|\bmen\b|\bmale\b/.test(promptLower) || eligibilityTerms.includes("male") || eligibilityTerms.includes("men");
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
  const directNameMatch = searchableNames.some((name) => name.includes(promptLower)) || aliases.some((alias) => alias.includes(promptLower)) || searchableNames.some((name) => strongKeywordTerms.some((term) => !LOW_SIGNAL_TERMS.has(term) && name.includes(term)));
  const refinedDirectNameMatch =
    exactPromptNameMatch ||
    aliases.some((alias) => alias.includes(promptLower)) ||
    (nameCandidateTerms.length > 0 && nameTermMatchCount >= Math.min(2, nameCandidateTerms.length));
  let matchedLocation = false;
  let matchedServiceType = false;
  let matchedEligibility = false;
  let matchedPathway = false;

  if (refinedDirectNameMatch) { score += 22; reasons.push("Strong title or alias match"); }
  const matchedNeedTerms = needTerms.filter((term) => categoryTerms.some((value) => value.includes(term)));
  matchedServiceType =
    matchedNeedTerms.length > 0 ||
    strongNeedTerms.some((term) => categoryTerms.some((value) => value.includes(term))) ||
    promptServiceTerms.some((term) => categoryTerms.some((value) => value.includes(term)) || searchFields.includes(term));
  if (matchedNeedTerms.length > 0) { score += Math.min(32, 12 + matchedNeedTerms.length * 6); reasons.push(`Matches service type: ${matchedNeedTerms.slice(0, 3).join(", ")}`); }
  if (locationTerm) {
    const locationFields = [textValue(resource.city), textValue(resource.address), ...(resource.locations || []).flatMap((location) => [textValue(location.city), textValue(location.address), textValue(location.zip)])];
    if (locationFields.some((field) => field && (field.includes(locationTerm) || locationTerm.includes(field)))) {
      matchedLocation = true;
      score += 20; reasons.push(`Located in or near ${extraction.location}`);
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
  const matchedEligibilityTerms = eligibilityTerms.filter((term) => populations.some((value) => matchesStructuredTerm(value, term)) || matchesStructuredTerm(genderFocus, term) || searchFields.includes(term));
  if (matchedEligibilityTerms.length > 0) {
    matchedEligibility = true;
    score += Math.min(18, matchedEligibilityTerms.length * 5);
    reasons.push(`Fits eligibility clues: ${matchedEligibilityTerms.slice(0, 3).join(", ")}`);
  }
  if (extraction.urgency === "immediate") {
    const urgentSignals = ["walk-in", "24/7", "same-day", "shelter", "crisis", "hotline", "emergency"];
    if (urgentSignals.some((signal) => searchFields.includes(signal))) {
      score += 12; reasons.push("Supports urgent or same-day needs");
    }
  }
  if (hasWomenIntent && genderFocus === "female") { matchedEligibility = true; score += 16; reasons.push("Aligned with women-specific eligibility"); }
  else if (hasWomenIntent && genderFocus === "male") { score -= 30; }
  if (hasMenIntent && genderFocus === "male") { matchedEligibility = true; score += 16; reasons.push("Aligned with men-specific eligibility"); }
  else if (hasMenIntent && genderFocus === "female") { score -= 30; }
  if (hasSoberIntent && resource.eligibility?.sober_living_required) { matchedPathway = true; score += 20; reasons.push("Supports sober living or recovery housing"); }
  if (hasSoberIntent && categoryTerms.some((term) => STRONG_PATHWAY_TERMS.some((pathwayTerm) => term.includes(pathwayTerm)))) { matchedPathway = true; score += 12; }
  if (hasSoberIntent && !resource.eligibility?.sober_living_required && !categoryTerms.some((term) => term.includes("sober-living") || term.includes("transitional-housing") || term.includes("residential-support"))) score -= 10;
  if (/(partner|provider)\s+\d+$/i.test(String(resource.name || "").trim())) score -= 40;
  if (searchableNames.some((name) => name.includes("harm reduction")) && (strongKeywordTerms.includes("narcan") || strongKeywordTerms.includes("naloxone") || strongKeywordTerms.includes("fentanyl test strips"))) score += 10;
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
  return /(partner|provider)\s+\d+$/i.test(name) || website === "https://mnrecoveryhub.org" || phone.includes("verified via") || address.includes("verified via outreach");
}

function buildResultBucketKey(resource: ReturnType<typeof normalizeSearchResource>) {
  const name = textValue(resource.name).replace(/\b(partner|provider)\b\s*\d+$/g, "").trim();
  return `${name}|${textValue(resource.category)}|${textValue(resource.city)}`;
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
      const hasConcretePeer = collapsed.some((entry) => textValue(entry.category) === textValue(result.category));
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

function applyHardSearchConstraints(results: Array<ReturnType<typeof scoreResource>>, extraction: SearchExtraction, prompt: string) {
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
  const hasWomenIntent = /\bwoman\b|\bwomen\b|\bfemale\b/.test(promptLower) || eligibilityTerms.includes("female") || eligibilityTerms.includes("women");
  const hasMenIntent = /\bman\b|\bmen\b|\bmale\b/.test(promptLower) || eligibilityTerms.includes("male") || eligibilityTerms.includes("men");
  const hasSoberIntent = promptLower.includes("sober") || promptLower.includes("recovery housing") || promptLower.includes("sober living");
  const hasLocationIntent = Boolean(textValue(extraction.location).replace(/^not specified$/, "").trim());
  const hasStrongServiceIntent =
    hasSoberIntent ||
    needTerms.some((term) => STRONG_PATHWAY_TERMS.includes(term) || term.includes("housing") || term.includes("shelter") || term.includes("treatment") || term.includes("food") || term.includes("employment") || term.includes("legal")) ||
    promptServiceTerms.length > 0;

  return results.filter((result) => {
    const genderFocus = textValue(result.eligibility?.gender_focus);
    const signals = result._constraintSignals || {
      directNameMatch: false,
      refinedDirectNameMatch: false,
      matchedLocation: true,
      matchedServiceType: true,
      matchedEligibility: true,
      matchedPathway: true,
    };
    if (hasMenIntent && hasSoberIntent && genderFocus === "female") return false;
    if (hasWomenIntent && hasSoberIntent && genderFocus === "male") return false;
    if (hasLocationIntent && (hasStrongServiceIntent || hasWomenIntent || hasMenIntent) && !signals.matchedLocation) return false;
    if (hasStrongServiceIntent && !signals.matchedServiceType) return false;
    if ((hasWomenIntent || hasMenIntent || eligibilityTerms.length > 0) && !signals.matchedEligibility) return false;
    if (hasSoberIntent && !signals.matchedPathway) return false;
    return true;
  });
}

export async function searchResources(resources: SearchResource[], prompt: string) {
  const extraction = await extractNeeds(prompt.trim());
  const normalizedResources = resources.map(normalizeSearchResource);
  const ranked = normalizedResources
    .map((resource) => scoreResource(resource, extraction, prompt.trim()))
    .filter((resource) => resource.matchScore > 0)
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

  const constrained = applyHardSearchConstraints(ranked, extraction, prompt.trim());
  const results = trimLowConfidenceResults(collapseRankedResults(constrained)).slice(0, 24);

  return { extraction, results, result_count: results.length };
}

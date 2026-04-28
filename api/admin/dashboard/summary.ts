import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../../_lib/supabase.js";

type CountResult = {
  configured: boolean;
  count: number;
};

async function safeCount(table: string, filter?: (query: any) => any): Promise<CountResult> {
  try {
    let query = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) {
      query = filter(query);
    }
    const { count, error } = await query;
    if (error) {
      if (error.message?.includes("schema cache")) {
        return { configured: false, count: 0 };
      }
      throw error;
    }
    return { configured: true, count: count || 0 };
  } catch (error: any) {
    if (error?.message?.includes("schema cache")) {
      return { configured: false, count: 0 };
    }
    throw error;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const [
      resourcesCount,
      categoriesCount,
      eventsCount,
      meetingsCount,
      linkedMeetingsCount,
      reportsCount,
      openReportsCount,
      feedbackCount,
      pendingFeedbackCount,
      searchCount,
      resourceRows,
      recentErrors,
      recentResources,
      recentEvents,
      searchLogs,
    ] = await Promise.all([
      safeCount("resources"),
      safeCount("categories"),
      safeCount("events"),
      safeCount("meetings"),
      safeCount("meetings", (q) => q.not("parent_org_slug", "is", null)),
      safeCount("reports"),
      safeCount("reports", (q) => q.eq("report_status", "open")),
      safeCount("resource_feedback"),
      safeCount("resource_feedback", (q) => q.eq("status", "pending")),
      safeCount("search_analytics"),
      supabase.from("resources").select("id,name,category,subcategory,status,review_count,average_rating,created_at,updated_at").order("name"),
      supabase.from("error_events").select("id,created_at,message,severity,endpoint,route").order("created_at", { ascending: false }).limit(8),
      supabase.from("resources").select("id,name,status,created_at,updated_at").order("updated_at", { ascending: false }).limit(6),
      supabase.from("events").select("id,title,status,updated_at,created_at,start_datetime").order("updated_at", { ascending: false }).limit(6),
      supabase.from("search_analytics").select("id,raw_prompt,results_count,created_at,search_success,extracted_needs_json").order("created_at", { ascending: false }).limit(100),
    ]);

    const resources = resourceRows.data || [];
    const reviewsEnabled = resources.some((resource: any) => (resource.review_count || 0) > 0 || (resource.average_rating || 0) > 0);
    const topResources = reviewsEnabled
      ? [...resources]
          .sort((a: any, b: any) => (b.review_count || 0) - (a.review_count || 0))
          .slice(0, 5)
      : [...resources]
          .sort((a: any, b: any) => Date.parse(b.updated_at || b.created_at || 0) - Date.parse(a.updated_at || a.created_at || 0))
          .slice(0, 5);

    const categoryCounts = new Map<string, { name: string; total: number; subcategories: Map<string, number> }>();
    for (const resource of resources as any[]) {
      const categoryName = resource.category || "Uncategorized";
      if (!categoryCounts.has(categoryName)) {
        categoryCounts.set(categoryName, { name: categoryName, total: 0, subcategories: new Map() });
      }
      const category = categoryCounts.get(categoryName)!;
      category.total += 1;
      if (resource.subcategory) {
        category.subcategories.set(resource.subcategory, (category.subcategories.get(resource.subcategory) || 0) + 1);
      }
    }

    const derivedCategories = [...categoryCounts.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((category) => ({
        name: category.name,
        total: category.total,
        subcategories: [...category.subcategories.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([name, total]) => ({ name, total })),
      }));

    const searchConfigured = searchCount.configured;
    const searchRows = Array.isArray(searchLogs.data) ? searchLogs.data : [];
    const successfulSearches = searchRows.filter((row: any) => row.search_success).length;
    const zeroResultSearches = searchRows.filter((row: any) => row.results_count === 0).length;
    const avgResults = searchRows.length
      ? searchRows.reduce((sum: number, row: any) => sum + (row.results_count || 0), 0) / searchRows.length
      : 0;
    const searchSuccessRate = searchRows.length ? (successfulSearches / searchRows.length) * 100 : 0;

    return res.status(200).json({
      resources: {
        total: resourcesCount.count,
        active: resources.filter((resource: any) => resource.status === "active").length,
        needsVerification: resources.filter((resource: any) => resource.status === "needs_verification").length,
        temporarilyClosed: resources.filter((resource: any) => resource.status === "temporarily_closed").length,
        topResources,
        recentResources: recentResources.data || [],
        derivedCategories,
        reviewsEnabled,
      },
      categories: {
        total: categoriesCount.count,
        configured: categoriesCount.configured,
      },
      meetings: {
        total: meetingsCount.count,
        linked: linkedMeetingsCount.count,
        unlinked: Math.max(meetingsCount.count - linkedMeetingsCount.count, 0),
      },
      events: {
        total: eventsCount.count,
        recentEvents: recentEvents.data || [],
      },
      reports: {
        total: reportsCount.count,
        open: openReportsCount.count,
        configured: reportsCount.configured,
      },
      feedback: {
        total: feedbackCount.count,
        pending: pendingFeedbackCount.count,
        configured: feedbackCount.configured,
      },
      searchAnalytics: {
        configured: searchConfigured,
        total: searchCount.count,
        successRate: searchSuccessRate,
        zeroResultRate: searchRows.length ? (zeroResultSearches / searchRows.length) * 100 : 0,
        avgResults,
        recentSearches: searchRows,
      },
      errorEvents: {
        total: (await safeCount("error_events")).count,
        recent: recentErrors.data || [],
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || "Unable to load admin summary",
    });
  }
}

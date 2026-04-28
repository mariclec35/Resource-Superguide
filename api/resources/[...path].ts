import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "../_lib/supabase.js";

async function attachResourceRelations(resource: any) {
  if (!resource) return resource;

  const parentSlug = typeof resource.parent_org_slug === "string" ? resource.parent_org_slug.trim() : "";
  const orgSlug = typeof resource.org_slug === "string" ? resource.org_slug.trim() : "";

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

  return {
    ...resource,
    parent_organization: parentOrganization,
    child_locations: childLocations,
    map_cluster_children: childLocations,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const pathParam = req.query.path;
    const pathSegments = Array.isArray(pathParam) ? pathParam : typeof pathParam === "string" ? [pathParam] : [];
    const includeRelations = req.query.includeRelations === "true";

    if (pathSegments.length === 0) {
      const { ids, org_slug, parent_org_slug } = req.query;
      let query = supabase.from("resources").select("*").neq("status", "temporarily_closed");

      if (typeof ids === "string" && ids.trim()) {
        const parsedIds = ids.split(",").map((id) => id.trim()).filter(Boolean);
        if (parsedIds.length > 0) query = query.in("id", parsedIds);
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
        return res.status(200).json(includeRelations ? await attachResourceRelations(resource) : resource);
      }

      if (includeRelations) {
        const relatedResources = await Promise.all((data || []).map((resource) => attachResourceRelations(resource)));
        return res.status(200).json(relatedResources);
      }

      return res.status(200).json(data || []);
    }

    const resourceId = pathSegments[0];
    const { data, error } = await supabase
      .from("resources")
      .select("*")
      .eq("id", resourceId)
      .neq("status", "temporarily_closed")
      .single();

    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ error: "Not found" });
      throw error;
    }

    if (includeRelations) {
      return res.status(200).json(await attachResourceRelations(data));
    }

    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

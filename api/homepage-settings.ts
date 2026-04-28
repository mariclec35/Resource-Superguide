import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "./_lib/supabase.js";

const defaultSettings = {
  primaryHeader: "Find the support you need.",
  secondaryHeader: "Whether you know exactly what you're looking for or just need to describe your situation, we're here to help.",
  quickActions: [
    { name: "Shelter Tonight", prompt: "I need emergency shelter tonight.", icon: "Moon" },
    { name: "Find a Meeting", prompt: "I want to find a recovery meeting near me.", icon: "Users" },
    { name: "Food This Week", prompt: "I need help getting food this week.", icon: "Utensils" },
    { name: "Job Help", prompt: "I am looking for employment assistance.", icon: "Briefcase" },
    { name: "Transportation Help", prompt: "I need help with transportation or bus passes.", icon: "Car" },
    { name: "Help for Families", prompt: "I need support services for my family and children.", icon: "Heart" },
  ],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("resources")
        .select("description")
        .eq("name", "HOMEPAGE_SETTINGS")
        .eq("category", "SYSTEM")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      if (!data) return res.status(200).json(defaultSettings);
      return res.status(200).json(JSON.parse(data.description));
    }

    if (req.method === "POST") {
      const settings = req.body;
      const { data: existing } = await supabase
        .from("resources")
        .select("id")
        .eq("name", "HOMEPAGE_SETTINGS")
        .eq("category", "SYSTEM")
        .single();

      if (existing) {
        const { error } = await supabase.from("resources").update({ description: JSON.stringify(settings) }).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("resources").insert({ name: "HOMEPAGE_SETTINGS", category: "SYSTEM", description: JSON.stringify(settings), status: "active" });
        if (error) throw error;
      }
      return res.status(200).json({ status: "ok" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

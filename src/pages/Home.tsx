import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Resource, Category } from '../types';
import ResourceCard from '../components/ResourceCard';
import { Search, Loader2, Sparkles, ArrowRight, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiExtraction, setAiExtraction] = useState<any>(null);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [myGuideIds, setMyGuideIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    document.title = "SuperGuide";
    fetchData();
    const saved = localStorage.getItem('my-guide');
    if (saved) setMyGuideIds(JSON.parse(saved));
    
    // Ensure session ID for analytics
    if (!localStorage.getItem('session_id')) {
      localStorage.setItem('session_id', Math.random().toString(36).substring(2, 15));
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: resData, error: resError } = await supabase
        .from('resources')
        .select('*')
        .neq('status', 'temporarily_closed')
        .neq('status', 'needs_verification')
        .order('name');

      if (resError) throw resError;
      setResources(resData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAISearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsSearching(true);
    try {
      // 1. Extract intent using Gemini directly from frontend
      const apiKey = import.meta.env.VITE_CUSTOM_GEMINI_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key is missing");

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: aiPrompt,
        config: {
          systemInstruction: `Extract structured needs from the user's community resource request.
Return a JSON object with:
- need_types: string[] (housing, shelter, food, treatment, recovery support, employment, transportation, legal, healthcare, mental health, youth services, family services, domestic violence support, financial assistance)
- urgency: string (immediate, this_week, ongoing)
- location: string | null
- preferences: string[]
- barriers: string[]
- eligibility_clues: string[]
- keywords: string[]
- ai_summary: string (A short interpretation of the user's needs)`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              need_types: { type: Type.ARRAY, items: { type: Type.STRING } },
              urgency: { type: Type.STRING },
              location: { type: Type.STRING, nullable: true },
              preferences: { type: Type.ARRAY, items: { type: Type.STRING } },
              barriers: { type: Type.ARRAY, items: { type: Type.STRING } },
              eligibility_clues: { type: Type.ARRAY, items: { type: Type.STRING } },
              keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              ai_summary: { type: Type.STRING }
            },
            required: ["need_types", "urgency", "preferences", "barriers", "eligibility_clues", "keywords", "ai_summary"]
          }
        }
      });

      const extraction = JSON.parse(response.text || "{}");
      setAiExtraction(extraction);

      // 2. Grounded Matching
      const matched = resources.map(r => {
        let score = 0;
        const reasons: string[] = [];
        
        // Category match
        const catMatch = extraction.need_types.some((nt: string) => 
          r.category.toLowerCase().includes(nt.toLowerCase()) || 
          r.subcategory?.toLowerCase().includes(nt.toLowerCase())
        );
        if (catMatch) {
          score += 10;
          reasons.push(`Matches your need for ${extraction.need_types.join(', ')}`);
        }

        // Location match
        if (extraction.location && r.city?.toLowerCase().includes(extraction.location.toLowerCase())) {
          score += 15;
          reasons.push(`Located in ${extraction.location}`);
        }

        // Keyword match
        const searchFields = [r.name, r.provides, r.remarks, r.details].join(' ').toLowerCase();
        const matchedKeywords = extraction.keywords.filter((kw: string) => searchFields.includes(kw.toLowerCase()));
        if (matchedKeywords.length > 0) {
          score += matchedKeywords.length * 5;
          reasons.push(`Matches keywords: ${matchedKeywords.join(', ')}`);
        }

        // Urgency boost
        if (extraction.urgency === 'immediate' && (searchFields.includes('emergency') || searchFields.includes('shelter') || searchFields.includes('urgent'))) {
          score += 10;
          reasons.push('Offers immediate/emergency support');
        }

        return { ...r, matchScore: score, matchReasons: reasons };
      })
      .filter(r => r.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

      setFilteredResources(matched);

      // 3. Log Analytics
      await fetch('/api/search/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_prompt: aiPrompt,
          extracted_needs_json: extraction,
          inferred_location: extraction.location,
          inferred_urgency: extraction.urgency,
          inferred_need_types: extraction.need_types,
          results_count: matched.length,
          matched_resource_ids: matched.map(m => m.id),
          search_success: matched.length > 0,
          session_id: localStorage.getItem('session_id') || 'anon'
        })
      });

    } catch (err) {
      console.error('AI Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleGuide = (id: string) => {
    const newIds = myGuideIds.includes(id)
      ? myGuideIds.filter(i => i !== id)
      : [...myGuideIds, id];
    setMyGuideIds(newIds);
    localStorage.setItem('my-guide', JSON.stringify(newIds));
  };

  const examples = [
    "I need food and housing this week in Saint Paul",
    "I’m in early recovery and need help finding work",
    "I need shelter tonight and transportation help",
    "I need help for myself and my children"
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-zinc-500 font-medium tracking-tight">Loading directory...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-5xl font-black text-zinc-900 mb-6 tracking-tight leading-tight">
            Find help by describing your situation
          </h1>
          <p className="text-xl text-zinc-600 mb-8">
            Tell us what’s going on, what kind of help you need, and where you’re located if possible.
          </p>
        </motion.div>

        <form onSubmit={handleAISearch} className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white rounded-2xl border border-zinc-200 shadow-xl overflow-hidden">
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Example: I'm looking for a sober house in Minneapolis that accepts MAT..."
              className="w-full px-6 py-6 text-lg text-zinc-900 placeholder-zinc-400 outline-none resize-none min-h-[160px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAISearch();
                }
              }}
            />
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSearching || !aiPrompt.trim()}
                className="bg-zinc-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Finding Help...
                  </>
                ) : (
                  <>
                    Find Resources
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {examples.map((ex, i) => (
            <button
              key={i}
              onClick={() => setAiPrompt(ex)}
              className="text-sm px-4 py-2 bg-white border border-zinc-200 rounded-full text-zinc-600 hover:border-emerald-500 hover:text-emerald-600 transition-all"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isSearching ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-emerald-600" />
            </div>
            <p className="mt-6 text-zinc-900 font-bold text-xl">Analyzing your needs...</p>
            <p className="text-zinc-500 mt-2">Searching our database for the best matches.</p>
          </motion.div>
        ) : aiExtraction ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-200">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-zinc-900 mb-2 tracking-tight">Interpretation</h2>
                  <p className="text-emerald-900 text-lg leading-relaxed font-medium">
                    {aiExtraction.ai_summary}
                  </p>
                </div>
              </div>
            </div>

            {filteredResources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredResources.map((resource) => (
                  <ResourceCard
                    key={resource.id}
                    resource={resource}
                    inGuide={myGuideIds.includes(resource.id)}
                    onToggleGuide={toggleGuide}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
                <Info className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-zinc-900 mb-2">No exact matches found</h3>
                <p className="text-zinc-500 max-w-md mx-auto">
                  We found some resources that may help, but your request was broad. You may get better results if you include your city or the kind of help you need most.
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-zinc-300" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

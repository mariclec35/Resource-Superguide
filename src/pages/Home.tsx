import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Resource } from '../types';
import ResourceCard from '../components/ResourceCard';
import { Search, Loader2, Sparkles, ArrowRight, Info, LayoutGrid, MapPin, ChevronDown, Moon, Users, Utensils, Briefcase, Car, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

const PRIMARY_CATEGORIES = [
  "Housing",
  "Sober Housing",
  "Treatment Programs",
  "Meetings & Recovery Support",
  "Food Assistance",
  "Employment",
  "Transportation",
  "Mental Health",
  "Legal Help",
  "Family & Children",
  "Financial Assistance",
  "Community Resources"
];

const SECONDARY_FILTERS = [
  "Immediate help",
  "Open now",
  "Insurance accepted",
  "MAT friendly",
  "Gender-specific",
  "Family-friendly",
  "Reentry/felony-friendly",
  "Youth services",
  "Veteran services"
];

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search State
  const [searchMode, setSearchMode] = useState<'ai' | 'browse'>('ai');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  
  // AI Search State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiExtraction, setAiExtraction] = useState<any>(null);
  
  // Browse State
  const [browseCategory, setBrowseCategory] = useState<string>('');
  const [browseLocation, setBrowseLocation] = useState<string>('');
  const [browseFilters, setBrowseFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');

  const [myGuideIds, setMyGuideIds] = useState<string[]>([]);

  useEffect(() => {
    document.title = "SuperGuide";
    fetchData();
    const saved = localStorage.getItem('my-guide');
    if (saved) setMyGuideIds(JSON.parse(saved));
    
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
    setHasSearched(true);
    try {
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

      const matched = resources.map(r => {
        let score = 0;
        const reasons: string[] = [];
        
        const catMatch = extraction.need_types.some((nt: string) => 
          r.category.toLowerCase().includes(nt.toLowerCase()) || 
          r.subcategory?.toLowerCase().includes(nt.toLowerCase())
        );
        if (catMatch) {
          score += 10;
          reasons.push(`Matches your need for ${extraction.need_types.join(', ')}`);
        }

        if (extraction.location && r.city?.toLowerCase().includes(extraction.location.toLowerCase())) {
          score += 15;
          reasons.push(`Located in ${extraction.location}`);
        }

        const searchFields = [r.name, r.provides, r.remarks, r.details].join(' ').toLowerCase();
        const matchedKeywords = extraction.keywords.filter((kw: string) => searchFields.includes(kw.toLowerCase()));
        if (matchedKeywords.length > 0) {
          score += matchedKeywords.length * 5;
          reasons.push(`Matches keywords: ${matchedKeywords.join(', ')}`);
        }

        if (extraction.urgency === 'immediate' && (searchFields.includes('emergency') || searchFields.includes('shelter') || searchFields.includes('urgent'))) {
          score += 10;
          reasons.push('Offers immediate/emergency support');
        }

        return { ...r, matchScore: score, matchReasons: reasons };
      })
      .filter(r => r.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

      setFilteredResources(matched);

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

  const handleBrowseSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    setHasSearched(true);
    setAiExtraction(null); // Clear AI summary
    
    setTimeout(() => {
      let matched = resources.map(r => ({ ...r, matchScore: 1, matchReasons: [] }));
      
      if (browseCategory) {
        matched = matched.filter(r => 
          r.category.toLowerCase().includes(browseCategory.toLowerCase()) || 
          r.subcategory?.toLowerCase().includes(browseCategory.toLowerCase())
        );
      }
      
      if (browseLocation) {
        matched = matched.filter(r => 
          r.city?.toLowerCase().includes(browseLocation.toLowerCase()) ||
          r.address?.toLowerCase().includes(browseLocation.toLowerCase())
        );
      }
      
      if (browseFilters.length > 0) {
        matched = matched.filter(r => {
          const searchFields = [r.name, r.provides, r.remarks, r.details].join(' ').toLowerCase();
          return browseFilters.every(f => {
            if (f === 'MAT friendly') return searchFields.includes('mat') || searchFields.includes('medication') || searchFields.includes('suboxone') || searchFields.includes('methadone');
            if (f === 'Immediate help') return searchFields.includes('emergency') || searchFields.includes('immediate') || searchFields.includes('urgent') || searchFields.includes('crisis');
            if (f === 'Insurance accepted') return searchFields.includes('insurance') || searchFields.includes('medicaid') || searchFields.includes('medicare');
            if (f === 'Gender-specific') return searchFields.includes('men') || searchFields.includes('women');
            if (f === 'Family-friendly') return searchFields.includes('family') || searchFields.includes('children') || searchFields.includes('kids');
            if (f === 'Reentry/felony-friendly') return searchFields.includes('felony') || searchFields.includes('reentry') || searchFields.includes('justice') || searchFields.includes('background');
            if (f === 'Youth services') return searchFields.includes('youth') || searchFields.includes('teen') || searchFields.includes('adolescent');
            if (f === 'Veteran services') return searchFields.includes('veteran') || searchFields.includes('va');
            return true; // Fallback for 'Open now' or unknown filters
          });
        });
      }
      
      setFilteredResources(matched);
      setIsSearching(false);
    }, 400); // Simulate network delay for smooth UX
  };

  const handleQuickAction = (action: string) => {
    setSearchMode('ai');
    let prompt = '';
    switch (action) {
      case 'Shelter Tonight': prompt = 'I need emergency shelter tonight.'; break;
      case 'Find a Meeting': prompt = 'I want to find a recovery meeting near me.'; break;
      case 'Food This Week': prompt = 'I need help getting food this week.'; break;
      case 'Job Help': prompt = 'I am looking for employment assistance.'; break;
      case 'Transportation Help': prompt = 'I need help with transportation or bus passes.'; break;
      case 'Help for Families': prompt = 'I need support services for my family and children.'; break;
    }
    setAiPrompt(prompt);
    // We don't auto-submit here to let them add location if they want, but we could.
  };

  const toggleFilter = (filter: string) => {
    setBrowseFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const toggleGuide = (id: string) => {
    const newIds = myGuideIds.includes(id)
      ? myGuideIds.filter(i => i !== id)
      : [...myGuideIds, id];
    setMyGuideIds(newIds);
    localStorage.setItem('my-guide', JSON.stringify(newIds));
  };

  const sortedResources = [...filteredResources].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    // Default to relevance (matchScore)
    return ((b as any).matchScore || 0) - ((a as any).matchScore || 0);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-zinc-500 font-medium tracking-tight">Loading directory...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="mb-12 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-black text-zinc-900 mb-4 tracking-tight leading-tight">
            Find the support you need.
          </h1>
          <p className="text-lg md:text-xl text-zinc-600 mb-8">
            Whether you know exactly what you're looking for or just need to describe your situation, we're here to help.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-10"
        >
          <button onClick={() => handleQuickAction('Shelter Tonight')} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-full text-sm font-bold transition-colors">
            <Moon className="w-4 h-4" /> Shelter Tonight
          </button>
          <button onClick={() => handleQuickAction('Find a Meeting')} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-full text-sm font-bold transition-colors">
            <Users className="w-4 h-4" /> Find a Meeting
          </button>
          <button onClick={() => handleQuickAction('Food This Week')} className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-full text-sm font-bold transition-colors">
            <Utensils className="w-4 h-4" /> Food This Week
          </button>
          <button onClick={() => handleQuickAction('Job Help')} className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full text-sm font-bold transition-colors">
            <Briefcase className="w-4 h-4" /> Job Help
          </button>
          <button onClick={() => handleQuickAction('Transportation Help')} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 rounded-full text-sm font-bold transition-colors">
            <Car className="w-4 h-4" /> Transportation
          </button>
          <button onClick={() => handleQuickAction('Help for Families')} className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-full text-sm font-bold transition-colors">
            <Heart className="w-4 h-4" /> Help for Families
          </button>
        </motion.div>

        {/* Search Module */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl shadow-xl border border-zinc-200 overflow-hidden text-left"
        >
          <div className="flex border-b border-zinc-100">
            <button 
              onClick={() => setSearchMode('ai')}
              className={`flex-1 py-4 text-sm md:text-base font-bold flex items-center justify-center gap-2 transition-colors ${searchMode === 'ai' ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/50' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}
            >
              <Sparkles className="w-4 h-4" />
              Describe your situation
            </button>
            <button 
              onClick={() => setSearchMode('browse')}
              className={`flex-1 py-4 text-sm md:text-base font-bold flex items-center justify-center gap-2 transition-colors ${searchMode === 'browse' ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/50' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}
            >
              <LayoutGrid className="w-4 h-4" />
              Browse by Category
            </button>
          </div>
          
          <div className="p-6 md:p-8">
            {searchMode === 'ai' ? (
              <form onSubmit={handleAISearch}>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Example: I need sober housing in Saint Paul, and I'm looking for work..."
                  className="w-full px-5 py-4 text-lg text-zinc-900 placeholder-zinc-400 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none min-h-[120px] transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAISearch();
                    }
                  }}
                />
                <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                  <div className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-zinc-400" /> 
                    AI helps match your natural language to resources.
                  </div>
                  <button
                    type="submit"
                    disabled={isSearching || !aiPrompt.trim()}
                    className="w-full sm:w-auto bg-zinc-900 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        Find Resources
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleBrowseSearch}>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Primary Category</label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
                  {PRIMARY_CATEGORIES.map(c => (
                    <button 
                      key={c}
                      type="button" 
                      onClick={() => setBrowseCategory(browseCategory === c ? '' : c)} 
                      className={`p-3 rounded-xl border text-sm font-bold text-left transition-all ${browseCategory === c ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'}`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Location (Optional)</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        type="text" 
                        value={browseLocation} 
                        onChange={e => setBrowseLocation(e.target.value)} 
                        placeholder="City, neighborhood, or ZIP" 
                        className="w-full pl-10 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-zinc-900 font-medium" 
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Filters (Optional)</label>
                    <button 
                      type="button" 
                      onClick={() => setShowFilters(!showFilters)} 
                      className="w-full px-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between text-zinc-700 font-medium hover:bg-zinc-100 transition-colors"
                    >
                      <span>{browseFilters.length > 0 ? `${browseFilters.length} filter${browseFilters.length > 1 ? 's' : ''} selected` : 'Select filters...'}</span>
                      <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
                
                <AnimatePresence>
                  {showFilters && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mb-6"
                    >
                      <div className="p-5 bg-zinc-50 rounded-xl border border-zinc-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {SECONDARY_FILTERS.map(f => (
                          <label key={f} className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${browseFilters.includes(f) ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-zinc-300 group-hover:border-emerald-500'}`}>
                              {browseFilters.includes(f) && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <span className="text-sm text-zinc-700 font-medium select-none">{f}</span>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="flex justify-end pt-2 border-t border-zinc-100">
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="w-full sm:w-auto bg-zinc-900 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        Search Resources
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>

      {/* Results Section */}
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
            <p className="mt-6 text-zinc-900 font-bold text-xl">Searching directory...</p>
            <p className="text-zinc-500 mt-2">Finding the best matches for you.</p>
          </motion.div>
        ) : hasSearched ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {aiExtraction && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 md:p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-200 shrink-0">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-zinc-900 mb-2 tracking-tight">AI Interpretation</h2>
                    <p className="text-emerald-900 text-base md:text-lg leading-relaxed font-medium">
                      {aiExtraction.ai_summary}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
              <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
                {filteredResources.length} {filteredResources.length === 1 ? 'Resource' : 'Resources'} Found
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Sort by:</span>
                <select 
                  value={sortBy} 
                  onChange={e => setSortBy(e.target.value)} 
                  className="bg-zinc-50 border border-zinc-200 text-zinc-900 text-sm rounded-xl px-4 py-2 font-bold outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="relevance">Relevance</option>
                  <option value="name">Name (A-Z)</option>
                  <option value="recent">Recently Added</option>
                </select>
              </div>
            </div>

            {sortedResources.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedResources.map((resource) => (
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
                  We couldn't find any resources matching all your criteria. Try adjusting your filters or broadening your search.
                </p>
                <button 
                  onClick={() => {
                    setBrowseCategory('');
                    setBrowseLocation('');
                    setBrowseFilters([]);
                    setSearchMode('browse');
                    setFilteredResources(resources);
                  }}
                  className="mt-6 px-6 py-2.5 bg-white border border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50 transition-colors"
                >
                  Clear Filters
                </button>
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
            <h3 className="text-xl font-bold text-zinc-400">Ready to search</h3>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

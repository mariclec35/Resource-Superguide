import React, { useEffect, useState } from 'react';
import { Resource, Category, HomepageSettings, HomepageStats } from '../types';
import ResourceCard from '../components/ResourceCard';
import StatRibbon from '../components/StatRibbon';
import { Search, Loader2, Sparkles, ArrowRight, Info, LayoutGrid, MapPin, Moon, Users, Utensils, Briefcase, Car, Heart, Shield, Home as HomeIcon, Phone, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const iconMap: Record<string, React.ElementType> = {
  Moon, Users, Utensils, Briefcase, Car, Heart, Shield, Home: HomeIcon, Phone, HelpCircle, Search
};

function normalizeResource(resource: Resource): Resource {
  const primaryLocation = resource.locations?.[0];

  return {
    ...resource,
    address: resource.address || primaryLocation?.address || '',
    city: resource.city || primaryLocation?.city || null,
    phone: resource.phone || resource.contact?.phone || null,
    website: resource.website || resource.contact?.website || null,
    provides: resource.provides || resource.search_embeddings_text || null,
  };
}

function getResourceSearchFields(resource: Resource) {
  const aliases = resource.name_aliases || [];
  const pathTags = resource.metadata?.pathway_tags || [];
  const populations = resource.eligibility?.populations || [];
  const childPrograms = resource.relational_graph?.child_programs || [];
  const nextStepReferrals = resource.relational_graph?.next_step_referrals || [];
  const locationBits = (resource.locations || []).flatMap((location) => [
    location.label || '',
    location.address || '',
    location.city || '',
    location.state || '',
    location.zip || '',
  ]);

  return [
    resource.name || '',
    resource.category || '',
    resource.subcategory || '',
    resource.city || '',
    resource.address || '',
    resource.phone || '',
    resource.website || '',
    resource.provides || '',
    resource.remarks || '',
    resource.details || '',
    resource.search_embeddings_text || '',
    resource.metadata?.referral_required || '',
    ...aliases,
    ...pathTags,
    ...populations,
    ...childPrograms,
    ...nextStepReferrals,
    ...locationBits,
  ]
    .join(' ')
    .toLowerCase();
}

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [dbCategories, setDbCategories] = useState<Category[]>([]);
  const [homepageSettings, setHomepageSettings] = useState<HomepageSettings | null>(null);
  const [homepageStats, setHomepageStats] = useState<HomepageStats>(
    window.__INITIAL_HOMEPAGE_STATS__ || {
      resources: 0,
      meetings: 0,
      events: 0,
    }
  );
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
  const [sortBy, setSortBy] = useState('relevance');

  const fetchHomepageStats = async () => {
    try {
      const response = await fetch(`/api/stats/homepage?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch homepage stats');
      }

      const data = await response.json();
      setHomepageStats({
        resources: Number(data.resources) || 0,
        meetings: Number(data.meetings) || 0,
        events: Number(data.events) || 0,
      });
    } catch (err) {
      console.error('Error fetching homepage stats:', err);
    }
  };

  useEffect(() => {
    document.title = "MN Recovery Hub";
    fetchData();
    
    if (!localStorage.getItem('session_id')) {
      localStorage.setItem('session_id', Math.random().toString(36).substring(2, 15));
    }
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchHomepageStats();
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        void fetchHomepageStats();
      }
    };

    const handleFocusRefresh = () => {
      void fetchHomepageStats();
    };

    document.addEventListener('visibilitychange', handleVisibilityRefresh);
    window.addEventListener('focus', handleFocusRefresh);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      window.removeEventListener('focus', handleFocusRefresh);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Resources
      const resourceResponse = await fetch('/api/resources');
      if (!resourceResponse.ok) throw new Error('Failed to fetch resources');
      const resData = await resourceResponse.json();
      setResources((resData || []).map(normalizeResource));

      // 1b. Fetch Homepage Stats
      await fetchHomepageStats();
      
      // 2. Fetch Homepage Settings
      fetch('/api/homepage-settings')
        .then(res => res.json())
        .then(data => setHomepageSettings(data))
        .catch(err => console.error('Error fetching homepage settings:', err));

      // 3. Fetch Categories with fallbacks
      try {
        const categoryResponse = await fetch('/api/categories');
        if (categoryResponse.ok) {
          const initialCats = await categoryResponse.json();
          // Filter in memory if needed or use the data as is
          const activeCats = initialCats.filter(c => c.is_active !== false); // Handle both true and undefined
          
          // Sort in memory to avoid order by failures
          const sorted = activeCats.sort((a, b) => {
            const orderA = a.display_order ?? a.sequence ?? 0;
            const orderB = b.display_order ?? b.sequence ?? 0;
            if (orderA !== orderB) return orderA - orderB;
            return (a.name || '').localeCompare(b.name || '');
          });
          
          setDbCategories(sorted);
        } else {
          console.warn('Initial categories fetch failed, using empty fallback');
          setDbCategories([]);
        }
      } catch (catErr) {
        console.error('Category fetch error:', catErr);
        setDbCategories([]);
      }

    } catch (err) {
      console.error('Error in fetchData:', err);
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
      const response = await fetch('/api/search/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!response.ok) {
        throw new Error('SEARCH_API_FAILED');
      }

      const payload = await response.json();
      const extraction = payload.extraction || {};
      const matched = (payload.results || []).map(normalizeResource);

      setAiExtraction(extraction);

      setFilteredResources(matched);

      try {
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
      } catch (analyticsErr) {
        console.error('Analytics error:', analyticsErr);
      }

    } catch (err: any) {
      console.error('AI Search error:', err);

      const keywords = aiPrompt.toLowerCase().split(/\W+/).filter(w => w.length > 2);
      const matched = resources.map(r => {
        const searchFields = getResourceSearchFields(r);
        
        const matchedKeywords = keywords.filter(kw => searchFields.includes(kw));
        // Give higher weight to name matches
        const aliasText = (r.name_aliases || []).join(' ').toLowerCase();
        const nameMatch = keywords.some(kw => (r.name || '').toLowerCase().includes(kw) || aliasText.includes(kw));
        
        const score = (matchedKeywords.length * 5) + (nameMatch ? 10 : 0);
        
        return { 
          ...r, 
          matchScore: score, 
          matchReasons: matchedKeywords.length > 0 ? [`Matches keywords: ${matchedKeywords.slice(0, 3).join(', ')}`] : [] 
        };
      }).filter(r => r.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore);
      
      setFilteredResources(matched);
      setAiExtraction({
        ai_summary: "We experienced an issue with the ranked search service, but we searched using your keywords instead.",
        need_types: [],
        keywords: keywords,
        is_error: true,
        error_type: 'general'
      });
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
        if (browseCategory === 'Category not assigned') {
          matched = matched.filter(r => !r.category);
        } else {
          matched = matched.filter(r => 
            (r.category || '').toLowerCase().includes(browseCategory.toLowerCase()) || 
            (r.subcategory || '').toLowerCase().includes(browseCategory.toLowerCase()) ||
            (r.metadata?.pathway_tags || []).some(tag => tag.toLowerCase().includes(browseCategory.toLowerCase()))
          );
        }
      }
      
      if (browseLocation) {
        matched = matched.filter(r => 
          (r.city || '').toLowerCase().includes(browseLocation.toLowerCase()) ||
          (r.address || '').toLowerCase().includes(browseLocation.toLowerCase())
        );
      }
      
      setFilteredResources(matched);
      setIsSearching(false);
    }, 400); // Simulate network delay for smooth UX
  };

  const handleQuickAction = (actionName: string, prompt: string) => {
    setSearchMode('ai');
    setAiPrompt(prompt);
    // We don't auto-submit here to let them add location if they want, but we could.
  };

  const sortedResources = [...filteredResources].sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'recent') return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
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
      <StatRibbon stats={homepageStats} />

      {/* Hero Section */}
      <div className="mb-12 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-black text-zinc-900 mb-4 tracking-tight leading-tight">
            {homepageSettings?.primaryHeader || "Find the support you need."}
          </h1>
          <p className="text-lg md:text-xl text-zinc-600 mb-8">
            {homepageSettings?.secondaryHeader || "Whether you know exactly what you're looking for or just need to describe your situation, we're here to help."}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.16 }}
          className="mb-6 max-w-2xl mx-auto"
        >
          <p className="text-sm md:text-base text-zinc-500 leading-7">
            Save meetings, events, and resources to a shared support list while you browse, then print, share, or download it when you&apos;re ready.
          </p>
        </motion.div>

        {/* Quick Actions */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-10"
        >
          {homepageSettings?.quickActions?.map((action, index) => {
            const colors = [
              'bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
              'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
              'bg-orange-50 text-orange-700 hover:bg-orange-100',
              'bg-blue-50 text-blue-700 hover:bg-blue-100',
              'bg-rose-50 text-rose-700 hover:bg-rose-100',
              'bg-purple-50 text-purple-700 hover:bg-purple-100',
            ];
            const colorClass = colors[index % colors.length];
            const IconComponent = iconMap[action.icon] || Search;
            return (
              <button 
                key={index} 
                onClick={() => handleQuickAction(action.name, action.prompt)} 
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-colors ${colorClass}`}
              >
                <IconComponent className="w-4 h-4" /> {action.name}
              </button>
            );
          })}
        </motion.div>
      </div>

      {/* Search Module */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        id="search-module"
        className="bg-white rounded-3xl shadow-xl border border-zinc-200 overflow-hidden text-left mb-12"
      >
        <div className="flex border-b border-zinc-100">
          <button 
            onClick={() => setSearchMode('ai')}
            className={`flex-1 py-4 text-sm md:text-base font-bold flex items-center justify-center gap-2 transition-colors ${searchMode === 'ai' ? 'text-emerald-700 border-b-2 border-emerald-600 bg-emerald-50/50' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'}`}
          >
            <Sparkles className="w-4 h-4" />
            What are you looking for?
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
              <div className="flex flex-col sm:flex-row justify-end items-center mt-6 gap-4">
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
              {dbCategories.length === 0 ? (
                <div className="p-6 bg-zinc-50 border border-zinc-200 rounded-2xl text-center mb-6">
                  <p className="text-zinc-500 font-medium">Categories coming soon</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
                  {dbCategories.map(c => (
                    <button 
                      key={c.id}
                      type="button" 
                      onClick={() => setBrowseCategory(browseCategory === c.name ? '' : c.name)} 
                      className={`p-3 rounded-xl border text-sm font-bold text-left transition-all ${browseCategory === c.name ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm' : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              
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
              </div>
              
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

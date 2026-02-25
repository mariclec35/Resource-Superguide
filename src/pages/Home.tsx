import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Resource, RecoveryStage, TransitAccessibility, Walkability } from '../types';
import ResourceCard from '../components/ResourceCard';
import { Search, Filter, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const CATEGORIES = [
  'Housing', 'Food Shelf', 'Mental Health', 'Chemical Dependency', 
  'Employment', 'Legal', 'Medical', 'Crisis', 'Other'
];

const CITIES = ['Saint Paul', 'Minneapolis'];
const DIRECTIONS = ['North', 'South', 'East', 'West', 'Central', 'Northeast', 'Northwest', 'Southeast', 'Southwest'];

export default function Home() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    category: '',
    city: '',
    direction: '',
    recoveryStage: '' as RecoveryStage | '',
    transit: '' as TransitAccessibility | '',
    walkability: '' as Walkability | '',
    snap: '',
    cost: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [myGuideIds, setMyGuideIds] = useState<string[]>([]);

  useEffect(() => {
    fetchResources();
    const saved = localStorage.getItem('my-guide');
    if (saved) setMyGuideIds(JSON.parse(saved));
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    try {
      // Public view: status != 'temporarily_closed'
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .neq('status', 'temporarily_closed')
        .order('name');

      if (error) throw error;
      setResources(data || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleGuide = (id: string) => {
    const newIds = myGuideIds.includes(id)
      ? myGuideIds.filter(i => i !== id)
      : [...myGuideIds, id];
    setMyGuideIds(newIds);
    localStorage.setItem('my-guide', JSON.stringify(newIds));
  };

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || 
                         r.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !filters.category || r.category === filters.category;
    const matchesCity = !filters.city || r.city_direction.includes(filters.city);
    const matchesDirection = !filters.direction || r.city_direction.includes(filters.direction);
    const matchesStage = !filters.recoveryStage || r.recovery_stage.includes(filters.recoveryStage as RecoveryStage);
    const matchesTransit = !filters.transit || r.transit_accessibility === filters.transit;
    const matchesWalk = !filters.walkability || r.walkability === filters.walkability;
    const matchesSnap = !filters.snap || r.snap_accepted === filters.snap;
    const matchesCost = !filters.cost || r.cost === filters.cost;

    return matchesSearch && matchesCategory && matchesCity && matchesDirection && 
           matchesStage && matchesTransit && matchesWalk && matchesSnap && matchesCost;
  });

  const clearFilters = () => {
    setFilters({
      category: '',
      city: '',
      direction: '',
      recoveryStage: '',
      transit: '',
      walkability: '',
      snap: '',
      cost: '',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-black text-zinc-900 mb-4 tracking-tight">
          Resource Superguide
        </h1>
        <p className="text-zinc-600">
          Find support in Saint Paul and Minneapolis. Filter by transit, cost, and recovery stage.
        </p>
      </div>

      {/* Search and Filter Toggle */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
            showFilters 
              ? 'bg-zinc-900 text-white' 
              : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-300'
          }`}
        >
          <Filter className="w-5 h-5" />
          Filters
          {Object.values(filters).some(v => v !== '') && (
            <span className="ml-1 px-2 py-0.5 bg-emerald-500 text-white text-xs rounded-full">
              {Object.values(filters).filter(v => v !== '').length}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white border border-zinc-200 rounded-2xl p-6 mb-8 shadow-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">City</label>
                <select
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">All Cities</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Direction</label>
                <select
                  value={filters.direction}
                  onChange={(e) => setFilters({ ...filters, direction: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">All Directions</option>
                  {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Recovery Stage</label>
                <select
                  value={filters.recoveryStage}
                  onChange={(e) => setFilters({ ...filters, recoveryStage: e.target.value as RecoveryStage })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">All Stages</option>
                  <option value="crisis">Crisis</option>
                  <option value="stabilizing">Stabilizing</option>
                  <option value="growth">Growth</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Transit</label>
                <select
                  value={filters.transit}
                  onChange={(e) => setFilters({ ...filters, transit: e.target.value as TransitAccessibility })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Any Transit</option>
                  <option value="On Major Bus Line">On Major Bus Line</option>
                  <option value="Near Light Rail (Green Line / Blue Line)">Near Light Rail</option>
                  <option value="Multiple Transit Options">Multiple Options</option>
                  <option value="Limited Transit Access">Limited Access</option>
                  <option value="Car Recommended">Car Recommended</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">SNAP Accepted</label>
                <select
                  value={filters.snap}
                  onChange={(e) => setFilters({ ...filters, snap: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Any</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Cost</label>
                <select
                  value={filters.cost}
                  onChange={(e) => setFilters({ ...filters, cost: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Any Cost</option>
                  <option value="Free">Free</option>
                  <option value="Sliding scale">Sliding Scale</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Fee">Fee</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-zinc-200 text-sm font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Resource Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
          <p className="text-zinc-500 font-medium">Loading resources...</p>
        </div>
      ) : filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <p className="text-zinc-500 text-lg">No resources found matching your criteria.</p>
          <button
            onClick={clearFilters}
            className="mt-4 text-emerald-600 font-bold hover:underline"
          >
            Reset all filters
          </button>
        </div>
      )}
    </div>
  );
}

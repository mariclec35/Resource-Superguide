import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  LayoutDashboard, FileText, AlertCircle, Plus, 
  Settings, LogOut, Loader2, Search, Filter,
  CheckCircle2, XCircle, Clock, MoreVertical,
  Edit2, Trash2, ExternalLink, ShieldAlert, Terminal,
  ChevronDown, ChevronUp, Users, LayoutGrid, Upload, Bot, RefreshCcw,
  BarChart3, Star, BookOpen, TrendingUp, ThumbsUp, ThumbsDown,
  GripVertical, Eye, EyeOff, Activity, Database, Layers, MessageSquare,
  Sparkles, AlertTriangle, ArrowRight
} from 'lucide-react';
import { Resource, Report, ReportStatus, ResourceStatus, Category, ErrorEvent } from '../types';
import { format } from 'date-fns';
import { logger } from '../lib/logger';
import DataImporter from '../components/DataImporter';
import AdminAI from '../components/AdminAI';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "SuperGuide | Operations Console";
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/admin');
    } else {
      setUser(user);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-zinc-900 animate-spin mb-4" />
        <p className="text-zinc-500">Verifying session...</p>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', label: 'Command Center', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'resources', label: 'Resources', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'categories', label: 'Categories', icon: <Layers className="w-4 h-4" /> },
    { id: 'feedback', label: 'Feedback Intelligence', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports & Issues', icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  const systemItems = [
    { id: 'users', label: 'Users & Roles', icon: <Users className="w-4 h-4" /> },
    { id: 'errors', label: 'Site Health', icon: <Activity className="w-4 h-4" /> },
    { id: 'import', label: 'Data Operations', icon: <Database className="w-4 h-4" /> },
    { id: 'ai', label: 'Intelligence', icon: <Bot className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Admin Header */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Operations Console</h1>
                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-400 text-[10px] font-bold rounded uppercase tracking-widest">v1.2</span>
              </div>
              <p className="text-sm text-zinc-500">System administration and resource management.</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-zinc-900">{user?.email}</p>
                <p className="text-xs text-zinc-400">Administrator</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2.5 rounded-xl border border-zinc-200 text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-all"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Admin Nav */}
      <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    activeTab === item.id 
                      ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200' 
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              
              <div className="relative">
                <button
                  onClick={() => setSystemMenuOpen(!systemMenuOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    systemItems.some(i => i.id === activeTab)
                      ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200'
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  System
                  <ChevronDown className={`w-4 h-4 transition-transform ${systemMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {systemMenuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white border border-zinc-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    {systemItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setSystemMenuOpen(false); }}
                        className={`w-full px-4 py-3 text-left text-sm font-bold flex items-center gap-2 hover:bg-zinc-50 transition-colors ${
                          activeTab === item.id ? 'text-zinc-900 bg-zinc-50' : 'text-zinc-500'
                        }`}
                      >
                        {item.icon}
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {activeTab === 'overview' && <Overview />}
        {activeTab === 'resources' && <ResourcesManager />}
        {activeTab === 'categories' && <CategoriesManager />}
        {activeTab === 'feedback' && <FeedbackModeration />}
        {activeTab === 'analytics' && <SearchAnalyticsDashboard />}
        {activeTab === 'reports' && <ReportsQueue />}
        {activeTab === 'users' && <UsersManager />}
        {activeTab === 'errors' && <ErrorLogsManager />}
        {activeTab === 'import' && <DataImporter />}
        {activeTab === 'ai' && <AdminAI />}
      </div>
    </div>
  );
}

// --- Sub-components ---

function Overview() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [
        { count: totalResources },
        { count: totalSearches },
        { count: totalFeedback },
        { count: pendingFeedback },
        { count: totalReports },
        { count: openReports },
        { data: topResources },
        { data: recentActivity }
      ] = await Promise.all([
        supabase.from('resources').select('*', { count: 'exact', head: true }),
        supabase.from('search_analytics').select('*', { count: 'exact', head: true }),
        supabase.from('resource_feedback').select('*', { count: 'exact', head: true }),
        supabase.from('resource_feedback').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reports').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('report_status', 'open'),
        supabase.from('resources').select('name, review_count, average_rating').order('review_count', { ascending: false }).limit(5),
        supabase.from('resources').select('name, updated_at').order('updated_at', { ascending: false }).limit(5)
      ]);

      setStats({
        totalResources,
        totalSearches,
        totalFeedback,
        pendingFeedback,
        totalReports,
        openReports,
        topResources,
        recentActivity
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-zinc-300" /></div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Resources" value={stats?.totalResources || 0} icon={<BookOpen className="w-5 h-5" />} color="zinc" />
        <StatCard title="Search Effectiveness" value={`${Math.round(((stats?.totalSearches || 0) / (stats?.totalSearches || 1)) * 100)}%`} icon={<BarChart3 className="w-5 h-5" />} color="emerald" />
        <StatCard title="Feedback Queue" value={stats?.pendingFeedback || 0} icon={<Star className="w-5 h-5" />} color="amber" />
        <StatCard title="Open Reports" value={stats?.openReports || 0} icon={<AlertCircle className="w-5 h-5" />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Resource Performance
              </h3>
              <button className="text-xs font-bold text-zinc-400 hover:text-zinc-900 uppercase tracking-widest">View All</button>
            </div>
            <div className="space-y-4">
              {stats?.topResources?.map((r: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100 hover:border-zinc-200 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-xs font-black text-zinc-400">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors">{r.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-[10px] font-bold text-zinc-500">{r.average_rating?.toFixed(1) || '0.0'}</span>
                        </div>
                        <span className="text-zinc-300">•</span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{r.review_count || 0} Reviews</span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-900 transition-all" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
                <Clock className="w-5 h-5 text-zinc-400" />
                Recent Admin Activity
              </h3>
            </div>
            <div className="space-y-4">
              {stats?.recentActivity?.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-4 p-4 border-l-2 border-zinc-100 hover:border-emerald-500 transition-all">
                  <div className="w-2 h-2 rounded-full bg-zinc-200" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      Updated <span className="font-bold">"{a.name}"</span>
                    </p>
                    <p className="text-xs text-zinc-400">{format(new Date(a.updated_at), 'MMM d, HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-zinc-900 rounded-3xl p-8 text-white shadow-xl shadow-zinc-200 overflow-hidden relative">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-black mb-2 tracking-tight">Operational Tip</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                You have <span className="text-white font-bold">{stats?.pendingFeedback || 0} feedback items</span> waiting for moderation. Keeping this queue clear improves site trust.
              </p>
              <button className="w-full py-3 bg-white text-zinc-900 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all">
                Moderate Now
              </button>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
            <h3 className="text-lg font-black text-zinc-900 mb-6 tracking-tight">System Health</h3>
            <div className="space-y-4">
              <HealthItem label="Database" status="online" />
              <HealthItem label="Search Engine" status="online" />
              <HealthItem label="Intelligence API" status="online" />
              <HealthItem label="Storage" status="online" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthItem({ label, status }: { label: string, status: 'online' | 'offline' | 'warning' }) {
  return (
    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
      <span className="text-xs font-bold text-zinc-600">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
          status === 'warning' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 
          'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
        }`} />
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{status}</span>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string, value: number | string, icon: React.ReactNode, color: string }) {
  const colors: any = {
    zinc: 'bg-white border-zinc-200 text-zinc-900',
    emerald: 'bg-white border-zinc-200 text-zinc-900',
    amber: 'bg-white border-zinc-200 text-zinc-900',
    indigo: 'bg-white border-zinc-200 text-zinc-900',
    red: 'bg-white border-zinc-200 text-zinc-900',
  };

  const iconColors: any = {
    zinc: 'bg-zinc-100 text-zinc-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    red: 'bg-red-100 text-red-600',
  };

  return (
    <div className={`p-6 rounded-2xl border ${colors[color]} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-xl ${iconColors[color]}`}>
          {icon}
        </div>
      </div>
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-3xl font-black tracking-tight">{value}</p>
    </div>
  );
}

function SearchAnalyticsDashboard() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'effectiveness' | 'engagement' | 'signals' | 'gaps'>('effectiveness');
  const [stats, setStats] = useState({
    zeroResultRate: 0,
    avgResults: 0,
    topTerms: [] as any[],
    topResources: [] as any[],
    signals: [] as any[]
  });

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'effectiveness' || activeSubTab === 'gaps') {
        const { data, error } = await supabase
          .from('search_analytics')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        
        if (!error && data) {
          setLogs(data);
          const zeroResults = data.filter(l => l.results_count === 0).length;
          const avg = data.reduce((acc, curr) => acc + curr.results_count, 0) / data.length;
          
          // Extract top terms
          const terms: Record<string, number> = {};
          data.forEach(l => {
            l.extracted_needs?.need_types?.forEach((n: string) => {
              terms[n] = (terms[n] || 0) + 1;
            });
          });
          const sortedTerms = Object.entries(terms)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

          setStats(prev => ({
            ...prev,
            zeroResultRate: (zeroResults / data.length) * 100,
            avgResults: avg,
            topTerms: sortedTerms
          }));
        }
      } else if (activeSubTab === 'engagement') {
        const { data, error } = await supabase
          .from('resources')
          .select('id, name, category, review_count, average_rating')
          .order('review_count', { ascending: false })
          .limit(10);
        if (!error) setStats(prev => ({ ...prev, topResources: data || [] }));
      } else if (activeSubTab === 'signals') {
        const { data, error } = await supabase
          .from('resource_feedback')
          .select('signals')
          .not('signals', 'is', null);
        
        if (!error && data) {
          const signalCounts: Record<string, number> = {};
          data.forEach(f => {
            if (f.signals) {
              Object.entries(f.signals).forEach(([key, value]) => {
                if (value) signalCounts[key] = (signalCounts[key] || 0) + 1;
              });
            }
          });
          setStats(prev => ({ 
            ...prev, 
            signals: Object.entries(signalCounts).map(([name, count]) => ({ name, count }))
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">Intelligence Analytics</h2>
          <p className="text-sm text-zinc-500">Monitor search performance and resource health.</p>
        </div>
        <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl overflow-x-auto max-w-full">
          {[
            { id: 'effectiveness', label: 'Search Effectiveness', icon: Search },
            { id: 'engagement', label: 'Resource Engagement', icon: BarChart3 },
            { id: 'signals', label: 'Quality Signals', icon: Sparkles },
            { id: 'gaps', label: 'Coverage Gaps', icon: AlertTriangle }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeSubTab === tab.id 
                  ? 'bg-white text-zinc-900 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-zinc-300" /></div>
      ) : (
        <div className="space-y-6">
          {activeSubTab === 'effectiveness' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Zero Result Rate</p>
                  <p className="text-2xl font-black text-red-500">{stats.zeroResultRate.toFixed(1)}%</p>
                  <p className="text-xs text-zinc-400 mt-1">Searches with no matches</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Avg Matches</p>
                  <p className="text-2xl font-black text-zinc-900">{stats.avgResults.toFixed(1)}</p>
                  <p className="text-xs text-zinc-400 mt-1">Resources per search</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Top Search Needs</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {stats.topTerms.map((t, i) => (
                      <span key={i} className="px-2 py-0.5 bg-zinc-100 text-zinc-600 text-[10px] font-bold rounded uppercase">
                        {t.name} ({t.count})
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden overflow-x-auto shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">User Prompt</th>
                      <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">AI Extraction</th>
                      <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Results</th>
                      <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-sm text-zinc-900 line-clamp-2 font-medium">"{log.raw_prompt}"</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {log.extracted_needs?.need_types?.map((n: string, i: number) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider">
                                {n}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-black ${log.results_count > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {log.results_count} matches
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-zinc-400">{format(new Date(log.created_at), 'MMM d, HH:mm')}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeSubTab === 'engagement' && (
            <div className="grid grid-cols-1 gap-4">
              {stats.topResources.map((r, i) => (
                <div key={r.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-sm font-black text-zinc-400">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{r.name}</p>
                      <p className="text-xs text-zinc-500 uppercase tracking-widest font-black">{r.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Avg Rating</p>
                      <div className="flex items-center gap-1 justify-end">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold text-zinc-900">{r.average_rating?.toFixed(1) || '0.0'}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Reviews</p>
                      <p className="text-sm font-bold text-zinc-900">{r.review_count || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSubTab === 'signals' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.signals.map((s, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-zinc-900 capitalize">{s.name.replace(/_/g, ' ')}</p>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-widest">
                      {s.count} mentions
                    </span>
                  </div>
                  <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full" 
                      style={{ width: `${Math.min(100, (s.count / 50) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
              {stats.signals.length === 0 && (
                <div className="col-span-2 py-20 text-center">
                  <p className="text-sm text-zinc-400 italic">No quality signals extracted yet. Signals appear as feedback is moderated.</p>
                </div>
              )}
            </div>
          )}

          {activeSubTab === 'gaps' && (
            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-zinc-100">
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Zero-Result Search Terms</h3>
                <p className="text-xs text-zinc-500 mt-1">These terms were extracted from searches that returned no resources.</p>
              </div>
              <div className="divide-y divide-zinc-100">
                {logs.filter(l => l.results_count === 0).slice(0, 20).map((log, i) => (
                  <div key={i} className="p-4 hover:bg-zinc-50 transition-colors flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-zinc-900">"{log.raw_prompt}"</p>
                      <div className="flex gap-1 mt-1">
                        {log.extracted_needs?.need_types?.map((n: string, j: number) => (
                          <span key={j} className="text-[10px] font-black text-red-500 uppercase tracking-widest">
                            {n}
                          </span>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-400">{format(new Date(log.created_at), 'MMM d, HH:mm')}</p>
                  </div>
                ))}
                {logs.filter(l => l.results_count === 0).length === 0 && (
                  <div className="p-12 text-center">
                    <p className="text-sm text-zinc-400 italic">No coverage gaps identified. All recent searches returned results.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FeedbackModeration() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchFeedbacks();
  }, [activeTab]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('resource_feedback')
      .select('*, resources(name)')
      .eq('status', activeTab)
      .order('created_at', { ascending: false });
    
    if (!error) setFeedbacks(data || []);
    setLoading(false);
  };

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('resource_feedback')
      .update({ status })
      .eq('id', id);
    
    if (!error) fetchFeedbacks();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">Feedback Intelligence</h2>
          <p className="text-sm text-zinc-500">Moderate and extract quality signals from community feedback.</p>
        </div>
        <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl">
          {(['pending', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                activeTab === s 
                  ? 'bg-white text-zinc-900 shadow-sm' 
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-zinc-300" /></div>
        ) : feedbacks.map((f) => (
          <div key={f.id} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center font-black text-zinc-400">
                  {f.guest_name?.[0] || 'A'}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-black text-zinc-900">{f.guest_name || 'Anonymous'}</p>
                    <span className="text-zinc-300">•</span>
                    <p className="text-sm font-bold text-emerald-600">{f.resources?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3 h-3 ${s <= f.rating_overall ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-zinc-400">{format(new Date(f.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {f.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleUpdateStatus(f.id, 'rejected')}
                      className="p-2 rounded-xl border border-zinc-200 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      title="Reject"
                    >
                      <ThumbsDown className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(f.id, 'approved')}
                      className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                      title="Approve"
                    >
                      <ThumbsUp className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="bg-zinc-50 rounded-xl p-4 mb-4">
              <p className="text-zinc-700 leading-relaxed italic text-sm">"{f.review_text}"</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <SignalBadge label="Accessibility" value={f.rating_accessibility} />
              <SignalBadge label="Staff Experience" value={f.rating_staff} />
              <SignalBadge label="Usefulness" value={f.rating_usefulness} />
              <SignalBadge label="Confidence" value="High" />
            </div>
          </div>
        ))}
        {!loading && feedbacks.length === 0 && (
          <div className="text-center py-20 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
            <Star className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium">No feedback submissions in this queue.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SignalBadge({ label, value }: { label: string, value: number | string }) {
  return (
    <div className="bg-white border border-zinc-100 rounded-lg p-2">
      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-center gap-1">
        {typeof value === 'number' ? (
          <>
            <span className="text-xs font-bold text-zinc-900">{value}/5</span>
            <div className="flex-1 h-1 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${(value / 5) * 100}%` }} />
            </div>
          </>
        ) : (
          <span className="text-xs font-bold text-emerald-600">{value}</span>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function ResourcesManager() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [filterStatus, setFilterStatus] = useState<ResourceStatus | 'all'>('all');

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error) setResources(data || []);
    setLoading(false);
  };

  const filtered = resources.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase()) ||
      (r.city && r.city.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (id: string) => {
    setConfirmDelete({ id, type: 'resource' });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    const { error } = await supabase.from('resources').delete().eq('id', confirmDelete.id);
    if (!error) fetchResources();
    setConfirmDelete(null);
  };

  const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'resource' } | null>(null);

  const handleVerify = async (resource: Resource) => {
    const { error } = await supabase
      .from('resources')
      .update({
        status: 'active',
      })
      .eq('id', resource.id);
    
    if (!error) fetchResources();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, category, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none text-sm bg-white font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="needs_verification">Needs Verification</option>
          </select>
        </div>
        <button
          onClick={() => {
            setEditingResource(null);
            setShowForm(true);
          }}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
        >
          <Plus className="w-4 h-4" />
          Add Resource
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden overflow-x-auto shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Resource Info</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Location</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Performance</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((resource) => (
                <tr key={resource.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-bold text-zinc-900">{resource.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{resource.category}</span>
                      {resource.subcategory && (
                        <>
                          <span className="text-zinc-300">/</span>
                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{resource.subcategory}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-zinc-600 font-medium">{resource.city || '—'}</p>
                    <p className="text-xs text-zinc-400 truncate max-w-[150px]">{resource.address || '—'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold text-zinc-900">{resource.average_rating?.toFixed(1) || '0.0'}</span>
                      </div>
                      <span className="text-xs text-zinc-400">({resource.review_count || 0})</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={resource.status} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {resource.status !== 'active' && (
                        <button
                          onClick={() => handleVerify(resource)}
                          className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all"
                          title="Approve / Activate"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingResource(resource);
                          setShowForm(true);
                        }}
                        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(resource.id)}
                        className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}


      {confirmDelete && (
        <ConfirmationModal
          title="Delete Resource"
          message="Are you sure you want to delete this resource? This action cannot be undone."
          onConfirm={executeDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showForm && (
        <ResourceForm
          resource={editingResource}
          onClose={() => setShowForm(false)}
          onSave={() => {
            setShowForm(false);
            fetchResources();
          }}
        />
      )}
    </div>
  );
}

function ReportsQueue() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ReportStatus | 'all'>('all');
  const [activeIssueType, setActiveIssueType] = useState<string | 'all'>('all');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*, resource:resources(*)')
      .order('submitted_at', { ascending: false });
    
    if (!error) setReports(data || []);
    setLoading(false);
  };

  const issueTypes = Array.from(new Set(reports.map(r => r.issue_type)));

  const filtered = reports.filter(r => {
    const statusMatch = filter === 'all' || r.report_status === filter;
    const typeMatch = activeIssueType === 'all' || r.issue_type === activeIssueType;
    return statusMatch && typeMatch;
  });

  const updateReport = async (id: string, updates: Partial<Report>) => {
    const { error } = await supabase
      .from('reports')
      .update(updates)
      .eq('id', id);
    
    if (!error) fetchReports();
  };

  const resolveReport = async (report: Report, notes: string) => {
    await updateReport(report.id, {
      report_status: 'resolved',
      resolution_notes: notes,
      resolved_at: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">Resolution Center</h2>
          <p className="text-sm text-zinc-500">Manage and resolve community-reported data issues.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl">
            {(['all', 'open', 'in_review', 'resolved'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                  filter === s 
                    ? 'bg-white text-zinc-900 shadow-sm' 
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <select
            value={activeIssueType}
            onChange={(e) => setActiveIssueType(e.target.value)}
            className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900"
          >
            <option value="all">All Issue Types</option>
            {issueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((report) => (
            <div key={report.id} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm hover:border-zinc-300 transition-all">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    report.report_status === 'open' ? 'bg-red-50 text-red-600' :
                    report.report_status === 'in_review' ? 'bg-blue-50 text-blue-600' :
                    'bg-emerald-50 text-emerald-600'
                  }`}>
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">{report.issue_type}</p>
                      <ReportStatusBadge status={report.report_status} />
                    </div>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                      Submitted {format(new Date(report.submitted_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {report.report_status !== 'resolved' && (
                    <button
                      onClick={() => {
                        const notes = prompt('Resolution notes:');
                        if (notes !== null) resolveReport(report, notes);
                      }}
                      className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                    >
                      Resolve Issue
                    </button>
                  )}
                  {report.report_status === 'open' && (
                    <button
                      onClick={() => updateReport(report.id, { report_status: 'in_review' })}
                      className="px-4 py-2 bg-zinc-100 text-zinc-900 text-xs font-bold rounded-xl hover:bg-zinc-200 transition-all"
                    >
                      Start Review
                    </button>
                  )}
                  <button
                    onClick={() => updateReport(report.id, { report_status: 'duplicate' })}
                    className="px-4 py-2 border border-zinc-200 text-zinc-500 text-xs font-bold rounded-xl hover:bg-zinc-50 transition-all"
                  >
                    Duplicate
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Report Context</h4>
                    <p className="text-sm text-zinc-700 leading-relaxed bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                      {report.comment || 'No detailed comment provided.'}
                    </p>
                  </div>
                  
                  {report.optional_contact && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Users className="w-3 h-3" />
                      Contact: <span className="font-bold text-zinc-900">{report.optional_contact}</span>
                    </div>
                  )}
                </div>

                <div className="bg-zinc-900 rounded-2xl p-5 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Linked Resource</h4>
                    <a 
                      href={`/resource/${report.resource_id}`} 
                      target="_blank" 
                      className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-widest flex items-center gap-1"
                    >
                      Inspect <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  {report.resource ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-bold text-white">{report.resource.name}</p>
                        <p className="text-xs text-zinc-400 mt-1">{report.resource.address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={report.resource.status} />
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                          ID: {report.resource_id.slice(0, 8)}...
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-500 italic">Resource record missing or deleted.</p>
                  )}
                </div>
              </div>

              {report.resolution_notes && (
                <div className="mt-6 pt-6 border-t border-zinc-100">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Resolution Summary</h4>
                  </div>
                  <p className="text-sm text-zinc-700 font-medium">{report.resolution_notes}</p>
                  {report.resolved_at && (
                    <p className="text-[10px] text-zinc-400 mt-2 font-bold uppercase tracking-widest">
                      Resolved {format(new Date(report.resolved_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-20 text-center bg-white border border-zinc-200 rounded-2xl border-dashed">
              <p className="text-sm text-zinc-400 italic">No reports found matching your criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newParentId, setNewParentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentId, setEditParentId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      // Fetch categories and resource counts
      const [catRes, countRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .order('display_order', { ascending: true })
          .order('name'),
        supabase
          .from('resources')
          .select('category, subcategory')
      ]);
      
      let data = catRes.data;
      let error = catRes.error;
      
      if (error) {
        console.warn('display_order fetch failed, trying sequence:', error.message);
        const seqFallback = await supabase
          .from('categories')
          .select('*')
          .order('sequence', { ascending: true })
          .order('name');
        data = seqFallback.data;
        error = seqFallback.error;
      }

      if (error) {
        const fallback = await supabase
          .from('categories')
          .select('*')
          .order('name');
        data = fallback.data;
        error = fallback.error;
      }
      
      if (error) {
        console.error('Error fetching categories:', error);
      } else if (data) {
        // Calculate counts
        const counts: Record<string, number> = {};
        countRes.data?.forEach((r: any) => {
          counts[r.category] = (counts[r.category] || 0) + 1;
          if (r.subcategory) {
            const key = `${r.category}:${r.subcategory}`;
            counts[key] = (counts[key] || 0) + 1;
          }
        });

        const mappedData = data.map(c => {
          const isPrimary = !c.parent_id;
          let count = 0;
          if (isPrimary) {
            count = counts[c.name] || 0;
          } else {
            const parent = data?.find(p => p.id === c.parent_id);
            if (parent) {
              count = counts[`${parent.name}:${c.name}`] || 0;
            }
          }

          return {
            ...c,
            display_order: c.display_order ?? (c as any).sequence ?? 0,
            is_active: c.is_active ?? true,
            resource_count: count
          };
        });
        setCategories(mappedData);
      }
    } catch (err) {
      console.error('Unexpected error in fetchCategories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    // Calculate next display order
    const sameLevel = categories.filter(c => c.parent_id === (newParentId || null));
    const nextOrder = sameLevel.length > 0 ? Math.max(...sameLevel.map(c => c.display_order)) + 1 : 0;

    const { error } = await supabase
      .from('categories')
      .insert({ 
        name: newName.trim(),
        parent_id: newParentId || null,
        display_order: nextOrder,
        is_active: true
      });
    
    if (!error) {
      setNewName('');
      setNewParentId(null);
      fetchCategories();
    } else {
      // Try sequence if display_order fails
      const { error: seqError } = await supabase
        .from('categories')
        .insert({ 
          name: newName.trim(),
          parent_id: newParentId || null,
          sequence: nextOrder
        });
      
      if (!seqError) {
        setNewName('');
        setNewParentId(null);
        fetchCategories();
      } else {
        alert('Error adding category: ' + (error?.message || seqError?.message));
      }
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    
    const { error } = await supabase
      .from('categories')
      .update({ 
        name: editName.trim(),
        parent_id: editParentId || null
      })
      .eq('id', id);
    
    if (!error) {
      setEditingId(null);
      fetchCategories();
    } else {
      alert('Error updating category: ' + error.message);
    }
  };

  const toggleActive = async (cat: Category) => {
    const { error } = await supabase
      .from('categories')
      .update({ is_active: !cat.is_active })
      .eq('id', cat.id);
    
    if (!error) {
      fetchCategories();
    } else {
      alert('Error toggling status: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure? This will permanently remove the category.')) {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (!error) fetchCategories();
      else alert('Error deleting category: ' + error.message);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeCat = categories.find(c => c.id === activeId);
    const overCat = categories.find(c => c.id === overId);

    if (!activeCat || !overCat || activeCat.parent_id !== overCat.parent_id) return;

    const sameLevel = categories.filter(c => c.parent_id === activeCat.parent_id);
    const oldIndex = sameLevel.findIndex(c => c.id === activeId);
    const newIndex = sameLevel.findIndex(c => c.id === overId);

    const newOrder = arrayMove(sameLevel, oldIndex, newIndex);
    
    // Optimistic update
    const updatedCategories = categories.map(c => {
      const found = newOrder.find((no: Category) => no.id === c.id);
      if (found) {
        return { ...c, display_order: newOrder.indexOf(found) };
      }
      return c;
    });
    setCategories(updatedCategories);

    // Persist to DB
    try {
      const updates = newOrder.map((cat: Category, index: number) => ({
        id: cat.id,
        display_order: index,
        name: cat.name, 
        parent_id: cat.parent_id
      }));

      for (const update of updates) {
        await supabase
          .from('categories')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }
    } catch (err) {
      console.error('Error persisting drag order:', err);
      fetchCategories(); // Revert on error
    }
  };

  const primaryCategories = categories.filter(c => !c.parent_id).sort((a, b) => a.display_order - b.display_order);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <div className="xl:col-span-2 space-y-8">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Category Management</h2>
          <p className="text-sm text-zinc-500">Organize resources into a simple two-level hierarchy.</p>
        </div>

        {/* Add Category Form */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm">
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Category Name</label>
              <input
                type="text"
                placeholder="e.g. Technology"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none text-sm font-medium"
              />
            </div>
            <div className="w-64">
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Parent (Optional)</label>
              <select
                value={newParentId || ''}
                onChange={(e) => setNewParentId(e.target.value || null)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none text-sm bg-white font-medium"
              >
                <option value="">Primary Category</option>
                {primaryCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={!newName.trim()}
              className="px-8 py-2.5 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </form>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-zinc-200" />
          </div>
        ) : (
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              <SortableContext 
                items={primaryCategories.map(c => c.id)}
                strategy={verticalListSortingStrategy}
              >
                {primaryCategories.map(cat => (
                  <SortableCategoryItem 
                    key={cat.id} 
                    category={cat} 
                    allCategories={categories}
                    onEdit={(id, name, parentId) => {
                      setEditingId(id);
                      setEditName(name);
                      setEditParentId(parentId);
                    }}
                    onDelete={handleDelete}
                    onToggleActive={toggleActive}
                    isEditing={editingId === cat.id}
                    editName={editName}
                    setEditName={setEditName}
                    editParentId={editParentId}
                    setEditParentId={setEditParentId}
                    onSave={() => handleUpdate(cat.id)}
                    onCancel={() => setEditingId(null)}
                    onDragEnd={handleDragEnd}
                  />
                ))}
              </SortableContext>
            </div>
          </DndContext>
        )}
      </div>

      {/* Preview Panel */}
      <div className="space-y-6">
        <div className="sticky top-24">
          <div className="bg-zinc-900 rounded-3xl p-6 text-white shadow-xl shadow-zinc-200">
            <div className="flex items-center gap-2 mb-6">
              <Eye className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Display Preview</h3>
            </div>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {primaryCategories.filter(c => c.is_active).map(cat => (
                <div key={cat.id} className="space-y-2">
                  <div className="flex items-center justify-between group">
                    <p className="text-sm font-bold text-zinc-100">{cat.name}</p>
                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{cat.resource_count}</span>
                  </div>
                  <div className="pl-4 space-y-1 border-l border-zinc-800">
                    {categories
                      .filter(c => c.parent_id === cat.id && c.is_active)
                      .sort((a, b) => a.display_order - b.display_order)
                      .map(sub => (
                        <div key={sub.id} className="flex items-center justify-between">
                          <p className="text-xs text-zinc-400">{sub.name}</p>
                          <span className="text-[9px] font-bold text-zinc-700">{sub.resource_count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
              {primaryCategories.filter(c => c.is_active).length === 0 && (
                <p className="text-xs text-zinc-500 italic text-center py-8">No active categories to preview.</p>
              )}
            </div>
          </div>

          <div className="mt-6 bg-white border border-zinc-200 rounded-2xl p-6">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Admin Tip</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Drag categories to reorder them. This order is exactly how they will appear in the main directory search filters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableCategoryItem({ 
  category, 
  allCategories, 
  onEdit, 
  onDelete, 
  onToggleActive,
  isEditing,
  editName,
  setEditName,
  editParentId,
  setEditParentId,
  onSave,
  onCancel,
  onDragEnd
}: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 0,
    opacity: isDragging ? 0.5 : 1
  };

  const subcategories = allCategories
    .filter((c: any) => c.parent_id === category.id)
    .sort((a: any, b: any) => a.display_order - b.display_order);

  return (
    <div ref={setNodeRef} style={style} className="space-y-2">
      <div className={`
        group flex items-center gap-4 p-4 rounded-2xl border transition-all bg-white
        ${isEditing ? 'border-zinc-900 shadow-lg ring-1 ring-zinc-900' : 'border-zinc-200 hover:border-zinc-300 shadow-sm'}
        ${!category.is_active ? 'opacity-60 grayscale' : ''}
      `}>
        <button 
          {...attributes} 
          {...listeners}
          className="p-1 text-zinc-300 hover:text-zinc-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 text-sm font-bold"
                autoFocus
              />
              <select
                value={editParentId || ''}
                onChange={(e) => setEditParentId(e.target.value || null)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 text-xs bg-white"
              >
                <option value="">Primary</option>
                {allCategories.filter((c: any) => !c.parent_id && c.id !== category.id).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <h4 className="text-base font-bold text-zinc-900 truncate">{category.name}</h4>
              <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] font-black uppercase tracking-widest rounded">
                {category.resource_count} resources
              </span>
              {!category.is_active && (
                <span className="px-2 py-0.5 bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest rounded">Hidden</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isEditing ? (
            <>
              <button onClick={onSave} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><CheckCircle2 className="w-5 h-5" /></button>
              <button onClick={onCancel} className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-lg transition-colors"><XCircle className="w-5 h-5" /></button>
            </>
          ) : (
            <>
              <button 
                onClick={() => onToggleActive(category)} 
                className={`p-2 rounded-lg transition-colors ${category.is_active ? 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50' : 'text-emerald-600 bg-emerald-50'}`}
                title={category.is_active ? 'Hide Category' : 'Show Category'}
              >
                {category.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button 
                onClick={() => onEdit(category.id, category.name, category.parent_id)} 
                className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDelete(category.id)} 
                className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Subcategories */}
      <div className="ml-12 space-y-2">
        <DndContext 
          sensors={useSensors(useSensor(PointerSensor))}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext 
            items={subcategories.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {subcategories.map(sub => (
              <SortableSubcategoryItem 
                key={sub.id} 
                category={sub} 
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleActive={onToggleActive}
                isEditing={isEditing && editParentId === category.id} // This is a bit simplified, usually you'd track editingId
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function SortableSubcategoryItem({ category, onEdit, onDelete, onToggleActive }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`
        group flex items-center gap-3 p-3 rounded-xl border bg-zinc-50/50 transition-all
        ${!category.is_active ? 'opacity-60 grayscale' : 'border-zinc-100 hover:border-zinc-200 hover:bg-white hover:shadow-sm'}
      `}
    >
      <button 
        {...attributes} 
        {...listeners}
        className="p-1 text-zinc-300 hover:text-zinc-400 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      
      <div className="flex-1 min-w-0">
        <h5 className="text-sm font-medium text-zinc-600 truncate">{category.name}</h5>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onToggleActive(category)} className="p-1.5 text-zinc-400 hover:text-emerald-600 rounded-md transition-colors">
          {category.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => onEdit(category.id, category.name, category.parent_id)} className="p-1.5 text-zinc-400 hover:text-zinc-900 rounded-md transition-colors">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(category.id)} className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ResourceStatus }) {
  const configs = {
    active: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Active' },
    needs_verification: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Needs Verification' },
    temporarily_closed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Closed' }
  };
  const config = configs[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const configs = {
    open: { bg: 'bg-red-100', text: 'text-red-800', label: 'Open' },
    in_review: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Review' },
    resolved: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Resolved' },
    duplicate: { bg: 'bg-zinc-100', text: 'text-zinc-800', label: 'Duplicate' }
  };
  const config = configs[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}

function ResourceForm({ resource, onClose, onSave }: { resource: Resource | null, onClose: () => void, onSave: () => void }) {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      let { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sequence', { ascending: true })
        .order('name');
      
      // Fallback if any error occurs
      if (error) {
        const fallback = await supabase
          .from('categories')
          .select('*')
          .order('name');
        data = fallback.data;
      }

      if (data) {
        if (data.length === 0) {
          setCategories([]);
        } else {
          const roots = data.filter(c => !c.parent_id);
          const hierarchical: Category[] = [];
          roots.forEach(root => {
            hierarchical.push(root);
            const children = data.filter(c => c.parent_id === root.id);
            hierarchical.push(...children);
          });
          setCategories(hierarchical.length > 0 ? hierarchical : data);
        }
      }
    } catch (err) {
      console.error('Error in ResourceForm fetchCategories:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      subcategory: (formData.get('subcategory') as string) || null,
      address: formData.get('address') as string,
      city: (formData.get('city') as string) || null,
      phone: (formData.get('phone') as string) || null,
      website: (formData.get('website') as string) || null,
      provides: (formData.get('provides') as string) || null,
      remarks: (formData.get('remarks') as string) || null,
      details: (formData.get('details') as string) || null,
      hours: (formData.get('hours') as string) || null,
      status: (formData.get('status') as string) || 'active',
    };

    console.log('Attempting to save resource:', data);

    try {
      if (resource) {
        const { error } = await supabase.from('resources').update(data).eq('id', resource.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('resources').insert(data);
        if (error) throw error;
      }
      onSave();
    } catch (err: any) {
      console.error('Error saving resource:', err);
      alert('Error saving resource: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
            {resource ? 'Edit Resource' : 'Add New Resource'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
            <XCircle className="w-6 h-6 text-zinc-400" />
          </button>
        </div>

        <form id="resource-form" onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">Basic Info</h3>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Resource Name</label>
                <input name="name" defaultValue={resource?.name} required className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Category</label>
                <select name="category" defaultValue={resource?.category} required className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all bg-white">
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.parent_id ? `— ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Subcategory</label>
                <input name="subcategory" defaultValue={resource?.subcategory || ''} className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Status</label>
                <select name="status" defaultValue={resource?.status} className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all bg-white">
                  <option value="active">Active</option>
                  <option value="needs_verification">Needs Verification</option>
                  <option value="temporarily_closed">Temporarily Closed</option>
                </select>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">Contact & Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">Address</label>
                  <input name="address" defaultValue={resource?.address} className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">City</label>
                  <input name="city" defaultValue={resource?.city || ''} className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">Phone</label>
                  <input name="phone" defaultValue={resource?.phone || ''} className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5">Website</label>
                  <input name="website" defaultValue={resource?.website || ''} className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Hours</label>
                <textarea name="hours" defaultValue={resource?.hours || ''} rows={2} className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">What they provide</label>
                <textarea name="provides" defaultValue={resource?.provides || ''} rows={3} className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Important Remarks</label>
                <textarea name="remarks" defaultValue={resource?.remarks || ''} rows={2} className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5">Additional Details</label>
                <textarea name="details" defaultValue={resource?.details || ''} rows={2} className="w-full p-3 rounded-xl border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900 transition-all resize-none" />
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-zinc-100 flex justify-end gap-3 bg-zinc-50">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-zinc-500 hover:bg-white transition-all">Cancel</button>
          <button
            type="submit"
            form="resource-form"
            disabled={loading}
            className="px-8 py-2.5 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {resource ? 'Update Resource' : 'Create Resource'}
          </button>
        </div>
      </div>
    </div>
  );
}

function UsersManager() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingUser, setAddingUser] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<{ id: string, email: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        let errorMessage = 'Failed to fetch users';
        try {
          const err = await response.json();
          errorMessage = err.error || errorMessage;
        } catch (e) {
          // Not JSON
        }
        throw new Error(errorMessage);
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword }),
      });
      if (!response.ok) {
        let errorMessage = 'Failed to add user';
        try {
          const err = await response.json();
          errorMessage = err.error || errorMessage;
          if (err.details) {
            errorMessage += ` (${err.details})`;
          }
        } catch (e) {
          // Not JSON
        }
        throw new Error(errorMessage);
      }
      setNewEmail('');
      setNewPassword('');
      setAddingUser(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    setConfirmDelete({ id, email });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      const response = await fetch(`/api/admin/users/${confirmDelete.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        let errorMessage = 'Failed to delete user';
        try {
          const err = await response.json();
          errorMessage = err.error || errorMessage;
        } catch (e) {
          // Not JSON
        }
        throw new Error(errorMessage);
      }
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleResetPassword = async (id: string, email: string) => {
    if (!confirm(`Send password reset link to ${email}?`)) return;

    try {
      const response = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
      });
      if (!response.ok) {
        let errorMessage = 'Failed to send reset link';
        try {
          const err = await response.json();
          errorMessage = err.error || errorMessage;
        } catch (e) {
          // Not JSON
        }
        throw new Error(errorMessage);
      }
      alert('Password reset link generated. Check server logs or email if configured.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">Access Control</h2>
          <p className="text-sm text-zinc-500">Manage administrative accounts and system permissions.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setAddingUser(!addingUser)}
            className="px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-all flex items-center gap-2 shadow-lg shadow-zinc-200"
          >
            <Plus className="w-4 h-4" />
            Provision Admin
          </button>
          <button 
            onClick={fetchUsers}
            className="p-2 hover:bg-zinc-100 rounded-xl transition-all border border-zinc-200"
            title="Refresh Users"
          >
            <RefreshCcw className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {addingUser && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">Provision New Account</h3>
            <button onClick={() => setAddingUser(false)} className="text-zinc-400 hover:text-zinc-600">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                type="email" 
                required 
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Temporary Password</label>
              <input 
                type="password" 
                required 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Min 6 characters"
              />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="flex-1 py-2.5 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-all">
                Create Account
              </button>
              <button type="button" onClick={() => setAddingUser(false)} className="px-4 py-2.5 bg-zinc-100 text-zinc-500 text-xs font-bold rounded-xl hover:bg-zinc-200 transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Administrator</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Last Activity</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-200 mx-auto" />
                  </td>
                </tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 font-black text-xs">
                        {u.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900">{u.email}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">ID: {u.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-black rounded uppercase tracking-widest">
                      Super Admin
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-zinc-500 font-medium">
                      {u.last_sign_in_at ? format(new Date(u.last_sign_in_at), 'MMM d, HH:mm') : 'Never'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleResetPassword(u.id, u.email)}
                        className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-lg border border-transparent hover:border-zinc-200 transition-all"
                        title="Reset Password"
                      >
                        <RefreshCcw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all"
                        title="Revoke Access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDelete && (
        <ConfirmationModal
          title="Revoke Access?"
          message={`You are about to permanently revoke administrative access for ${confirmDelete.email}. This action cannot be undone.`}
          onConfirm={executeDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function ConfirmationModal({ 
  title, 
  message, 
  onConfirm, 
  onCancel 
}: { 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void 
}) {
  return (
    <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-black text-zinc-900 tracking-tight mb-2">{title}</h3>
          <p className="text-zinc-500 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="p-6 bg-zinc-50 flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 px-6 py-3 bg-white border border-zinc-200 text-zinc-600 font-bold rounded-xl hover:bg-zinc-100 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function ErrorLogsManager() {
  const [logs, setLogs] = useState<ErrorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    severity: string;
    source: string;
    resolved: string;
  }>({
    severity: 'all',
    source: 'all',
    resolved: 'all',
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [filter]);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from('error_events')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter.severity !== 'all') query = query.eq('severity', filter.severity);
    if (filter.source !== 'all') query = query.eq('source', filter.source);
    if (filter.resolved !== 'all') query = query.eq('resolved', filter.resolved === 'true');

    const { data, error } = await query.limit(100);
    
    if (!error) setLogs(data || []);
    setLoading(false);
  };

  const toggleResolve = async (log: ErrorEvent) => {
    const { error } = await supabase
      .from('error_events')
      .update({ 
        resolved: !log.resolved,
        resolved_at: !log.resolved ? new Date().toISOString() : null,
      })
      .eq('id', log.id);
    
    if (!error) fetchLogs();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-50 text-red-600 border-red-100';
      case 'error': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">Site Health Monitor</h2>
          <p className="text-sm text-zinc-500">Real-time system diagnostics and error tracking.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-zinc-200">
            <select 
              value={filter.severity}
              onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
              className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg outline-none hover:bg-zinc-50 transition-colors"
            >
              <option value="all">Severities</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
              <option value="warning">Warning</option>
            </select>
            <div className="w-px h-4 bg-zinc-200" />
            <select 
              value={filter.source}
              onChange={(e) => setFilter({ ...filter, source: e.target.value })}
              className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg outline-none hover:bg-zinc-50 transition-colors"
            >
              <option value="all">Sources</option>
              <option value="client">Client</option>
              <option value="api">API</option>
            </select>
            <div className="w-px h-4 bg-zinc-200" />
            <select 
              value={filter.resolved}
              onChange={(e) => setFilter({ ...filter, resolved: e.target.value })}
              className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg outline-none hover:bg-zinc-50 transition-colors"
            >
              <option value="all">Status</option>
              <option value="false">Unresolved</option>
              <option value="true">Resolved</option>
            </select>
          </div>
          <button 
            onClick={fetchLogs}
            className="p-2.5 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-all"
            title="Refresh Logs"
          >
            <RefreshCcw className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div 
              key={log.id} 
              className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                expandedId === log.id ? 'border-zinc-900 shadow-xl' : 'border-zinc-200 hover:border-zinc-300 shadow-sm'
              } ${log.resolved ? 'opacity-60' : ''}`}
            >
              <div 
                className="p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
              >
                <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest border ${getSeverityColor(log.severity)}`}>
                  {log.severity}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-900 truncate">{log.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{log.source}</span>
                    <span className="text-[10px] text-zinc-300">•</span>
                    <span className="text-[10px] font-medium text-zinc-500">
                      {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                    </span>
                    {log.route && (
                      <>
                        <span className="text-[10px] text-zinc-300">•</span>
                        <span className="text-[10px] font-medium text-zinc-500 truncate max-w-[200px]">{log.route}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleResolve(log);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      log.resolved ? 'text-emerald-600 bg-emerald-50' : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                    title={log.resolved ? "Mark Unresolved" : "Mark Resolved"}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${expandedId === log.id ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {expandedId === log.id && (
                <div className="px-4 pb-4 border-t border-zinc-50 bg-zinc-50/50 animate-in slide-in-from-top-2 duration-200">
                  <div className="py-4 space-y-4">
                    {log.stack && (
                      <div>
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Stack Trace</h4>
                        <pre className="p-4 bg-zinc-900 text-zinc-300 text-[11px] font-mono rounded-xl overflow-x-auto leading-relaxed max-h-[300px]">
                          {log.stack}
                        </pre>
                      </div>
                    )}
                    
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Metadata</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {Object.entries(log.metadata).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between p-2 bg-white border border-zinc-100 rounded-lg">
                              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">{key}</span>
                              <span className="text-xs font-medium text-zinc-900 truncate ml-4">
                                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
                      <div className="flex items-center gap-4">
                        {log.user_id && (
                          <div className="text-[10px] text-zinc-500">
                            User ID: <span className="font-bold text-zinc-900">{log.user_id}</span>
                          </div>
                        )}
                        {log.session_id && (
                          <div className="text-[10px] text-zinc-500">
                            Session: <span className="font-bold text-zinc-900">{log.session_id}</span>
                          </div>
                        )}
                      </div>
                      {log.resolved_at && (
                        <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                          Resolved {format(new Date(log.resolved_at), 'MMM d, yyyy HH:mm')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <div className="py-20 text-center bg-white border border-zinc-200 rounded-2xl border-dashed">
              <p className="text-sm text-zinc-400 italic">No system events logged matching your filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

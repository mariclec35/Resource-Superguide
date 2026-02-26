import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, FileText, AlertCircle, Plus, 
  Settings, LogOut, Loader2, Search, Filter,
  CheckCircle2, XCircle, Clock, MoreVertical,
  Edit2, Trash2, ExternalLink, ShieldAlert, Terminal,
  ChevronDown, ChevronUp, Users
} from 'lucide-react';
import { Resource, Report, ReportStatus, ResourceStatus, Category, ErrorEvent } from '../types';
import { format } from 'date-fns';
import { logger } from '../lib/logger';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'resources' | 'reports' | 'categories' | 'errors' | 'users'>('categories');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-zinc-900 tracking-tight">Admin Dashboard</h1>
            <span className="px-2 py-0.5 bg-zinc-100 text-zinc-400 text-[10px] font-bold rounded uppercase tracking-widest">v1.2</span>
          </div>
          <p className="text-zinc-500">Manage resources and triage community reports.</p>
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

      <div className="flex border-b border-zinc-200 mb-8">
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'categories' 
              ? 'border-zinc-900 text-zinc-900' 
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Categories Manager
          </div>
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'resources' 
              ? 'border-zinc-900 text-zinc-900' 
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Resources Manager
          </div>
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'reports' 
              ? 'border-zinc-900 text-zinc-900' 
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Reports Queue
          </div>
        </button>
        <button
          onClick={() => setActiveTab('errors')}
          className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'errors' 
              ? 'border-zinc-900 text-zinc-900' 
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Error Logs
          </div>
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${
            activeTab === 'users' 
              ? 'border-zinc-900 text-zinc-900' 
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Admin Users
          </div>
        </button>
      </div>

      {activeTab === 'resources' && <ResourcesManager />}
      {activeTab === 'reports' && <ReportsQueue />}
      {activeTab === 'categories' && <CategoriesManager />}
      {activeTab === 'errors' && <ErrorLogsManager />}
      {activeTab === 'users' && <UsersManager />}
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

  const filtered = resources.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this resource?')) {
      const { error } = await supabase.from('resources').delete().eq('id', id);
      if (!error) fetchResources();
    }
  };

  const handleVerify = async (resource: Resource, notes: string, resetCount: boolean) => {
    const { error } = await supabase
      .from('resources')
      .update({
        status: 'active',
        last_verified_date: new Date().toISOString().split('T')[0],
        verification_notes: notes,
        open_report_count: resetCount ? 0 : resource.open_report_count
      })
      .eq('id', resource.id);
    
    if (!error) fetchResources();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none text-sm"
          />
        </div>
        <button
          onClick={() => {
            setEditingResource(null);
            setShowForm(true);
          }}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all"
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
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Name & Category</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Location</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Reports</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Last Verified</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((resource) => (
                <tr key={resource.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-zinc-900">{resource.name}</p>
                    <p className="text-xs text-zinc-500">{resource.category}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-zinc-600">{resource.city_direction}</p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={resource.status} />
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-bold ${resource.open_report_count > 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                      {resource.open_report_count}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-zinc-600">
                      {resource.last_verified_date ? format(new Date(resource.last_verified_date), 'MMM d, yyyy') : 'Never'}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          const notes = prompt('Verification notes:');
                          if (notes !== null) {
                            const reset = confirm('Reset open report count to 0?');
                            handleVerify(resource, notes, reset);
                          }
                        }}
                        className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all"
                        title="Mark Verified"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
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

  const filtered = filter === 'all' ? reports : reports.filter(r => r.report_status === filter);

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
      <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl w-fit">
        {(['all', 'open', 'in_review', 'resolved', 'duplicate'] as const).map((s) => (
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

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((report) => (
            <div key={report.id} className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <ReportStatusBadge status={report.report_status} />
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                    {format(new Date(report.submitted_at), 'MMM d, yyyy HH:mm')}
                  </span>
                </div>
                <div className="flex gap-2">
                  {report.report_status !== 'resolved' && (
                    <button
                      onClick={() => {
                        const notes = prompt('Resolution notes:');
                        if (notes !== null) resolveReport(report, notes);
                      }}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-100 transition-all"
                    >
                      Resolve
                    </button>
                  )}
                  {report.report_status === 'open' && (
                    <button
                      onClick={() => updateReport(report.id, { report_status: 'in_review' })}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-all"
                    >
                      In Review
                    </button>
                  )}
                  <button
                    onClick={() => updateReport(report.id, { report_status: 'duplicate' })}
                    className="px-3 py-1.5 bg-zinc-50 text-zinc-600 text-xs font-bold rounded-lg hover:bg-zinc-100 transition-all"
                  >
                    Mark Duplicate
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Issue Detail</h4>
                  <p className="text-sm font-bold text-zinc-900 mb-1">{report.issue_type}</p>
                  <p className="text-sm text-zinc-600 mb-4">{report.comment || 'No comment provided.'}</p>
                  
                  {report.optional_contact && (
                    <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Contact Info</p>
                      <p className="text-sm text-zinc-700">{report.optional_contact}</p>
                    </div>
                  )}
                </div>

                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                    Linked Resource
                    <a href={`/resource/${report.resource_id}`} target="_blank" className="text-emerald-600 hover:underline flex items-center gap-1">
                      View <ExternalLink className="w-3 h-3" />
                    </a>
                  </h4>
                  {report.resource ? (
                    <>
                      <p className="text-sm font-bold text-zinc-900">{report.resource.name}</p>
                      <p className="text-xs text-zinc-500 mb-2">{report.resource.address}</p>
                      <StatusBadge status={report.resource.status} />
                    </>
                  ) : (
                    <p className="text-sm text-zinc-400 italic">Resource not found</p>
                  )}
                </div>
              </div>

              {report.resolution_notes && (
                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Resolution Notes</p>
                  <p className="text-sm text-zinc-700">{report.resolution_notes}</p>
                  {report.resolved_at && (
                    <p className="text-[10px] text-zinc-400 mt-1">Resolved at: {format(new Date(report.resolved_at), 'MMM d, yyyy HH:mm')}</p>
                  )}
                </div>
              )}
            </div>
          ))}
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

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    
    if (!error) setCategories(data || []);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    const { error } = await supabase
      .from('categories')
      .insert({ 
        name: newName.trim(),
        parent_id: newParentId || null
      });
    
    if (!error) {
      setNewName('');
      setNewParentId(null);
      fetchCategories();
    } else {
      alert('Error adding category: ' + error.message);
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

  const getParentName = (parentId: string | null | undefined) => {
    if (!parentId) return null;
    return categories.find(c => c.id === parentId)?.name;
  };

  const renderCategoryOptions = (excludeId?: string) => {
    return categories
      .filter(c => c.id !== excludeId && !c.parent_id) // Only top-level categories as parents for now to avoid deep nesting complexity
      .map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure? This will not remove the category from existing resources, but it will disappear from filters.')) {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (!error) fetchCategories();
      else alert('Error deleting category: ' + error.message);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="New category name..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none text-sm"
        />
        <select
          value={newParentId || ''}
          onChange={(e) => setNewParentId(e.target.value || null)}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 focus:ring-2 focus:ring-zinc-900 outline-none text-sm bg-white"
        >
          <option value="">No Parent (Top Level)</option>
          {renderCategoryOptions()}
        </select>
        <button
          type="submit"
          className="px-6 py-2.5 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Category Name</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Parent</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {categories.map((cat) => (
                <tr key={cat.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    {editingId === cat.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 rounded border border-zinc-200 outline-none focus:ring-1 focus:ring-zinc-900 text-sm"
                        autoFocus
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        {cat.parent_id && <div className="w-4 h-px bg-zinc-200" />}
                        <span className={`text-sm font-bold ${cat.parent_id ? 'text-zinc-600' : 'text-zinc-900'}`}>
                          {cat.name}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingId === cat.id ? (
                      <select
                        value={editParentId || ''}
                        onChange={(e) => setEditParentId(e.target.value || null)}
                        className="w-full px-2 py-1 rounded border border-zinc-200 outline-none focus:ring-1 focus:ring-zinc-900 text-sm bg-white"
                      >
                        <option value="">No Parent</option>
                        {renderCategoryOptions(cat.id)}
                      </select>
                    ) : (
                      <span className="text-xs text-zinc-400 font-medium">
                        {getParentName(cat.parent_id) || '—'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === cat.id ? (
                        <>
                          <button
                            onClick={() => handleUpdate(cat.id)}
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(cat.id);
                              setEditName(cat.name);
                              setEditParentId(cat.parent_id || null);
                            }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
    const { data } = await supabase.from('categories').select('*').order('name');
    if (data) {
      // Sort hierarchically: Parent followed by its children
      const roots = data.filter(c => !c.parent_id);
      const hierarchical: Category[] = [];
      roots.forEach(root => {
        hierarchical.push(root);
        const children = data.filter(c => c.parent_id === root.id);
        hierarchical.push(...children);
      });
      setCategories(hierarchical);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const data = {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      city_direction: formData.get('city_direction') as string,
      recovery_stage: formData.getAll('recovery_stage') as string[],
      transit_accessibility: formData.get('transit_accessibility') as string,
      walkability: formData.get('walkability') as string,
      access_indicators: formData.getAll('access_indicators') as string[],
      snap_accepted: formData.get('snap_accepted') as string,
      cost: formData.get('cost') as string,
      address: formData.get('address') as string,
      phone: (formData.get('phone') as string) || null,
      website: (formData.get('website') as string) || null,
      hours: (formData.get('hours') as string) || null,
      description: (formData.get('description') as string) || null,
      best_for: (formData.get('best_for') as string) || null,
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">Basic Info</h3>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Resource Name</label>
                <input name="name" defaultValue={resource?.name} required className="w-full p-2.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Category</label>
                <select name="category" defaultValue={resource?.category} required className="w-full p-2.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900">
                  {categories.map(c => (
                    <option key={c.id} value={c.name}>
                      {c.parent_id ? `— ${c.name}` : c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">City + Direction</label>
                <input name="city_direction" defaultValue={resource?.city_direction} placeholder="e.g. Saint Paul - East" required className="w-full p-2.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Status</label>
                <select name="status" defaultValue={resource?.status} className="w-full p-2.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900">
                  <option value="active">Active</option>
                  <option value="needs_verification">Needs Verification</option>
                  <option value="temporarily_closed">Temporarily Closed</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">Access & Transit</h3>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Transit Accessibility</label>
                <select name="transit_accessibility" defaultValue={resource?.transit_accessibility} className="w-full p-2.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900">
                  <option value="On Major Bus Line">On Major Bus Line</option>
                  <option value="Near Light Rail (Green Line / Blue Line)">Near Light Rail</option>
                  <option value="Multiple Transit Options">Multiple Transit Options</option>
                  <option value="Limited Transit Access">Limited Transit Access</option>
                  <option value="Car Recommended">Car Recommended</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Walkability</label>
                <select name="walkability" defaultValue={resource?.walkability} className="w-full p-2.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900">
                  <option value="Walkable ≤ 15 minutes">Walkable ≤ 15 minutes</option>
                  <option value="Walkable 16–30 minutes">Walkable 16–30 minutes</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">SNAP Accepted</label>
                <select name="snap_accepted" defaultValue={resource?.snap_accepted} className="w-full p-2.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900">
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Cost</label>
                <select name="cost" defaultValue={resource?.cost} className="w-full p-2.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900">
                  <option value="Free">Free</option>
                  <option value="Sliding scale">Sliding scale</option>
                  <option value="Insurance">Insurance</option>
                  <option value="Fee">Fee</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">Multi-select Options</h3>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-2">Recovery Stages</label>
                <div className="flex flex-wrap gap-2">
                  {['crisis', 'stabilizing', 'growth'].map(s => (
                    <label key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 text-sm cursor-pointer hover:bg-zinc-50">
                      <input type="checkbox" name="recovery_stage" value={s} defaultChecked={resource?.recovery_stage.includes(s as any)} className="rounded text-zinc-900" />
                      <span className="capitalize">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-2">Access Indicators</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Walk-in friendly', 'Application required', 'Waitlist likely', 'Referral required', 'ID required', 'Insurance required'].map(i => (
                    <label key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 text-xs cursor-pointer hover:bg-zinc-50">
                      <input type="checkbox" name="access_indicators" value={i} defaultChecked={resource?.access_indicators.includes(i)} className="rounded text-zinc-900" />
                      <span>{i}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">Contact Details</h3>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Address</label>
                <input name="address" defaultValue={resource?.address} required className="w-full p-2.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Phone</label>
                <input name="phone" defaultValue={resource?.phone || ''} className="w-full p-2.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Website</label>
                <input name="website" defaultValue={resource?.website || ''} className="w-full p-2.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1">Hours</label>
                <textarea name="hours" defaultValue={resource?.hours || ''} rows={2} className="w-full p-2.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 pb-2">Descriptions</h3>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">Description</label>
              <textarea name="description" defaultValue={resource?.description || ''} rows={4} className="w-full p-2.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900" />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">Best For (Short summary)</label>
              <input name="best_for" defaultValue={resource?.best_for || ''} placeholder="e.g. Quick walk-in food support" className="w-full p-2.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900" />
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

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
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
        const err = await response.json();
        throw new Error(err.error || 'Failed to add user');
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
    if (!confirm(`Are you sure you want to delete admin user ${email}?`)) return;

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete user');
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetPassword = async (id: string, email: string) => {
    if (!confirm(`Send password reset link to ${email}?`)) return;

    try {
      const response = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to send reset link');
      alert('Password reset link generated. Check server logs or email if configured.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">Active Admin Users</h2>
          <p className="text-sm text-zinc-500">Manage administrative access to the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setAddingUser(!addingUser)}
            className="px-4 py-2 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
          <button 
            onClick={fetchUsers}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-all"
            title="Refresh Users"
          >
            <Clock className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {addingUser && (
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">Email</label>
              <input 
                type="email" 
                required 
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full p-2 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 mb-1">Password</label>
              <input 
                type="password" 
                required 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900"
                placeholder="Min 6 characters"
              />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all">
                Create User
              </button>
              <button type="button" onClick={() => setAddingUser(false)} className="px-4 py-2 bg-zinc-100 text-zinc-500 font-bold rounded-lg hover:bg-zinc-200 transition-all">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">User ID</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Created At</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Last Sign In</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-zinc-900">{u.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-zinc-400">{u.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-zinc-500">
                      {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-zinc-500">
                      {u.last_sign_in_at ? format(new Date(u.last_sign_in_at), 'MMM d, yyyy HH:mm') : 'Never'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleResetPassword(u.id, u.email)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                        title="Reset Password"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Delete User"
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
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'error': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'warning': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Filters:</span>
        </div>
        
        <select 
          value={filter.severity}
          onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>

        <select 
          value={filter.source}
          onChange={(e) => setFilter({ ...filter, source: e.target.value })}
          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="all">All Sources</option>
          <option value="client">Client</option>
          <option value="api">API</option>
          <option value="job">Job</option>
        </select>

        <select 
          value={filter.resolved}
          onChange={(e) => setFilter({ ...filter, resolved: e.target.value })}
          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-200 outline-none focus:ring-2 focus:ring-zinc-900"
        >
          <option value="all">All Status</option>
          <option value="false">Unresolved</option>
          <option value="true">Resolved</option>
        </select>

        <button 
          onClick={fetchLogs}
          className="ml-auto p-2 hover:bg-zinc-100 rounded-lg transition-all"
          title="Refresh Logs"
        >
          <Clock className="w-4 h-4 text-zinc-400" />
        </button>

        <button 
          onClick={() => {
            const err = new Error("Manual Test Error: " + new Date().toLocaleTimeString());
            logger.error(err.message, err, { test: true });
            setTimeout(fetchLogs, 1000);
          }}
          className="px-4 py-1.5 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-zinc-800 transition-all"
        >
          Generate Test Error
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="w-10 px-6 py-4"></th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Severity & Source</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Message</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-400 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-zinc-400 italic">No error logs found matching filters.</td>
                </tr>
              ) : logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr 
                    className={`hover:bg-zinc-50/50 transition-colors cursor-pointer ${expandedId === log.id ? 'bg-zinc-50/50' : ''}`}
                    onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                  >
                    <td className="px-6 py-4">
                      {expandedId === log.id ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                          <Terminal className="w-3 h-3" /> {log.source}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-zinc-900 line-clamp-1">{log.message}</p>
                      {log.route && <p className="text-[10px] text-zinc-400 font-mono">{log.route}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-zinc-500">
                        {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleResolve(log);
                        }}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          log.resolved 
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' 
                            : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                        }`}
                      >
                        {log.resolved ? 'Resolved' : 'Mark Resolved'}
                      </button>
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr className="bg-zinc-50/30">
                      <td colSpan={5} className="px-12 py-6 border-t border-zinc-100">
                        <div className="space-y-6">
                          {log.stack && (
                            <div>
                              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Stack Trace</h4>
                              <pre className="bg-zinc-900 text-zinc-300 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-60">
                                {log.stack}
                              </pre>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Metadata</h4>
                              <pre className="bg-white border border-zinc-200 p-4 rounded-xl text-xs font-mono overflow-x-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Context</h4>
                                <div className="space-y-1">
                                  <p className="text-xs text-zinc-600"><span className="font-bold">Endpoint:</span> {log.endpoint || 'N/A'}</p>
                                  <p className="text-xs text-zinc-600"><span className="font-bold">Session ID:</span> {log.session_id || 'N/A'}</p>
                                  <p className="text-xs text-zinc-600"><span className="font-bold">User ID:</span> {log.user_id || 'Anonymous'}</p>
                                </div>
                              </div>
                              {log.resolved && (
                                <div>
                                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Resolution</h4>
                                  <p className="text-xs text-zinc-600">
                                    Resolved at {format(new Date(log.resolved_at!), 'MMM d, yyyy HH:mm')}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

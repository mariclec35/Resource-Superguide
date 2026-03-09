import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, CheckCircle2, XCircle, Clock, Loader2, Calendar, MapPin, AlertCircle, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { RecoveryEvent, EventStatus } from '../types';
import { supabase } from '../lib/supabase';

export default function AdminEventsManager() {
  const [events, setEvents] = useState<RecoveryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  
  // Edit/Create state
  const [isEditing, setIsEditing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Partial<RecoveryEvent> | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/events');
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEvent) return;
    
    setSaving(true);
    try {
      const isNew = !currentEvent.id;
      const url = isNew ? '/api/admin/events' : `/api/admin/events/${currentEvent.id}`;
      const method = isNew ? 'POST' : 'PUT';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentEvent)
      });
      
      if (!res.ok) throw new Error('Failed to save event');
      
      await fetchEvents();
      setIsEditing(false);
      setCurrentEvent(null);
    } catch (err) {
      console.error(err);
      alert('Failed to save event. Check console for details.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return;
    
    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete event');
      await fetchEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to delete event.');
    }
  };

  const handleStatusChange = async (id: string, newStatus: EventStatus) => {
    try {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error('Failed to update status');
      await fetchEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  const filteredEvents = events.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          e.organizer_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: EventStatus) => {
    switch (status) {
      case 'published': return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded uppercase tracking-wider">Published</span>;
      case 'pending_review': return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded uppercase tracking-wider">Pending</span>;
      case 'draft': return <span className="px-2 py-1 bg-zinc-100 text-zinc-700 text-xs font-bold rounded uppercase tracking-wider">Draft</span>;
      case 'cancelled': return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded uppercase tracking-wider">Cancelled</span>;
      case 'archived': return <span className="px-2 py-1 bg-zinc-200 text-zinc-600 text-xs font-bold rounded uppercase tracking-wider">Archived</span>;
      default: return <span className="px-2 py-1 bg-zinc-100 text-zinc-700 text-xs font-bold rounded uppercase tracking-wider">{status}</span>;
    }
  };

  if (isEditing && currentEvent) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-zinc-100">
          <div>
            <h2 className="text-2xl font-black text-zinc-900 tracking-tight">
              {currentEvent.id ? 'Edit Event' : 'Create New Event'}
            </h2>
            <p className="text-sm text-zinc-500">Manage event details and publication status.</p>
          </div>
          <button 
            onClick={() => { setIsEditing(false); setCurrentEvent(null); }}
            className="px-4 py-2 text-zinc-500 font-bold hover:text-zinc-900 transition-colors"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-zinc-700 mb-2">Event Title *</label>
              <input 
                required type="text" value={currentEvent.title || ''}
                onChange={e => setCurrentEvent({...currentEvent, title: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-zinc-700 mb-2">Description *</label>
              <textarea 
                required rows={4} value={currentEvent.description || ''}
                onChange={e => setCurrentEvent({...currentEvent, description: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Category *</label>
              <input 
                required type="text" value={currentEvent.category || ''}
                onChange={e => setCurrentEvent({...currentEvent, category: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="e.g., Social Event, Workshop"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Status *</label>
              <select 
                required value={currentEvent.status || 'draft'}
                onChange={e => setCurrentEvent({...currentEvent, status: e.target.value as EventStatus})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="published">Published</option>
                <option value="cancelled">Cancelled</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Start Date & Time *</label>
              <input 
                required type="datetime-local" 
                value={currentEvent.start_datetime ? new Date(currentEvent.start_datetime).toISOString().slice(0, 16) : ''}
                onChange={e => setCurrentEvent({...currentEvent, start_datetime: new Date(e.target.value).toISOString()})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">End Date & Time</label>
              <input 
                type="datetime-local" 
                value={currentEvent.end_datetime ? new Date(currentEvent.end_datetime).toISOString().slice(0, 16) : ''}
                onChange={e => setCurrentEvent({...currentEvent, end_datetime: e.target.value ? new Date(e.target.value).toISOString() : null})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Location Name</label>
              <input 
                type="text" value={currentEvent.location_name || ''}
                onChange={e => setCurrentEvent({...currentEvent, location_name: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Address</label>
              <input 
                type="text" value={currentEvent.address || ''}
                onChange={e => setCurrentEvent({...currentEvent, address: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">City</label>
              <input 
                type="text" value={currentEvent.city || ''}
                onChange={e => setCurrentEvent({...currentEvent, city: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">State</label>
              <input 
                type="text" value={currentEvent.state || ''}
                onChange={e => setCurrentEvent({...currentEvent, state: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">ZIP</label>
              <input 
                type="text" value={currentEvent.zip || ''}
                onChange={e => setCurrentEvent({...currentEvent, zip: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Cost Type</label>
              <select 
                value={currentEvent.cost_type || 'free'}
                onChange={e => setCurrentEvent({...currentEvent, cost_type: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
                <option value="donation">Donation</option>
                <option value="sliding_scale">Sliding Scale</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Cost Details</label>
              <input 
                type="text" value={currentEvent.cost_details || ''}
                onChange={e => setCurrentEvent({...currentEvent, cost_details: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Organizer Name *</label>
              <input 
                required type="text" value={currentEvent.organizer_name || ''}
                onChange={e => setCurrentEvent({...currentEvent, organizer_name: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Organizer Type</label>
              <input 
                type="text" value={currentEvent.organizer_type || ''}
                onChange={e => setCurrentEvent({...currentEvent, organizer_type: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Contact Email</label>
              <input 
                type="email" value={currentEvent.contact_email || ''}
                onChange={e => setCurrentEvent({...currentEvent, contact_email: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Contact Phone</label>
              <input 
                type="tel" value={currentEvent.contact_phone || ''}
                onChange={e => setCurrentEvent({...currentEvent, contact_phone: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Website</label>
              <input 
                type="url" value={currentEvent.website || ''}
                onChange={e => setCurrentEvent({...currentEvent, website: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Registration Link</label>
              <input 
                type="url" value={currentEvent.registration_link || ''}
                onChange={e => setCurrentEvent({...currentEvent, registration_link: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-zinc-700 mb-2">Verification Notes (Internal)</label>
              <textarea 
                rows={2} value={currentEvent.verification_notes || ''}
                onChange={e => setCurrentEvent({...currentEvent, verification_notes: e.target.value})}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                placeholder="Notes for admins only"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-zinc-100">
            <button 
              type="submit" disabled={saving}
              className="px-8 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              Save Event
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Events Management</h2>
          <p className="text-sm text-zinc-500">Manage community events, approve submissions, and update details.</p>
        </div>
        <button 
          onClick={() => {
            setCurrentEvent({
              title: '', description: '', category: '', organizer_name: '', status: 'draft',
              start_datetime: new Date().toISOString()
            });
            setIsEditing(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input 
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="pending_review">Pending Review</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mx-auto mb-4" />
            <p className="text-zinc-500">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-900 mb-2">No events found</h3>
            <p className="text-zinc-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Event</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Date & Location</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredEvents.map(event => (
                  <tr key={event.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-zinc-900 mb-1">{event.title}</div>
                      <div className="text-sm text-zinc-500 flex items-center gap-2">
                        <span className="truncate max-w-[200px]">{event.organizer_name}</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-300"></span>
                        <span className="truncate max-w-[150px]">{event.category}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-zinc-900 mb-1">
                        {format(parseISO(event.start_datetime), 'MMM d, yyyy h:mm a')}
                      </div>
                      <div className="text-sm text-zinc-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{event.city || 'No city'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(event.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {event.status === 'pending_review' && (
                          <button 
                            onClick={() => handleStatusChange(event.id, 'published')}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Approve & Publish"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => { setCurrentEvent(event); setIsEditing(true); }}
                          className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(event.id)}
                          className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      </div>
    </div>
  );
}

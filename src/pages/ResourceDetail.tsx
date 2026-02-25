import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Resource } from '../types';
import { 
  ArrowLeft, MapPin, Phone, Globe, Clock, Bus, Footprints as Walk, 
  CreditCard, ShoppingBag, CheckCircle2, AlertTriangle, Loader2,
  ExternalLink, Share2, MessageSquare, BookOpen
} from 'lucide-react';
import { motion } from 'motion/react';

export default function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [inGuide, setInGuide] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    if (id) {
      fetchResource(id);
      const saved = localStorage.getItem('my-guide');
      if (saved) {
        const ids = JSON.parse(saved);
        setInGuide(ids.includes(id));
      }
    }
  }, [id]);

  const fetchResource = async (resourceId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('id', resourceId)
        .single();

      if (error) throw error;
      setResource(data);
    } catch (err) {
      console.error('Error fetching resource:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const toggleGuide = () => {
    if (!id) return;
    const saved = localStorage.getItem('my-guide');
    let ids = saved ? JSON.parse(saved) : [];
    
    if (inGuide) {
      ids = ids.filter((i: string) => i !== id);
    } else {
      ids.push(id);
    }
    
    localStorage.setItem('my-guide', JSON.stringify(ids));
    setInGuide(!inGuide);
  };

  const handleReportSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !resource) return;

    setReportSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const issue_type = formData.get('issue_type') as string;
    const comment = formData.get('comment') as string;
    const optional_contact = formData.get('optional_contact') as string;

    try {
      // 1. Insert report
      const { error: reportError } = await supabase
        .from('reports')
        .insert({
          resource_id: id,
          issue_type,
          comment,
          optional_contact,
        });

      if (reportError) throw reportError;

      // 2. Update resource status and count
      const { error: resourceError } = await supabase
        .from('resources')
        .update({
          status: 'needs_verification',
          open_report_count: (resource.open_report_count || 0) + 1
        })
        .eq('id', id);

      if (resourceError) throw resourceError;

      setReportSuccess(true);
      setTimeout(() => {
        setShowReportForm(false);
        setReportSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error submitting report:', err);
      alert('Failed to submit report. Please try again.');
    } finally {
      setReportSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-zinc-500">Loading resource details...</p>
      </div>
    );
  }

  if (!resource) return null;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(resource.address)}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-8 font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Resources
      </Link>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden">
        {/* Header Section */}
        <div className="p-8 border-b border-zinc-100">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                  {resource.category}
                </span>
                {resource.status === 'needs_verification' && (
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Needs Verification
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight">
                {resource.name}
              </h1>
              <p className="text-zinc-500 mt-2 flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {resource.city_direction}
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <button
                onClick={toggleGuide}
                className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                  inGuide 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                    : 'bg-white border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50'
                }`}
              >
                {inGuide ? <CheckCircle2 className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                {inGuide ? 'In My Guide' : 'Add to My Guide'}
              </button>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 text-white font-bold hover:bg-zinc-800 transition-all"
              >
                <MapPin className="w-5 h-5" />
                Get Directions
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">About this Resource</h3>
                <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">
                  {resource.description || 'No description provided.'}
                </p>
              </div>

              {resource.best_for && (
                <div>
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Best For</h3>
                  <p className="text-zinc-700 italic">"{resource.best_for}"</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {resource.recovery_stage.map(stage => (
                  <span key={stage} className="px-3 py-1 rounded-lg bg-zinc-100 text-zinc-600 text-sm font-semibold capitalize">
                    {stage} Stage
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-zinc-50 rounded-2xl p-6 space-y-4 border border-zinc-100">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Contact & Access</h3>
              
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-zinc-900">Address</p>
                  <p className="text-sm text-zinc-600">{resource.address}</p>
                </div>
              </div>

              {resource.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-zinc-900">Phone</p>
                    <a href={`tel:${resource.phone}`} className="text-sm text-emerald-600 hover:underline">
                      {resource.phone}
                    </a>
                  </div>
                </div>
              )}

              {resource.website && (
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-zinc-900">Website</p>
                    <a href={resource.website} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:underline flex items-center gap-1">
                      Visit Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {resource.hours && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-zinc-900">Hours</p>
                    <p className="text-sm text-zinc-600 whitespace-pre-wrap">{resource.hours}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Access Indicators Section */}
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 bg-zinc-50/50">
          <div>
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Bus className="w-4 h-4" /> Transit & Walking
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Bus className="w-4 h-4 text-emerald-600" />
                <span className="text-zinc-700">{resource.transit_accessibility}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Walk className="w-4 h-4 text-emerald-600" />
                <span className="text-zinc-700">{resource.walkability}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Cost & SNAP
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span className="text-zinc-700">Cost: {resource.cost}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span className="text-zinc-700">SNAP Accepted: {resource.snap_accepted}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Access Requirements
            </h3>
            <div className="flex flex-wrap gap-2">
              {resource.access_indicators.map(indicator => (
                <span key={indicator} className="px-2 py-1 bg-white border border-zinc-200 rounded text-xs font-medium text-zinc-600">
                  {indicator}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm text-zinc-400 italic">
            {resource.last_verified_date && (
              <span>Last verified: {new Date(resource.last_verified_date).toLocaleDateString()}</span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowReportForm(!showReportForm)}
              className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-red-600 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Report an Issue
            </button>
            <button className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>

        {/* Report Form Overlay */}
        {showReportForm && (
          <div className="p-8 bg-red-50 border-t border-red-100">
            <h2 className="text-xl font-black text-red-900 mb-4">Report an Issue</h2>
            {reportSuccess ? (
              <div className="bg-white p-6 rounded-xl border border-emerald-200 text-emerald-800 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6" />
                <p className="font-bold">Thank you! Your report has been submitted and we will verify this resource.</p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-red-800 uppercase tracking-wider mb-1.5">Issue Type</label>
                    <select
                      name="issue_type"
                      required
                      className="w-full p-3 rounded-xl border border-red-200 bg-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    >
                      <option value="">Select an issue...</option>
                      <option value="Closed / no longer operating">Closed / no longer operating</option>
                      <option value="Wrong phone number">Wrong phone number</option>
                      <option value="Wrong address">Wrong address</option>
                      <option value="Wrong hours">Wrong hours</option>
                      <option value="SNAP info wrong">SNAP info wrong</option>
                      <option value="Eligibility inaccurate">Eligibility inaccurate</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-red-800 uppercase tracking-wider mb-1.5">Optional Contact (Email/Phone)</label>
                    <input
                      type="text"
                      name="optional_contact"
                      placeholder="If you'd like us to follow up..."
                      className="w-full p-3 rounded-xl border border-red-200 bg-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-red-800 uppercase tracking-wider mb-1.5">Comments</label>
                  <textarea
                    name="comment"
                    rows={3}
                    placeholder="Tell us more about the issue..."
                    className="w-full p-3 rounded-xl border border-red-200 bg-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  ></textarea>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowReportForm(false)}
                    className="px-6 py-2 rounded-lg font-bold text-zinc-500 hover:bg-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reportSubmitting}
                    className="px-8 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {reportSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

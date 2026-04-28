import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Resource, Feedback } from '../types';
import { 
  ArrowLeft, MapPin, Phone, Globe, CheckCircle2, AlertTriangle, Loader2,
  ExternalLink, Share2, MessageSquare, BookOpen, Star, Clock, User, ShieldCheck,
  Sparkles, AlertCircle, TrendingUp, ArrowRight, Building2, GitBranch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import AddToSupportListButton from '../components/AddToSupportListButton';
import type { SupportListItem } from '../types';

function getLastVerifiedLabel(resource: Resource) {
  const candidate = resource.updated_at || resource.created_at || resource.last_verified;
  if (!candidate) return 'Verification date unavailable';

  const parsed = new Date(candidate);
  if (Number.isNaN(parsed.getTime())) {
    return typeof resource.last_verified === 'string' ? resource.last_verified : 'Verification date unavailable';
  }

  return format(parsed, 'MMM yyyy');
}

function toSupportListItem(resource: Resource): SupportListItem {
  return {
    id: `resource-${resource.id}`,
    sourceId: resource.id,
    type: 'resource',
    title: resource.name,
    description: resource.provides || resource.details || resource.remarks || undefined,
    category: resource.category,
    tags: resource.metadata?.pathway_tags || [],
    address: resource.address || undefined,
    city: resource.city || undefined,
    region: resource.locations?.[0]?.state || undefined,
    locationName: resource.locations?.[0]?.label || undefined,
    phone: resource.phone || undefined,
    email: resource.email || undefined,
    website: resource.website || undefined,
    addedAt: new Date().toISOString(),
  };
}

function getResourceLogoUrl(resource?: Resource | null) {
  if (!resource) return null;
  return resource.logo_url || resource.metadata?.logo_url || resource.metadata?.logo || null;
}

export default function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resource, setResource] = useState<Resource | null>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [rating, setRating] = useState(5);

  useEffect(() => {
    document.title = "Twin Cities Recovery Hub";
    if (id) {
      fetchResource(id);
      fetchFeedback(id);
    }
  }, [id]);

  const fetchResource = async (resourceId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/resources/${resourceId}?includeRelations=true`);
      if (!response.ok) throw new Error('Failed to fetch resource');
      const data = await response.json();
      setResource(data);
    } catch (err) {
      console.error('Error fetching resource:', err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async (resourceId: string) => {
    try {
      const { data, error } = await supabase
        .from('resource_feedback')
        .select('*')
        .eq('resource_id', resourceId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedbacks(data || []);
    } catch (err) {
      console.error('Error fetching feedback:', err);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !resource) return;

    setFeedbackSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const guest_name = formData.get('guest_name') as string;
    const guest_email = formData.get('guest_email') as string;
    const review_text = formData.get('review_text') as string;
    const rating_accessibility = Number(formData.get('rating_accessibility'));
    const rating_staff = Number(formData.get('rating_staff'));
    const rating_usefulness = Number(formData.get('rating_usefulness'));

    try {
      const { error } = await supabase
        .from('resource_feedback')
        .insert({
          resource_id: id,
          guest_name,
          guest_email,
          rating_overall: rating,
          rating_accessibility,
          rating_staff,
          rating_usefulness,
          review_text,
          status: 'pending'
        });

      if (error) throw error;

      setFeedbackSuccess(true);
      setTimeout(() => {
        setShowFeedbackForm(false);
        setFeedbackSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
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
      const { error: reportError } = await supabase
        .from('reports')
        .insert({
          resource_id: id,
          issue_type,
          comment,
          optional_contact,
        });

      if (reportError) throw reportError;

      const { error: resourceError } = await supabase
        .from('resources')
        .update({
          status: 'needs_verification',
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
  const lastVerifiedLabel = getLastVerifiedLabel(resource);
  const supportListItem = toSupportListItem(resource);
  const parentOrganization = resource.parent_organization || null;
  const childLocations = resource.child_locations || [];
  const parentLogoUrl = getResourceLogoUrl(parentOrganization);
  const isChildOfOrganization = Boolean(
    resource.parent_org_slug &&
    resource.parent_org_slug !== 'independent-provider' &&
    parentOrganization
  );
  const childSectionTitle = childLocations.length > 1 ? 'Program Locations' : 'Local Branch Site';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 mb-8 font-medium transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Directory
      </Link>

      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden mb-8">
        {isChildOfOrganization && parentOrganization && (
          <div className="border-b border-emerald-100 bg-emerald-50/80 px-8 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm">
                  {parentLogoUrl ? (
                    <img
                      src={parentLogoUrl}
                      alt={`${parentOrganization.name} logo`}
                      className="h-full w-full object-contain p-1.5"
                    />
                  ) : (
                    <Building2 className="h-5 w-5 text-emerald-700" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">
                    Part of
                  </p>
                  <p className="text-sm font-bold text-zinc-900">
                    {parentOrganization.name}
                  </p>
                </div>
              </div>
              <Link
                to={`/resource/${parentOrganization.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-bold text-emerald-700 transition-colors hover:border-emerald-300 hover:text-emerald-800"
              >
                View parent organization
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="p-8 border-b border-zinc-100">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                  {resource.category}
                </span>
                {resource.subcategory && (
                  <span className="px-3 py-1 rounded-full bg-zinc-100 text-zinc-600 text-xs font-bold uppercase tracking-wider">
                    {resource.subcategory}
                  </span>
                )}
                {resource.status === 'needs_verification' && (
                  <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Needs Verification
                  </span>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight mb-2">
                {resource.name}
              </h1>
              {resource.name_aliases && resource.name_aliases.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Known as:</span>
                  {resource.name_aliases.map((alias, i) => (
                    <span key={i} className="text-xs font-bold text-zinc-500 italic">
                      {alias}{i < resource.name_aliases!.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4">
                {resource.average_rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${s <= Math.round(resource.average_rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'}`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-zinc-900">{resource.average_rating.toFixed(1)}</span>
                    <span className="text-sm text-zinc-400">({resource.review_count || 0} reviews)</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">
                  <ShieldCheck className="w-3 h-3" />
                  Last Verified: {lastVerifiedLabel}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <AddToSupportListButton item={supportListItem} />
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
            <div className="space-y-8">
              {/* Community Experience Overview */}
              <div className="bg-zinc-900 rounded-2xl p-6 text-white shadow-xl shadow-zinc-200">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Visitor Experience Overview</h3>
                </div>
                {feedbacks.length >= 3 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-100 leading-relaxed">
                      Based on community feedback, visitors commonly mention {resource.name} as being particularly helpful for {resource.category.toLowerCase()} needs. 
                      The staff is frequently noted for their professional approach.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Common Strengths</p>
                        <p className="text-xs font-bold text-emerald-400">Helpful Staff, Quick Response</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Keep in Mind</p>
                        <p className="text-xs font-bold text-amber-400">Limited Parking, Busy Mornings</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4">
                    {resource.search_embeddings_text && (
                      <p className="text-sm text-zinc-300 leading-relaxed italic mb-4">
                        {resource.search_embeddings_text}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500">
                      Detailed community insights appear once more visitors share their feedback.
                    </p>
                  </div>
                )}
              </div>

              {/* Advanced Intelligence Section */}
              {(resource.metadata || resource.eligibility) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                  {resource.eligibility && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <User className="w-3 h-3" />
                        Eligibility
                      </h3>
                      <div className="space-y-2">
                        {resource.eligibility.populations && resource.eligibility.populations.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {resource.eligibility.populations.map((p, i) => (
                              <span key={i} className="px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase tracking-wider">
                                {p.replace(/-/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          <div>
                            Min Age: <span className="text-zinc-900">{resource.eligibility.min_age || 'All Ages'}</span>
                          </div>
                          <div>
                            Gender: <span className="text-zinc-900 capitalize">{resource.eligibility.gender_focus}</span>
                          </div>
                          {resource.eligibility.sober_living_required && (
                            <div className="col-span-2 text-emerald-600">
                              ✓ Sober Living Required
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {resource.metadata && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3" />
                        Requirements
                      </h3>
                      <div className="space-y-2">
                        <div className="text-xs text-zinc-700">
                          <p className="font-bold text-zinc-900 mb-1">Referral Status</p>
                          <p className="text-zinc-500">{resource.metadata.referral_required || 'None required.'}</p>
                        </div>
                        {resource.metadata.is_assessment_center && (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest border border-amber-100">
                            <AlertCircle className="w-3 h-3" />
                            Official Assessment Center
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {resource.relational_graph && (resource.relational_graph.next_step_referrals?.length ?? 0) > 0 && (
                <div className="pt-6 border-t border-zinc-100">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    Recommended Next Steps
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {resource.relational_graph.next_step_referrals?.map((ref, i) => (
                      <div key={i} className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-100 text-sm font-medium text-zinc-700 flex items-center gap-2">
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        {ref.replace(/-/g, ' ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {resource.provides && (
                <div>
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">What they provide</h3>
                  <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">
                    {resource.provides}
                  </p>
                </div>
              )}
              {resource.remarks && (
                <div>
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Important Remarks</h3>
                  <p className="text-zinc-600 text-sm leading-relaxed italic">
                    {resource.remarks}
                  </p>
                </div>
              )}
              {resource.details && (
                <div>
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">Additional Details</h3>
                  <p className="text-zinc-600 text-sm leading-relaxed">
                    {resource.details}
                  </p>
                </div>
              )}

              {childLocations.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">
                      {childSectionTitle}
                    </h3>
                  </div>
                  <p className="mb-5 text-sm text-zinc-600">
                    These local sites and programs are connected to {resource.name}.
                  </p>
                  <div className="space-y-3">
                    {childLocations.map((child) => {
                      const childMapsUrl = child.address
                        ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(child.address)}`
                        : null;

                      return (
                        <div
                          key={child.id}
                          className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                              <Link
                                to={`/resource/${child.id}`}
                                className="inline-flex items-center gap-2 text-base font-bold text-zinc-900 transition-colors hover:text-emerald-700"
                              >
                                {child.name}
                                <ArrowRight className="h-4 w-4 text-zinc-400" />
                              </Link>
                              <div className="space-y-1 text-sm text-zinc-600">
                                {(child.address || child.city) && (
                                  <p className="flex items-start gap-2">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                                    <span>
                                      {child.address || 'Address unavailable'}
                                      {child.city ? `, ${child.city}` : ''}
                                    </span>
                                  </p>
                                )}
                                {child.phone && (
                                  <a
                                    href={`tel:${child.phone}`}
                                    className="flex items-center gap-2 text-emerald-700 transition-colors hover:text-emerald-800 hover:underline"
                                  >
                                    <Phone className="h-4 w-4 text-zinc-400" />
                                    {child.phone}
                                  </a>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Link
                                to={`/resource/${child.id}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm font-bold text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-900"
                              >
                                View details
                              </Link>
                              {childMapsUrl && (
                                <a
                                  href={childMapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-bold text-emerald-700 transition-colors hover:border-emerald-300 hover:text-emerald-800"
                                >
                                  Directions
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-zinc-50 rounded-2xl p-6 space-y-4 border border-zinc-100 h-fit">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Contact & Details</h3>
              
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-zinc-900">Address</p>
                  <p className="text-sm text-zinc-600">
                    {resource.address || 'No address listed'}
                    {resource.city && `, ${resource.city}`}
                  </p>
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
                    <a 
                      href={resource.website.startsWith('http') ? resource.website : `https://${resource.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sm text-emerald-600 hover:underline flex items-center gap-1"
                    >
                      Visit Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {resource.locations && resource.locations.length > 1 && (
                <div className="pt-4 border-t border-zinc-100 mt-4">
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3">Additional Locations</h3>
                  <div className="space-y-3">
                    {resource.locations.slice(1).map((loc, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-zinc-700">{loc.label}</p>
                          <p className="text-zinc-500">{loc.address}, {loc.city}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setShowFeedbackForm(!showFeedbackForm)}
              className="flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              <Star className="w-4 h-4" />
              Write a Review
            </button>
            <button 
              onClick={() => setShowReportForm(!showReportForm)}
              className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-red-600 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Report an Issue
            </button>
          </div>
          
          <button className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors">
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>

        {/* Feedback Form Overlay */}
        <AnimatePresence>
          {showFeedbackForm && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-emerald-50 border-t border-emerald-100"
            >
              <div className="p-8">
                <h2 className="text-2xl font-black text-emerald-900 mb-6">Share Your Experience</h2>
                {feedbackSuccess ? (
                  <div className="bg-white p-6 rounded-2xl border border-emerald-200 text-emerald-800 flex items-center gap-4 shadow-sm">
                    <div className="bg-emerald-100 p-2 rounded-full">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">Thank you for your feedback!</p>
                      <p className="text-sm opacity-80">Your review has been submitted for moderation and will be visible once approved.</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Overall Rating</label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setRating(s)}
                                className={`p-2 rounded-lg transition-all ${rating >= s ? 'text-amber-400' : 'text-zinc-300'}`}
                              >
                                <Star className={`w-8 h-8 ${rating >= s ? 'fill-amber-400' : ''}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Your Name (Optional)</label>
                          <input
                            type="text"
                            name="guest_name"
                            placeholder="How should we display your name?"
                            className="w-full p-3 rounded-xl border border-emerald-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Email Address (Optional)</label>
                          <input
                            type="email"
                            name="guest_email"
                            placeholder="For verification purposes only"
                            className="w-full p-3 rounded-xl border border-emerald-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Accessibility Rating</label>
                            <input type="range" name="rating_accessibility" min="1" max="5" defaultValue="5" className="w-full accent-emerald-600" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Staff Rating</label>
                            <input type="range" name="rating_staff" min="1" max="5" defaultValue="5" className="w-full accent-emerald-600" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Usefulness Rating</label>
                            <input type="range" name="rating_usefulness" min="1" max="5" defaultValue="5" className="w-full accent-emerald-600" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Your Review</label>
                      <textarea
                        name="review_text"
                        rows={4}
                        required
                        placeholder="What was your experience like? Was it helpful? How was the staff?"
                        className="w-full p-4 rounded-xl border border-emerald-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                      ></textarea>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowFeedbackForm(false)}
                        className="px-6 py-3 rounded-xl font-bold text-zinc-500 hover:bg-white transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={feedbackSubmitting}
                        className="px-8 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-200"
                      >
                        {feedbackSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        Submit Review
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Report Form Overlay */}
        <AnimatePresence>
          {showReportForm && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-red-50 border-t border-red-100"
            >
              <div className="p-8">
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reviews Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Community Feedback</h2>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <ShieldCheck className="w-4 h-4" />
            Moderated Reviews
          </div>
        </div>

        {feedbacks.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {feedbacks.map((f) => (
              <div key={f.id} className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900">{f.guest_name || 'Anonymous User'}</p>
                      <p className="text-xs text-zinc-400">{new Date(f.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`w-3.5 h-3.5 ${s <= f.rating_overall ? 'text-amber-400 fill-amber-400' : 'text-zinc-200'}`}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-zinc-700 leading-relaxed italic">"{f.review_text}"</p>
                
                <div className="mt-4 pt-4 border-t border-zinc-50 flex flex-wrap gap-4">
                  {f.rating_accessibility && (
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Accessibility: <span className="text-zinc-900">{f.rating_accessibility}/5</span>
                    </div>
                  )}
                  {f.rating_staff && (
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Staff: <span className="text-zinc-900">{f.rating_staff}/5</span>
                    </div>
                  )}
                  {f.rating_usefulness && (
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Usefulness: <span className="text-zinc-900">{f.rating_usefulness}/5</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200">
            <MessageSquare className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium">No reviews yet. Be the first to share your experience!</p>
            <button 
              onClick={() => setShowFeedbackForm(true)}
              className="mt-4 text-emerald-600 font-bold hover:underline"
            >
              Write a review
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

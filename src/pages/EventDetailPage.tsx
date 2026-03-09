import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Globe, Mail, Phone, ArrowLeft, Share2, Tag, Building2, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { RecoveryEvent } from '../types';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<RecoveryEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/events/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          navigate('/events');
          return;
        }
        throw new Error('Failed to fetch event');
      }
      const data = await res.json();
      setEvent(data);
      document.title = `${data.title} | Twin Cities Recovery Hub Events`;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!event) return null;

  const startDate = parseISO(event.start_datetime);
  const endDate = event.end_datetime ? parseISO(event.end_datetime) : null;

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 pt-8 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/events" className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Link>

          <div className="flex flex-wrap items-center gap-3 mb-6">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-full uppercase tracking-wider">
              {event.category}
            </span>
            {event.cost_type === 'free' && (
              <span className="px-3 py-1 bg-zinc-100 text-zinc-700 text-sm font-bold rounded-full uppercase tracking-wider">
                Free Event
              </span>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-black text-zinc-900 tracking-tight mb-6 leading-tight">
            {event.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-zinc-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-zinc-400" />
              <span className="font-medium">{format(startDate, 'EEEE, MMMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-400" />
              <span className="font-medium">
                {format(startDate, 'h:mm a')}
                {endDate && ` - ${format(endDate, 'h:mm a')}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-2xl font-bold text-zinc-900 mb-6">About this event</h2>
              <div className="prose prose-zinc max-w-none prose-p:leading-relaxed prose-a:text-emerald-600 hover:prose-a:text-emerald-700">
                {event.description.split('\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </section>

            <section className="bg-white border border-zinc-200 rounded-3xl p-8">
              <h2 className="text-xl font-bold text-zinc-900 mb-6 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-zinc-400" />
                Organizer
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-zinc-900 text-lg">{event.organizer_name}</h3>
                  {event.organizer_type && <p className="text-zinc-500 text-sm">{event.organizer_type}</p>}
                </div>
                
                <div className="flex flex-col gap-3 pt-4 border-t border-zinc-100">
                  {event.website && (
                    <a href={event.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-zinc-600 hover:text-emerald-600 transition-colors">
                      <Globe className="w-5 h-5 text-zinc-400" />
                      {event.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {event.contact_email && (
                    <a href={`mailto:${event.contact_email}`} className="flex items-center gap-3 text-zinc-600 hover:text-emerald-600 transition-colors">
                      <Mail className="w-5 h-5 text-zinc-400" />
                      {event.contact_email}
                    </a>
                  )}
                  {event.contact_phone && (
                    <a href={`tel:${event.contact_phone}`} className="flex items-center gap-3 text-zinc-600 hover:text-emerald-600 transition-colors">
                      <Phone className="w-5 h-5 text-zinc-400" />
                      {event.contact_phone}
                    </a>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 sticky top-24">
              <h3 className="font-bold text-zinc-900 mb-6 uppercase tracking-wider text-sm">Location & Details</h3>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <MapPin className="w-6 h-6 text-zinc-400 shrink-0" />
                  <div>
                    <p className="font-bold text-zinc-900">{event.location_name || 'Location'}</p>
                    <p className="text-zinc-600 mt-1">{event.address}</p>
                    <p className="text-zinc-600">{event.city}{event.state ? `, ${event.state}` : ''} {event.zip}</p>
                  </div>
                </div>

                {event.cost_type !== 'free' && (
                  <div className="flex gap-4">
                    <Tag className="w-6 h-6 text-zinc-400 shrink-0" />
                    <div>
                      <p className="font-bold text-zinc-900">Cost</p>
                      <p className="text-zinc-600 mt-1 capitalize">{event.cost_type?.replace('_', ' ')}</p>
                      {event.cost_details && <p className="text-zinc-500 text-sm mt-1">{event.cost_details}</p>}
                    </div>
                  </div>
                )}

                {event.registration_link && (
                  <div className="pt-6 border-t border-zinc-100">
                    <a 
                      href={event.registration_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200"
                    >
                      Register Now
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: event.title,
                    text: event.description,
                    url: window.location.href,
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white border border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Share Event
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

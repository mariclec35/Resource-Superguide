import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, AlertCircle, Loader2, CalendarPlus } from 'lucide-react';

export default function SubmitEventPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    organizer_name: '',
    organizer_type: '',
    contact_email: '',
    contact_phone: '',
    website: '',
    location_name: '',
    address: '',
    city: '',
    state: 'MN',
    zip: '',
    start_datetime: '',
    end_datetime: '',
    cost_type: 'free',
    cost_details: '',
    registration_link: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to submit event');
      
      setSuccess(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      setError(err.message || 'An error occurred while submitting the event.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 md:p-12 rounded-3xl border border-zinc-200 shadow-sm max-w-xl w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-black text-zinc-900 mb-4 tracking-tight">Event Submitted!</h1>
          <p className="text-zinc-600 mb-8 leading-relaxed">
            Thank you for sharing this event with the community. Your submission has been received and is pending review by our moderation team. It will appear on the calendar once approved.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/events"
              className="px-8 py-3 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-colors"
            >
              Back to Events
            </Link>
            <button 
              onClick={() => {
                setSuccess(false);
                setFormData({
                  title: '', description: '', category: '', organizer_name: '', organizer_type: '',
                  contact_email: '', contact_phone: '', website: '', location_name: '', address: '',
                  city: '', state: 'MN', zip: '', start_datetime: '', end_datetime: '', cost_type: 'free', cost_details: '', registration_link: ''
                });
              }}
              className="px-8 py-3 bg-white border border-zinc-200 text-zinc-700 font-bold rounded-xl hover:bg-zinc-50 transition-colors"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-20">
      <div className="bg-emerald-900 text-white py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Link to="/events" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-200 hover:text-white mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-800 rounded-2xl">
              <CalendarPlus className="w-8 h-8 text-emerald-100" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">Submit an Event</h1>
          </div>
          <p className="text-emerald-100 text-lg">
            Share a recovery-related community event. All submissions are reviewed before publication to ensure they align with our community guidelines.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-4">Event Details</h2>
            
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Event Title *</label>
              <input 
                required
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g., Sober Summer BBQ"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Category *</label>
                <select 
                  required
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                >
                  <option value="">Select a category</option>
                  <option value="Social Event">Social Event</option>
                  <option value="Workshop/Training">Workshop/Training</option>
                  <option value="Fundraiser">Fundraiser</option>
                  <option value="Awareness">Awareness</option>
                  <option value="Volunteer">Volunteer</option>
                  <option value="Conference">Conference</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Cost Type</label>
                <select
                  name="cost_type"
                  value={formData.cost_type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
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
                  type="text"
                  name="cost_details"
                  value={formData.cost_details}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="e.g., $10 suggested donation"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Description *</label>
              <textarea 
                required
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={5}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
                placeholder="Provide details about the event, who it's for, and what to expect."
              />
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-4">Date & Time</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Start Date & Time *</label>
                <input 
                  required
                  type="datetime-local"
                  name="start_datetime"
                  value={formData.start_datetime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">End Date & Time</label>
                <input 
                  type="datetime-local"
                  name="end_datetime"
                  value={formData.end_datetime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-4">Location</h2>
            
            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Location Name</label>
              <input 
                type="text"
                name="location_name"
                value={formData.location_name}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="e.g., Community Center, Online (Zoom)"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 mb-2">Address</label>
              <input 
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Street address or meeting link"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-bold text-zinc-700 mb-2">City</label>
                <input 
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">State</label>
                <input 
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">ZIP</label>
                <input 
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Organizer & Links */}
          <div className="bg-white p-8 rounded-3xl border border-zinc-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-zinc-900 border-b border-zinc-100 pb-4">Organizer & Links</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Organizer Name *</label>
                <input 
                  required
                  type="text"
                  name="organizer_name"
                  value={formData.organizer_name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Organizer Type</label>
                <input 
                  type="text"
                  name="organizer_type"
                  value={formData.organizer_type}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="e.g., Non-profit, Treatment Center, Community Group"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Contact Email</label>
                <input 
                  type="email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Contact Phone</label>
                <input 
                  type="tel"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Website</label>
                <input 
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-2">Registration Link</label>
                <input 
                  type="url"
                  name="registration_link"
                  value={formData.registration_link}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="https://"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4">
            <Link 
              to="/events"
              className="px-6 py-3 text-zinc-600 font-bold hover:text-zinc-900 transition-colors"
            >
              Cancel
            </Link>
            <button 
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Submit Event for Review
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

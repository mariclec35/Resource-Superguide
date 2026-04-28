import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, ExternalLink, Filter, MapPin, Phone, RefreshCcw, Search } from 'lucide-react';
import { useMeetings } from '../hooks/useMeetings';
import type { Meeting, MeetingFilters, SupportListItem } from '../types';
import AddToSupportListButton from '../components/AddToSupportListButton';

const DAY_OPTIONS = [
  { value: '', label: 'Any day' },
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const FORMAT_OPTIONS = ['Open', 'Closed', 'Women', 'Men', 'Spanish', 'Virtual', 'Beginners'];
const SUBTYPE_OPTIONS = ['', 'AA', 'NA'];
const PAGE_SIZE = 24;

function formatMeetingTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatDay(day: number) {
  return DAY_OPTIONS.find((option) => option.value === String(day))?.label || 'Unknown day';
}

function inferMeetingFormat(meeting: Meeting): string {
  if (meeting.details?.virtual) return 'online';
  const formats = (meeting.details?.formats || []).map((format) => format.toLowerCase());
  if (formats.some((format) => format.includes('hybrid'))) return 'hybrid';
  return 'in-person';
}

function toSupportListItem(meeting: Meeting): SupportListItem {
  return {
    id: `meeting-${meeting.meeting_id}`,
    sourceId: meeting.meeting_id,
    type: 'meeting',
    title: meeting.meeting_name,
    description: meeting.details?.notes || meeting.details?.tool_based_description || undefined,
    category: meeting.subtype || meeting.details?.fellowship || undefined,
    tags: meeting.details?.formats || [],
    address: meeting.address || undefined,
    locationName: meeting.location_name || undefined,
    phone: meeting.contact_info?.contact_phone || undefined,
    email: meeting.contact_info?.contact_email || undefined,
    website: meeting.contact_info?.website || undefined,
    date: formatDay(meeting.day),
    startTime: formatMeetingTime(meeting.time),
    recurrence: formatDay(meeting.day),
    format: inferMeetingFormat(meeting),
    addedAt: new Date().toISOString(),
  };
}

export default function FindMeetings() {
  const [searchText, setSearchText] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [selectedSubtype, setSelectedSubtype] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    document.title = 'Find Meetings | Twin Cities Recovery Hub';
    window.scrollTo(0, 0);
  }, []);

  const filters = useMemo<MeetingFilters>(() => ({
    searchText: searchText.trim() || undefined,
    day: selectedDay === '' ? undefined : Number(selectedDay),
    timeFrom: timeFrom || undefined,
    subtype: selectedSubtype || undefined,
    formats: selectedFormats.length ? selectedFormats : undefined,
  }), [searchText, selectedDay, timeFrom, selectedSubtype, selectedFormats]);

  const activeFilterCount = [
    filters.searchText,
    typeof filters.day === 'number' ? 'day' : undefined,
    filters.timeFrom,
    filters.subtype,
    filters.formats?.length ? 'formats' : undefined,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;
  const { meetings, isLoading, isValidating, error, refresh } = useMeetings(filters, hasActiveFilters);
  const visibleMeetings = meetings.slice(0, visibleCount);

  const toggleFormat = (format: string) => {
    setSelectedFormats((current) =>
      current.includes(format)
        ? current.filter((entry) => entry !== format)
        : [...current, format]
    );
  };

  const clearFilters = () => {
    setSearchText('');
    setSelectedDay('');
    setTimeFrom('');
    setSelectedSubtype('');
    setSelectedFormats([]);
    setVisibleCount(PAGE_SIZE);
  };

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchText, selectedDay, timeFrom, selectedSubtype, selectedFormats]);

  const badgeStyles = (subtype: string | null | undefined, pathwayType: string | null | undefined) => {
    if (subtype === 'SMART') {
      return {
        primary: 'bg-sky-50 text-sky-700',
        secondary: 'bg-sky-100/70 text-sky-700',
      };
    }
    if (subtype === 'All-Recovery') {
      return {
        primary: 'bg-violet-50 text-violet-700',
        secondary: 'bg-violet-100/70 text-violet-700',
      };
    }
    if (pathwayType === '12-Step') {
      return {
        primary: 'bg-emerald-50 text-emerald-700',
        secondary: 'bg-emerald-100/70 text-emerald-700',
      };
    }
    return {
      primary: 'bg-zinc-100 text-zinc-700',
      secondary: 'bg-zinc-100 text-zinc-600',
    };
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <section className="bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="bg-emerald-900 px-6 sm:px-8 py-8 sm:py-10 text-white">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-200 mb-3">Meetings</p>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Find recovery meetings across Minnesota</h1>
              <p className="text-emerald-100 text-base sm:text-lg max-w-2xl">
                Search synced AA and NA meeting lists by day, time, and format. Results update automatically when the meeting sync job refreshes records.
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_180px_170px_170px]">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Search</span>
                <div className="mt-2 relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Meeting name, church, club, or neighborhood"
                    className="w-full h-12 rounded-xl border border-zinc-200 bg-white pl-11 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Day</span>
                <select
                  value={selectedDay}
                  onChange={(event) => setSelectedDay(event.target.value)}
                  className="mt-2 w-full h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {DAY_OPTIONS.map((option) => (
                    <option key={option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Starts After</span>
                <input
                  type="time"
                  value={timeFrom}
                  onChange={(event) => setTimeFrom(event.target.value)}
                  className="mt-2 w-full h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">Pathway</span>
                <select
                  value={selectedSubtype}
                  onChange={(event) => setSelectedSubtype(event.target.value)}
                  className="mt-2 w-full h-12 rounded-xl border border-zinc-200 bg-white px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {SUBTYPE_OPTIONS.map((option) => (
                    <option key={option || 'all'} value={option}>
                      {option || 'Any pathway'}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 mr-2 text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
                <Filter className="w-3.5 h-3.5" />
                Format
              </div>
              {FORMAT_OPTIONS.map((format) => {
                const active = selectedFormats.includes(format);
                return (
                  <button
                    key={format}
                    type="button"
                    onClick={() => toggleFormat(format)}
                    className={`h-9 px-3 rounded-lg border text-sm font-semibold transition-colors ${
                      active
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    {format}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-5">
              <div className="text-sm text-zinc-500">
                {activeFilterCount > 0 ? `${activeFilterCount} active filters` : 'Add a search term or filter to begin'}
                {isValidating && !isLoading ? ' • refreshing' : ''}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => refresh()}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:border-zinc-300"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:border-zinc-300"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-zinc-900">{meetings.length} Meetings Found</h2>
              <p className="text-sm text-zinc-500 mt-1">
                Showing {Math.min(visibleCount, meetings.length)} right now so the page stays easier to scan.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-white border border-amber-200 rounded-2xl p-6 text-amber-900">
              <h3 className="text-lg font-bold mb-2">Meetings are not ready yet</h3>
              <p className="text-sm leading-6">
                The meetings table or sync feed may not be configured in this environment yet. Once the migration runs and the cron job syncs data, results will appear here.
              </p>
            </div>
          )}

          {!error && isLoading && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center text-zinc-500">
              Loading meetings...
            </div>
          )}

          {!error && !isLoading && meetings.length === 0 && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-8 text-center">
              {hasActiveFilters ? (
                <>
                  <h3 className="text-lg font-bold text-zinc-900 mb-2">No meetings match those filters yet</h3>
                  <p className="text-sm text-zinc-500 max-w-xl mx-auto leading-6">
                    Try a broader search or clear some filters. If you just configured meeting sync, this page will fill in after the first cron run finishes.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-zinc-900 mb-2">Start with a search or filter</h3>
                  <p className="text-sm text-zinc-500 max-w-xl mx-auto leading-6">
                    Use the search field, pick a day, or choose a format to load matching meetings.
                  </p>
                </>
              )}
            </div>
          )}

          {!error && !isLoading && meetings.length > 0 && (
            <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {visibleMeetings.map((meeting) => {
                const formats = Array.isArray(meeting.details?.formats) ? meeting.details.formats : [];
                const mapsQuery = meeting.address || meeting.location_name || meeting.meeting_name;
                const pathwayType = meeting.details?.pathway_type || null;
                const styles = badgeStyles(meeting.subtype, pathwayType);
                const supportListItem = toSupportListItem(meeting);

                return (
                  <article
                    key={meeting.meeting_id}
                    className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-5 sm:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${styles.primary}`}>
                            {meeting.subtype || meeting.details?.fellowship || 'Meeting'}
                          </span>
                          {pathwayType && (
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${styles.secondary}`}>
                              {pathwayType}
                            </span>
                          )}
                          {meeting.details?.virtual && (
                            <span className="inline-flex items-center rounded-full bg-sky-50 text-sky-700 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em]">
                              Virtual
                            </span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-zinc-900">{meeting.meeting_name}</h3>
                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-600">
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-zinc-400" />
                            {formatDay(meeting.day)}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <Clock3 className="w-4 h-4 text-zinc-400" />
                            {formatMeetingTime(meeting.time)}
                          </span>
                        </div>
                      </div>
                      {meeting.parent_org_slug && (
                        <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">
                          Linked to verified organization
                        </span>
                      )}
                    </div>

                    <div className="mt-5 space-y-3 text-sm text-zinc-600">
                      {meeting.location_name && (
                        <div className="flex items-start gap-3">
                          <MapPin className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                          <div>
                            <div className="font-semibold text-zinc-800">{meeting.location_name}</div>
                            {meeting.address && <div>{meeting.address}</div>}
                          </div>
                        </div>
                      )}

                      {meeting.details?.notes && (
                        <p className="leading-6">{meeting.details.notes}</p>
                      )}

                      {meeting.details?.tool_based_description && (
                        <p className="leading-6 text-sky-800 bg-sky-50 border border-sky-100 rounded-xl px-3 py-2">
                          {meeting.details.tool_based_description}
                        </p>
                      )}

                      {(meeting.contact_info?.contact_name || meeting.contact_info?.contact_phone) && (
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                          <div>
                            {meeting.contact_info?.contact_name && (
                              <div className="font-semibold text-zinc-800">{meeting.contact_info.contact_name}</div>
                            )}
                            {meeting.contact_info?.contact_phone && (
                              <div>{meeting.contact_info.contact_phone}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {formats.slice(0, 6).map((format) => (
                        <span
                          key={`${meeting.meeting_id}-${format}`}
                          className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700"
                        >
                          {format}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                      <div className="text-xs text-zinc-400">
                        Synced {new Date(meeting.last_sync).toLocaleString()}
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <AddToSupportListButton item={supportListItem} variant="compact" />
                        {mapsQuery && (
                          <a
                            href={`https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 hover:text-emerald-700"
                          >
                            Directions
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            {visibleCount < meetings.length && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
                  className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:border-zinc-300"
                >
                  Show {Math.min(PAGE_SIZE, meetings.length - visibleCount)} More
                </button>
              </div>
            )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

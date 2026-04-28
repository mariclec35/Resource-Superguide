import React, { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Link2, Loader2, RefreshCcw, ServerCrash } from 'lucide-react';

interface MeetingSyncSourceStatus {
  id: string;
  name: string;
  url: string;
  fellowship: string | null;
  count: number;
  latestError: string | null;
  latestErrorAt: string | null;
}

interface MeetingSyncStatus {
  totalMeetings: number;
  linkedMeetings: number;
  unlinkedMeetings: number;
  lastSync: string | null;
  sources: MeetingSyncSourceStatus[];
}

function StatCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm">
      <div className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">{label}</div>
      <div className="mt-3 text-3xl font-black tracking-tight text-zinc-900">{value}</div>
      <div className="mt-2 text-sm text-zinc-500">{helper}</div>
    </div>
  );
}

export default function AdminMeetingsManager() {
  const [status, setStatus] = useState<MeetingSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/meetings/sync-status');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load meeting sync status');
      }
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load meeting sync status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Meetings Sync</h2>
          <p className="text-sm text-zinc-500">Monitor TSML feeds, row counts, and resource-link coverage.</p>
        </div>
        <button
          onClick={() => void loadStatus()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-bold text-zinc-700 hover:border-zinc-300"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          Refresh Status
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 text-red-700">
          <div className="flex items-center gap-2 font-bold">
            <ServerCrash className="w-4 h-4" />
            Unable to load sync status
          </div>
          <p className="text-sm mt-2">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Meetings"
          value={status?.totalMeetings ?? 0}
          helper="Rows currently stored in Supabase."
        />
        <StatCard
          label="Linked"
          value={status?.linkedMeetings ?? 0}
          helper="Meetings matched to a verified resource org slug."
        />
        <StatCard
          label="Last Sync"
          value={status?.lastSync ? new Date(status.lastSync).toLocaleString() : 'Not synced'}
          helper="Most recent `last_sync` timestamp in the meetings table."
        />
      </div>

      <div className="bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-100">
          <h3 className="text-lg font-black text-zinc-900 tracking-tight">Configured Sources</h3>
          <p className="text-sm text-zinc-500 mt-1">Default TSML sources plus anything added through `TSML_SOURCES_JSON`.</p>
        </div>

        {loading && !status ? (
          <div className="p-10 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-zinc-300 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">Loading meeting source status...</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {(status?.sources || []).map((source) => (
              <div key={source.id} className="px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-black text-zinc-900">{source.name}</span>
                    {source.fellowship && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em]">
                        {source.fellowship}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-zinc-500 break-all">{source.url}</div>
                  {source.latestError && (
                    <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
                      <div className="text-xs font-black uppercase tracking-[0.18em] text-red-700">Latest sync error</div>
                      <div className="mt-1 text-sm text-red-700">{source.latestError}</div>
                      {source.latestErrorAt && (
                        <div className="mt-1 text-xs text-red-600">
                          {new Date(source.latestErrorAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-700">
                    <CalendarDays className="w-4 h-4 text-zinc-400" />
                    {source.count} stored
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border ${
                    source.latestError
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                    {source.latestError ? 'Needs attention' : 'Healthy'}
                  </div>
                  <div className="inline-flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-sm font-semibold text-zinc-700">
                    <Link2 className="w-4 h-4 text-zinc-400" />
                    {source.id}
                  </div>
                </div>
              </div>
            ))}
            {(status?.sources || []).length === 0 && (
              <div className="p-10 text-center text-sm text-zinc-500">
                No meeting sources are configured yet.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-zinc-900 text-zinc-100 rounded-3xl p-6 space-y-4">
        <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          Operational Notes
        </h3>
        <ul className="space-y-3 text-sm text-zinc-300">
          <li className="flex items-start gap-2">
            <Clock3 className="w-4 h-4 mt-0.5 text-zinc-500 shrink-0" />
            The Vercel cron route runs every 6 hours by default from the repo's `vercel.json` configuration.
          </li>
          <li className="flex items-start gap-2">
            <Link2 className="w-4 h-4 mt-0.5 text-zinc-500 shrink-0" />
            Location-to-resource linking is best-effort. Unlinked rows usually mean the meeting venue name does not closely match a resource name or alias yet.
          </li>
        </ul>
      </div>
    </div>
  );
}

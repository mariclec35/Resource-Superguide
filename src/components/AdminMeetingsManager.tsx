import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Link2,
  Loader2,
  Radio,
  RefreshCcw,
  ServerCrash,
  TrendingUp,
  Activity,
} from 'lucide-react';

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

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-black tracking-tight text-white">{value}</div>
        <div className="mt-1 text-sm font-semibold text-slate-300">{label}</div>
        <div className="mt-1 text-xs text-slate-500">{sub}</div>
      </div>
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

  const linkedPct =
    status && status.totalMeetings > 0
      ? Math.round((status.linkedMeetings / status.totalMeetings) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-3 text-red-700">
          <ServerCrash className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Unable to load sync status</div>
            <p className="text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Meetings"
          value={loading ? '—' : (status?.totalMeetings ?? 0).toLocaleString()}
          sub="Rows currently stored in Supabase."
          icon={CalendarDays}
          accent="bg-blue-500/15 text-blue-400"
        />
        <StatCard
          label="Linked Meetings"
          value={loading ? '—' : (status?.linkedMeetings ?? 0).toLocaleString()}
          sub="Meetings matched to a verified resource org slug."
          icon={Link2}
          accent="bg-emerald-500/15 text-emerald-400"
        />
        <StatCard
          label="Last Sync"
          value={loading ? '—' : status?.lastSync ? new Date(status.lastSync).toLocaleDateString() : 'Not synced'}
          sub={status?.lastSync ? new Date(status.lastSync).toLocaleTimeString() : 'Most recent last_sync timestamp.'}
          icon={Clock3}
          accent="bg-amber-500/15 text-amber-400"
        />
      </div>

      {!loading && status && status.totalMeetings > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-white">Resource Link Coverage</span>
            </div>
            <span className="text-sm font-black text-emerald-400">{linkedPct}%</span>
          </div>
          <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
              style={{ width: `${linkedPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2.5 text-xs">
            <span className="text-slate-400">{status.linkedMeetings.toLocaleString()} linked</span>
            <span className="text-slate-500">{status.unlinkedMeetings.toLocaleString()} unlinked</span>
          </div>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <Radio className="w-4 h-4 text-zinc-400" />
            <div>
              <h3 className="text-lg font-black text-zinc-900 tracking-tight">Configured Sources</h3>
              <p className="text-sm text-zinc-500 mt-1">Default meeting feeds plus anything added through `TSML_SOURCES_JSON`.</p>
            </div>
          </div>
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
                      : source.count === 0
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  }`}>
                    {source.latestError ? 'Needs attention' : source.count === 0 ? 'Waiting for data' : 'Healthy'}
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
          <Activity className="w-5 h-5 text-emerald-300" />
          Operational Notes
        </h3>
        <ul className="space-y-3 text-sm text-zinc-300">
          <li className="flex items-start gap-2">
            <Clock3 className="w-4 h-4 mt-0.5 text-zinc-500 shrink-0" />
            The Vercel cron route currently runs once daily at 6:00 UTC from the repo's `vercel.json` configuration.
          </li>
          <li className="flex items-start gap-2">
            <Link2 className="w-4 h-4 mt-0.5 text-zinc-500 shrink-0" />
            Location-to-resource linking is best-effort. Unlinked rows usually mean the meeting venue name does not closely match a resource name or alias yet.
          </li>
          <li className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-zinc-500 shrink-0" />
            A source with `0 stored` and no error usually means the feed answered successfully but produced no usable Minnesota rows after filtering or mapping.
          </li>
        </ul>
      </div>
    </div>
  );
}

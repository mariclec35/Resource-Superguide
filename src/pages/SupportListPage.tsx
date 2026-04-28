import React from 'react';
import { Link } from 'react-router-dom';
import { Clipboard, Download, Printer, Share2, Trash2, CalendarDays, MapPin, Phone, Globe, Clock3, FileText } from 'lucide-react';
import type { SupportListItem, SupportListItemType } from '../types';
import { useSupportList } from '../components/SupportListProvider';
import BrandLogo from '../components/BrandLogo';

const GROUP_ORDER: SupportListItemType[] = ['meeting', 'event', 'resource'];

const GROUP_LABELS: Record<SupportListItemType, string> = {
  meeting: 'Meetings',
  event: 'Events',
  resource: 'Resources',
};

const EMPTY_ACTIONS = [
  { label: 'Find Meetings', href: '/meetings' },
  { label: 'View Events', href: '/events' },
  { label: 'Browse Resources', href: '/' },
];

function buildShareText(items: SupportListItem[], preparedFor: string, preparedBy: string, preparedDate: string) {
  const lines = [
    'Recovery Hub Twin Cities Support List',
    'Connecting people to recovery in the Twin Cities',
    '',
    `Prepared for: ${preparedFor || '__________'}`,
    `Prepared by: ${preparedBy || '__________'}`,
    `Date: ${preparedDate || '__________'}`,
    '',
  ];

  GROUP_ORDER.forEach((type) => {
    const sectionItems = items.filter((item) => item.type === type);
    if (!sectionItems.length) return;

    lines.push(GROUP_LABELS[type].toUpperCase());

    sectionItems.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.title}`);
      if (item.category) lines.push(`   Category: ${item.category}`);
      if (item.date) lines.push(`   Date: ${item.date}`);
      if (item.startTime) lines.push(`   Time: ${item.startTime}${item.endTime ? ` - ${item.endTime}` : ''}`);
      if (item.recurrence) lines.push(`   Recurrence: ${item.recurrence}`);
      if (item.locationName) lines.push(`   Location: ${item.locationName}`);
      if (item.address) lines.push(`   Address: ${item.address}`);
      if (item.phone) lines.push(`   Phone: ${item.phone}`);
      if (item.website) lines.push(`   Website: ${item.website}`);
      if (item.notes) lines.push(`   Notes: ${item.notes}`);
      lines.push('');
    });
  });

  lines.push('This list is for informational and planning purposes only. If this is an emergency, call 911 or contact local crisis services.');

  return lines.join('\n');
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

interface SupportListSectionProps {
  type: SupportListItemType;
  items: SupportListItem[];
  onUpdateNotes: (sourceId: string, type: SupportListItemType, notes: string) => void;
  onRemove: (sourceId: string, type: SupportListItemType) => void;
}

const SupportListSection: React.FC<SupportListSectionProps> = ({
  type,
  items,
  onUpdateNotes,
  onRemove,
}) => {
  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-black tracking-tight text-zinc-900">{GROUP_LABELS[type]}</h2>
        <div className="h-px flex-1 bg-zinc-200" />
        <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{items.length} saved</span>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <article
            key={`${item.type}-${item.sourceId}`}
            className="support-list-item bg-white border border-zinc-200 rounded-2xl p-5 sm:p-6"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                    {GROUP_LABELS[type].slice(0, -1)}
                  </span>
                  {item.category && (
                    <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-zinc-600">
                      {item.category}
                    </span>
                  )}
                  {item.format && (
                    <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-700">
                      {item.format}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-bold text-zinc-900">{item.title}</h3>
                  {item.description && (
                    <p className="mt-2 text-sm leading-6 text-zinc-600 max-w-3xl">{item.description}</p>
                  )}
                </div>

                <div className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
                  {(item.date || item.recurrence) && (
                    <div className="inline-flex items-start gap-2">
                      <CalendarDays className="mt-0.5 w-4 h-4 text-zinc-400 shrink-0" />
                      <span>{item.date || item.recurrence}</span>
                    </div>
                  )}
                  {item.startTime && (
                    <div className="inline-flex items-start gap-2">
                      <Clock3 className="mt-0.5 w-4 h-4 text-zinc-400 shrink-0" />
                      <span>{item.startTime}{item.endTime ? ` - ${item.endTime}` : ''}</span>
                    </div>
                  )}
                  {(item.locationName || item.address) && (
                    <div className="inline-flex items-start gap-2 sm:col-span-2">
                      <MapPin className="mt-0.5 w-4 h-4 text-zinc-400 shrink-0" />
                      <span>{[item.locationName, item.address, item.city, item.region].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {item.phone && (
                    <div className="inline-flex items-start gap-2">
                      <Phone className="mt-0.5 w-4 h-4 text-zinc-400 shrink-0" />
                      <span>{item.phone}</span>
                    </div>
                  )}
                  {item.website && (
                    <div className="inline-flex items-start gap-2 sm:col-span-2">
                      <Globe className="mt-0.5 w-4 h-4 text-zinc-400 shrink-0" />
                      <a href={item.website} className="text-emerald-700 break-all">
                        {item.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onRemove(item.sourceId, item.type)}
                className="no-print inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 text-sm font-semibold text-zinc-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            </div>

            <div className="mt-5">
              <label className="block text-xs font-black uppercase tracking-[0.18em] text-zinc-500 mb-2">
                Notes
              </label>
              <textarea
                value={item.notes || ''}
                onChange={(event) => onUpdateNotes(item.sourceId, item.type, event.target.value)}
                placeholder="Add context for yourself or the person you are supporting."
                className="w-full min-h-24 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default function SupportListPage() {
  const { items, clearList, getItemsByType, removeItem, updateItemNotes } = useSupportList();
  const [preparedFor, setPreparedFor] = React.useState('');
  const [preparedBy, setPreparedBy] = React.useState('');
  const [preparedDate, setPreparedDate] = React.useState(new Date().toLocaleDateString());

  React.useEffect(() => {
    document.title = 'Support List | Twin Cities Recovery Hub';
    window.scrollTo(0, 0);
  }, []);

  const shareText = React.useMemo(
    () => buildShareText(items, preparedFor, preparedBy, preparedDate),
    [items, preparedDate, preparedBy, preparedFor]
  );

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Recovery Hub Twin Cities Support List',
          text: shareText,
        });
        return;
      }

      await navigator.clipboard.writeText(shareText);
      window.alert('Support list copied to your clipboard.');
    } catch (error) {
      console.error('Unable to share support list', error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-10 px-4 sm:px-6 lg:px-8">
      <style>{`
        @media print {
          nav,
          footer,
          .no-print,
          button {
            display: none !important;
          }

          body {
            background: white !important;
            color: black !important;
            font-size: 12pt;
          }

          .print-page {
            max-width: 100%;
            margin: 0;
            padding: 0;
          }

          .support-list-item {
            break-inside: avoid;
            page-break-inside: avoid;
            border: 1px solid #d4d4d8 !important;
            box-shadow: none !important;
          }

          a {
            color: black !important;
            text-decoration: none !important;
          }
        }
      `}</style>

      <div className="print-page max-w-6xl mx-auto space-y-8">
        <section className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4 mb-5">
                <BrandLogo variant="compact" imageClassName="h-12 w-auto object-contain" />
                <div className="h-10 w-px bg-zinc-200" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-zinc-400">Support List</p>
                  <p className="text-sm text-zinc-500">Connecting people to recovery in the Twin Cities</p>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 mb-3">Build a Support List</h1>
              <p className="text-base sm:text-lg text-zinc-600 leading-7">
                Create a personalized list with meetings, events, and recovery resources. Print, share, or download it for yourself, a client, or someone you support.
              </p>
            </div>

            <div className="no-print flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                type="button"
                onClick={() => downloadTextFile('recoveryhub-support-list.txt', shareText)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:border-zinc-300"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:border-zinc-300"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={clearList}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear List
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Prepared for</span>
              <input
                value={preparedFor}
                onChange={(event) => setPreparedFor(event.target.value)}
                className="mt-2 w-full h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Prepared by</span>
              <input
                value={preparedBy}
                onChange={(event) => setPreparedBy(event.target.value)}
                className="mt-2 w-full h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Date</span>
              <input
                value={preparedDate}
                onChange={(event) => setPreparedDate(event.target.value)}
                className="mt-2 w-full h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </label>
          </div>
        </section>

        {items.length === 0 ? (
          <section className="bg-white border border-zinc-200 rounded-3xl p-10 sm:p-12 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
              <Clipboard className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-900 mb-2">Your support list is empty</h2>
            <p className="text-zinc-500 max-w-xl mx-auto leading-7 mb-8">
              Add meetings, events, and resources while browsing Recovery Hub Twin Cities. This list is for informational and planning purposes only. If this is an emergency, call 911 or contact local crisis services.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              {EMPTY_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  to={action.href}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 text-sm font-semibold text-zinc-700 hover:border-zinc-300"
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <div className="space-y-8">
            {GROUP_ORDER.map((type) => (
              <SupportListSection
                key={type}
                type={type}
                items={getItemsByType(type)}
                onUpdateNotes={updateItemNotes}
                onRemove={removeItem}
              />
            ))}

            <section className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <p className="text-sm leading-6 text-emerald-900">
                  This list is for informational and planning purposes only. If this is an emergency, call 911 or contact local crisis services.
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

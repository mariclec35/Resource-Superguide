import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Globe, Phone, Info, CheckCircle2, AlertTriangle, ExternalLink, Sparkles } from 'lucide-react';
import { Resource } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ResourceCardProps {
  key?: React.Key;
  resource: Resource;
  inGuide?: boolean;
  onToggleGuide?: (id: string) => void;
}

export default function ResourceCard({ resource, inGuide, onToggleGuide }: ResourceCardProps) {
  const matchReasons = (resource as any).matchReasons as string[] | undefined;

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full group">
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start gap-4 mb-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-600">
            {resource.category}
          </span>
          <div className="flex items-center gap-2">
            {resource.average_rating && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold">
                <CheckCircle2 className="w-3 h-3" />
                {resource.average_rating.toFixed(1)} ({resource.review_count || 0})
              </div>
            )}
            {resource.status === 'needs_verification' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600">
                <AlertTriangle className="w-3 h-3" />
                Verify
              </span>
            )}
          </div>
        </div>

        <Link to={`/resource/${resource.id}`} className="block">
          <h3 className="text-lg font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors mb-2">
            {resource.name}
          </h3>
        </Link>
        
        <div className="space-y-2.5 mb-4">
          <div className="flex items-start gap-2 text-sm text-zinc-600">
            <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <span className="truncate">{resource.city ? `${resource.city}, ` : ''}{resource.address || 'No address listed'}</span>
          </div>
        </div>

        {matchReasons && matchReasons.length > 0 && (
          <div className="mb-4 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              Why it matches
            </p>
            <ul className="space-y-1">
              {matchReasons.slice(0, 2).map((reason, i) => (
                <li key={i} className="text-xs text-emerald-800 flex items-start gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {resource.provides && (
          <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed">
            {resource.provides}
          </p>
        )}
      </div>

      <div className="px-5 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-3">
        <Link
          to={`/resource/${resource.id}`}
          className="text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 flex items-center gap-1.5 transition-colors"
        >
          Details
          <Info className="w-3.5 h-3.5" />
        </Link>
        
        {onToggleGuide && (
          <button
            onClick={() => onToggleGuide(resource.id)}
            className={cn(
              "text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center gap-2",
              inGuide 
                ? "bg-zinc-900 text-white shadow-sm" 
                : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900"
            )}
          >
            {inGuide ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Saved
              </>
            ) : (
              "+ My List"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

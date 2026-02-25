import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Bus, Footprints as Walk, Info, CheckCircle2, AlertTriangle } from 'lucide-react';
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
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start gap-4 mb-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            {resource.category}
          </span>
          {resource.status === 'needs_verification' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
              <AlertTriangle className="w-3 h-3" />
              Needs Verification
            </span>
          )}
        </div>

        <Link to={`/resource/${resource.id}`} className="block group">
          <h3 className="text-lg font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors mb-1">
            {resource.name}
          </h3>
        </Link>
        
        <p className="text-sm text-zinc-500 mb-4 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {resource.city_direction}
        </p>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Bus className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="truncate">{resource.transit_accessibility}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-zinc-600">
            <Walk className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>{resource.walkability}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {resource.recovery_stage.map((stage) => (
            <span key={stage} className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
              {stage}
            </span>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between gap-3">
        <Link
          to={`/resource/${resource.id}`}
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          View Details
          <Info className="w-4 h-4" />
        </Link>
        
        {onToggleGuide && (
          <button
            onClick={() => onToggleGuide(resource.id)}
            className={cn(
              "text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
              inGuide 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "bg-white border border-zinc-200 text-zinc-600 hover:border-emerald-500 hover:text-emerald-600"
            )}
          >
            {inGuide ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                In Guide
              </>
            ) : (
              "+ Add to Guide"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Globe, Phone, Info, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
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
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-600">
            {resource.category}
          </span>
          {resource.status === 'needs_verification' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              Verify
            </span>
          )}
        </div>

        <Link to={`/resource/${resource.id}`} className="block group">
          <h3 className="text-lg font-bold text-zinc-900 group-hover:text-emerald-600 transition-colors mb-2">
            {resource.name}
          </h3>
        </Link>
        
        <div className="space-y-2.5 mb-4">
          <div className="flex items-start gap-2 text-sm text-zinc-600">
            <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <span>{resource.address || 'No address listed'}</span>
          </div>
          
          {resource.phone && (
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
              <a href={`tel:${resource.phone}`} className="hover:text-emerald-600 transition-colors">{resource.phone}</a>
            </div>
          )}

          {resource.website && (
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <Globe className="w-4 h-4 text-zinc-400 shrink-0" />
              <a 
                href={resource.website.startsWith('http') ? resource.website : `https://${resource.website}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-emerald-600 transition-colors truncate flex items-center gap-1"
              >
                Website
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {resource.description && (
          <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed italic">
            "{resource.description}"
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

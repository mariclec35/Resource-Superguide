import React from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import type { SupportListItem } from '../types';
import { useSupportList } from './SupportListProvider';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AddToSupportListButton({
  item,
  variant = 'default',
}: {
  item: SupportListItem;
  variant?: 'default' | 'compact' | 'icon';
}) {
  const { addItem, removeItem, isAdded } = useSupportList();
  const added = isAdded(item.sourceId, item.type);

  const toggleItem = () => {
    if (added) {
      removeItem(item.sourceId, item.type);
      return;
    }

    addItem(item);
  };

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleItem}
        aria-pressed={added}
        aria-label={added ? `Remove ${item.title} from support list` : `Add ${item.title} to support list`}
        className={cn(
          'inline-flex h-10 w-10 items-center justify-center rounded-lg border transition-colors',
          added
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900'
        )}
      >
        {added ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleItem}
      aria-pressed={added}
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition-all',
        variant === 'compact' ? 'py-2.5' : 'py-3',
        added
          ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
          : 'bg-white border border-zinc-200 text-zinc-700 hover:border-zinc-900 hover:text-zinc-900'
      )}
    >
      {added ? (
        <>
          <CheckCircle2 className="w-4 h-4" />
          Added
        </>
      ) : (
        <>
          <Plus className="w-4 h-4" />
          Add to Support List
        </>
      )}
    </button>
  );
}


import React from 'react';
import type { Note } from '../types';
import { Type, Clock, Calendar, ShieldCheck } from 'lucide-react';

interface StatsBarProps {
  note: Note | null;
  saveStatus: 'saved' | 'saving';
}

export const StatsBar: React.FC<StatsBarProps> = ({ note, saveStatus }) => {
  if (!note) return null;

  const words = note.wordCount || 0;
  const chars = note.characterCount || 0;
  const readingMinutes = Math.max(1, Math.ceil(words / 200));

  return (
    <footer className="h-7 border-t border-neutral-900 bg-neutral-950 px-4 flex items-center justify-between text-[11px] font-mono text-neutral-500 select-none">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-neutral-400">
          <Type className="h-3 w-3 text-neutral-500" />
          <span>{words.toLocaleString()} words</span>
        </span>
        <span className="hidden sm:inline-block">•</span>
        <span className="hidden sm:flex items-center gap-1.5">
          <span>{chars.toLocaleString()} chars</span>
        </span>
        <span className="hidden md:inline-block">•</span>
        <span className="hidden md:flex items-center gap-1.5 text-neutral-400">
          <Clock className="h-3 w-3 text-neutral-500" />
          <span>~{readingMinutes} min read</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {note.inUniverseDate && (
          <span className="hidden lg:flex items-center gap-1.5 text-neutral-400 bg-neutral-900/80 px-2 py-0.5 rounded border border-neutral-800">
            <Calendar className="h-2.5 w-2.5 text-neutral-500" />
            <span className="truncate max-w-[150px]">{note.inUniverseDate}</span>
          </span>
        )}

        <span className="flex items-center gap-1.5 text-neutral-400" title="Keystroke Fail-Safe Engine">
          <ShieldCheck className="h-3 w-3 text-emerald-500" />
          <span className="text-[10px] uppercase tracking-wider text-neutral-500">
            {saveStatus === 'saved' ? 'Zero-Loss Protected' : 'Syncing...'}
          </span>
        </span>
      </div>
    </footer>
  );
};

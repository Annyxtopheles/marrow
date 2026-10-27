import React from 'react';
import type { Note } from '../types';
import { Type, Clock, Calendar, ShieldCheck } from 'lucide-react';

interface StatsBarProps {
  note: Note | null;
  saveStatus: 'saved' | 'saving';
  isLightMode: boolean;
}

export const StatsBar: React.FC<StatsBarProps> = ({ note, saveStatus, isLightMode }) => {
  if (!note) return null;

  const words = note.wordCount || 0;
  const chars = note.characterCount || 0;
  const readingMinutes = Math.max(1, Math.ceil(words / 200));

  const border = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.06]';
  const bg = isLightMode ? 'bg-[#f4f1ea]' : 'bg-[#131416]';
  const textMuted = isLightMode ? 'text-[#857f77]' : 'text-[#84817d]';

  return (
    <footer
      className={`h-7 border-t ${border} ${bg} px-4 flex items-center justify-between text-[11px] ${textMuted} select-none`}
    >
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5">
          <Type className="h-3 w-3 opacity-60" />
          <span>{words.toLocaleString()} words</span>
        </span>
        <span className="hidden sm:inline-block opacity-40">•</span>
        <span className="hidden sm:flex items-center gap-1.5 opacity-80">
          <span>{chars.toLocaleString()} chars</span>
        </span>
        <span className="hidden md:inline-block opacity-40">•</span>
        <span className="hidden md:flex items-center gap-1.5">
          <Clock className="h-3 w-3 opacity-60" />
          <span>~{readingMinutes} min read</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        {note.inUniverseDate && (
          <span
            className={`hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[10px] ${
              isLightMode
                ? 'bg-black/[0.02] border-black/[0.06] text-[#6c6760]'
                : 'bg-white/[0.02] border-white/[0.06] text-[#9a968f]'
            }`}
          >
            <Calendar className="h-2.5 w-2.5 opacity-60" />
            <span className="truncate max-w-[140px]">{note.inUniverseDate}</span>
          </span>
        )}

        <span className="flex items-center gap-1.5" title="Fail-Safe Continuous Protection">
          <ShieldCheck className="h-3 w-3 opacity-75" />
          <span className="text-[10px] uppercase tracking-wider opacity-60">
            {saveStatus === 'saved' ? 'Protected' : 'Syncing'}
          </span>
        </span>
      </div>
    </footer>
  );
};

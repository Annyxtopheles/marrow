import React, { useState } from 'react';
import {
  Maximize2,
  Minimize2,
  ShieldCheck,
  Target,
} from 'lucide-react';
import type { Note, EditorSettings } from '../types';
import { WordGoalModal } from './WordGoalModal';

interface AccessoryBarProps {
  note: Note;
  settings: EditorSettings;
  dailyWordsWritten: number;
  onUpdateNote: (updated: Note) => void;
  onUpdateSettings: (settings: EditorSettings) => void;
  onResetDailyWords: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  saveStatus: 'saved' | 'saving';
  isLightMode: boolean;
}

export const AccessoryBar: React.FC<AccessoryBarProps> = ({
  note,
  settings,
  dailyWordsWritten,
  onUpdateNote,
  onUpdateSettings,
  onResetDailyWords,
  focusMode,
  onToggleFocus,
  saveStatus,
  isLightMode,
}) => {
  const [showGoalModal, setShowGoalModal] = useState(false);

  const barBg = isLightMode
    ? 'border-[#e4e0d7] bg-[#f7f5f0]/90 text-[#6c6760]'
    : 'border-white/[0.06] bg-[#16171a]/90 text-[#9a968f]';

  const btnHover = isLightMode
    ? 'hover:bg-black/[0.05] hover:text-[#222]'
    : 'hover:bg-white/[0.06] hover:text-[#eee]';

  const words = note.wordCount || 0;
  const chars = note.characterCount || 0;
  const readingMinutes = Math.max(1, Math.ceil(words / 200));

  const chapterGoal = note.targetWordCount || 0;
  const dailyGoal = settings.dailyWordGoal || 1000;
  const activeGoalView = settings.activeGoalView || 'chapter';

  const chapterPercent =
    chapterGoal > 0 ? Math.min(100, Math.round((words / chapterGoal) * 100)) : 0;
  const dailyPercent =
    dailyGoal > 0 ? Math.min(100, Math.round((dailyWordsWritten / dailyGoal) * 100)) : 0;

  const isGoalReached =
    activeGoalView === 'chapter'
      ? chapterGoal > 0 && words >= chapterGoal
      : dailyWordsWritten >= dailyGoal;

  return (
    <div
      className={`sticky bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t ${barBg} backdrop-blur-md px-4 py-1.5 text-xs select-none transition-colors duration-200`}
    >
      {/* Left side: Zen Focus Mode Toggle */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleFocus}
          className={`rounded-md p-1.5 transition ${btnHover}`}
          title={focusMode ? 'Exit Zen Mode' : 'Zen Focus Mode'}
        >
          {focusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Live Document Statistics, Goal Status & Protection Status */}
      <div className="flex items-center gap-2.5 pl-3 shrink-0 text-[11px] text-inherit">
        <span className="flex items-center gap-1.5 font-medium">
          <span>{words.toLocaleString()} words</span>
        </span>

        {/* Word Count Goal Pill */}
        <button
          type="button"
          onClick={() => setShowGoalModal(true)}
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium transition cursor-pointer ${
            isGoalReached
              ? isLightMode
                ? 'bg-black/[0.08] border-black/25 text-[#151618] font-semibold hover:bg-black/12'
                : 'bg-white/[0.12] border-white/30 text-[#f4f1ea] font-semibold hover:bg-white/16'
              : isLightMode
              ? 'bg-black/[0.03] border-black/[0.08] hover:bg-black/[0.06] text-[#444]'
              : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] text-[#dedad4]'
          }`}
          title="Click to view and configure Word Count Goals"
        >
          <Target className={`h-3 w-3 ${isGoalReached ? 'opacity-90' : 'opacity-60'}`} />
          <span>
            {activeGoalView === 'chapter'
              ? chapterGoal > 0
                ? `${words.toLocaleString()} / ${chapterGoal.toLocaleString()} (${chapterPercent}%)`
                : 'Set Goal'
              : `${dailyWordsWritten.toLocaleString()} / ${dailyGoal.toLocaleString()} today (${dailyPercent}%)`}
          </span>
        </button>

        <span className="hidden md:inline-block opacity-40">•</span>
        <span className="hidden md:inline opacity-75">
          <span>{chars.toLocaleString()} chars</span>
        </span>
        <span className="hidden lg:inline-block opacity-40">•</span>
        <span className="hidden lg:inline opacity-75">
          <span>~{readingMinutes} min read</span>
        </span>

        <span className="opacity-40">•</span>

        <span className="flex items-center gap-1.5" title="Fail-Safe Continuous Protection">
          <ShieldCheck className="h-3.5 w-3.5 opacity-75" />
          <span className="text-[10px] uppercase tracking-wider opacity-75">
            {saveStatus === 'saved' ? 'Protected' : 'Syncing'}
          </span>
        </span>
      </div>

      {showGoalModal && (
        <WordGoalModal
          note={note}
          settings={settings}
          dailyWordsWritten={dailyWordsWritten}
          onUpdateNote={onUpdateNote}
          onUpdateSettings={onUpdateSettings}
          onResetDailyWords={onResetDailyWords}
          onClose={() => setShowGoalModal(false)}
          isLightMode={isLightMode}
        />
      )}
    </div>
  );
};

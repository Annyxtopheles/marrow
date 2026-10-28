import React, { useState } from 'react';
import {
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
  saveStatus: 'saved' | 'saving';
  isTyping?: boolean;
  isLightMode: boolean;
  focusMode?: boolean;
  onToggleFocus?: () => void;
}

export const AccessoryBar: React.FC<AccessoryBarProps> = ({
  note,
  settings,
  dailyWordsWritten,
  onUpdateNote,
  onUpdateSettings,
  onResetDailyWords,
  saveStatus,
  isTyping = false,
  isLightMode,
}) => {
  const [showGoalModal, setShowGoalModal] = useState(false);

  const barBg = isLightMode
    ? settings.theme === 'sakura'
      ? 'border-[#e5e7eb] bg-[#fafafc]/95 text-[#52525b]'
      : settings.theme === 'sepia'
      ? 'border-[#e7ddce] bg-[#f5eedd]/95 text-[#635141]'
      : settings.theme === 'dreamscape'
      ? 'border-black/[0.06] bg-white/50 backdrop-blur-xl text-[#524e68]'
      : 'border-[#e4e0d7] bg-[#f7f5f0]/90 text-[#6c6760]'
    : settings.theme === 'nordic'
    ? 'border-sky-500/15 bg-[#111722]/95 text-[#94a3b8]'
    : settings.theme === 'evergreen'
    ? 'border-emerald-500/15 bg-[#0f1a14]/95 text-[#86a793]'
    : settings.theme === 'grunge'
    ? 'border-white/[0.12] bg-[#0d0d0f] text-[#a8a7a0]'
    : 'border-white/[0.06] bg-[#16171a]/90 text-[#9a968f]';

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

  const shouldFade = isTyping && (settings.activeTypingFade ?? true);

  return (
    <div
      className={`sticky bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t ${barBg} backdrop-blur-md px-4 py-1.5 text-xs select-none transition-all duration-300 ease-in-out ${
        shouldFade
          ? 'opacity-0 pointer-events-none translate-y-1.5'
          : 'opacity-100 translate-y-0'
      }`}
    >
      {/* Live Document Statistics, Goal Status */}
      <div className="flex items-center gap-2.5 text-[11px] text-inherit">
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

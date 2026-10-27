import React, { useState } from 'react';
import { Target, X, CheckCircle2, Calendar, BookOpen, RotateCcw } from 'lucide-react';
import type { Note, EditorSettings } from '../types';

interface WordGoalModalProps {
  note: Note;
  settings: EditorSettings;
  dailyWordsWritten: number;
  onUpdateNote: (updated: Note) => void;
  onUpdateSettings: (settings: EditorSettings) => void;
  onResetDailyWords: () => void;
  onClose: () => void;
  isLightMode: boolean;
}

export const WordGoalModal: React.FC<WordGoalModalProps> = ({
  note,
  settings,
  dailyWordsWritten,
  onUpdateNote,
  onUpdateSettings,
  onResetDailyWords,
  onClose,
  isLightMode,
}) => {
  const [activeTab, setActiveTab] = useState<'chapter' | 'daily'>(
    settings.activeGoalView || 'chapter'
  );

  const [chapterTargetInput, setChapterTargetInput] = useState<string>(
    note.targetWordCount ? String(note.targetWordCount) : ''
  );
  const [dailyTargetInput, setDailyTargetInput] = useState<string>(
    String(settings.dailyWordGoal || 1000)
  );

  const currentWords = note.wordCount || 0;
  const chapterGoalNum = parseInt(chapterTargetInput, 10) || 0;
  const dailyGoalNum = parseInt(dailyTargetInput, 10) || 1000;

  const chapterPercent =
    chapterGoalNum > 0 ? Math.min(100, Math.round((currentWords / chapterGoalNum) * 100)) : 0;
  const dailyPercent =
    dailyGoalNum > 0 ? Math.min(100, Math.round((dailyWordsWritten / dailyGoalNum) * 100)) : 0;

  const handleApplyChapterGoal = (num: number) => {
    setChapterTargetInput(num > 0 ? String(num) : '');
    onUpdateNote({
      ...note,
      targetWordCount: num > 0 ? num : undefined,
      updatedAt: Date.now(),
    });
  };

  const handleApplyDailyGoal = (num: number) => {
    const val = Math.max(100, num);
    setDailyTargetInput(String(val));
    onUpdateSettings({
      ...settings,
      dailyWordGoal: val,
    });
  };

  const handleSwitchDisplayView = (view: 'chapter' | 'daily') => {
    onUpdateSettings({
      ...settings,
      activeGoalView: view,
    });
  };

  const modalBg = isLightMode
    ? 'bg-[#f7f5f0] border-[#e4e0d7] text-[#2c2a27]'
    : 'bg-[#18191c] border-white/[0.08] text-[#dedad4]';

  const cardBg = isLightMode
    ? 'bg-black/[0.02] border-black/[0.07]'
    : 'bg-white/[0.03] border-white/[0.07]';

  const btnActive = isLightMode
    ? 'bg-black text-white'
    : 'bg-white text-black font-medium';

  const btnSecondary = isLightMode
    ? 'bg-black/[0.04] hover:bg-black/[0.08] text-[#333] border-black/[0.07]'
    : 'bg-white/[0.05] hover:bg-white/[0.1] text-[#ddd] border-white/[0.07]';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all ${modalBg}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-inherit/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight">Word Count Goals</h3>
              <p className="text-[11px] opacity-60">Set pace and target metrics for your writing session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md opacity-60 hover:opacity-100 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 p-1 my-4 rounded-lg bg-inherit border border-inherit/10 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('chapter')}
            className={`flex items-center justify-center gap-2 py-1.5 rounded-md transition ${
              activeTab === 'chapter' ? btnActive : 'opacity-70 hover:opacity-100'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Chapter Goal</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`flex items-center justify-center gap-2 py-1.5 rounded-md transition ${
              activeTab === 'daily' ? btnActive : 'opacity-70 hover:opacity-100'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Daily Goal</span>
          </button>
        </div>

        {/* Tab 1: Chapter Goal */}
        {activeTab === 'chapter' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${cardBg} space-y-3`}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-inherit">Current Document Progress</span>
                <span className="font-mono text-sm font-semibold">
                  {currentWords.toLocaleString()}{' '}
                  <span className="text-[11px] font-normal opacity-60">
                    / {chapterGoalNum > 0 ? chapterGoalNum.toLocaleString() : '—'} words
                  </span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div
                  className={`h-2 w-full rounded-full overflow-hidden ${
                    isLightMode ? 'bg-black/10' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      chapterPercent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${chapterPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] opacity-70">
                  <span>
                    {chapterGoalNum > 0
                      ? currentWords >= chapterGoalNum
                        ? '🎉 Chapter target reached!'
                        : `${(chapterGoalNum - currentWords).toLocaleString()} words remaining`
                      : 'No target set for this chapter'}
                  </span>
                  <span className="font-medium">{chapterPercent}%</span>
                </div>
              </div>

              {/* Custom Input */}
              <div className="pt-1">
                <label className="text-[11px] font-medium opacity-70 block mb-1.5">
                  Target Word Count for "{note.title || 'Untitled'}":
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="e.g. 2000"
                    value={chapterTargetInput}
                    onChange={(e) => {
                      setChapterTargetInput(e.target.value);
                      const num = parseInt(e.target.value, 10);
                      onUpdateNote({
                        ...note,
                        targetWordCount: num > 0 ? num : undefined,
                        updatedAt: Date.now(),
                      });
                    }}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-mono border focus:outline-none ${
                      isLightMode
                        ? 'bg-white border-black/20 text-[#2c2a27]'
                        : 'bg-black/40 border-white/20 text-[#dedad4]'
                    }`}
                  />
                  {chapterGoalNum > 0 && (
                    <button
                      type="button"
                      onClick={() => handleApplyChapterGoal(0)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs transition ${btnSecondary}`}
                      title="Clear chapter goal"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider opacity-50 mr-1">Presets:</span>
                {[1000, 1500, 2000, 3000, 5000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleApplyChapterGoal(preset)}
                    className={`px-2 py-0.5 rounded-md text-[11px] border transition ${
                      chapterGoalNum === preset ? btnActive : btnSecondary
                    }`}
                  >
                    {preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Daily Goal */}
        {activeTab === 'daily' && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border ${cardBg} space-y-3`}>
              <div className="flex items-baseline justify-between text-xs">
                <span className="font-medium text-inherit">Words Written Today</span>
                <span className="font-mono text-sm font-semibold">
                  {dailyWordsWritten.toLocaleString()}{' '}
                  <span className="text-[11px] font-normal opacity-60">
                    / {dailyGoalNum.toLocaleString()} words
                  </span>
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div
                  className={`h-2 w-full rounded-full overflow-hidden ${
                    isLightMode ? 'bg-black/10' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      dailyPercent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${dailyPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] opacity-70">
                  <span>
                    {dailyWordsWritten >= dailyGoalNum
                      ? '🎉 Daily goal achieved!'
                      : `${Math.max(0, dailyGoalNum - dailyWordsWritten).toLocaleString()} words remaining today`}
                  </span>
                  <span className="font-medium">{dailyPercent}%</span>
                </div>
              </div>

              {/* Custom Input */}
              <div className="pt-1">
                <label className="text-[11px] font-medium opacity-70 block mb-1.5">
                  Daily Writing Target (all documents):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="100"
                    step="100"
                    placeholder="e.g. 1000"
                    value={dailyTargetInput}
                    onChange={(e) => {
                      setDailyTargetInput(e.target.value);
                      const num = parseInt(e.target.value, 10);
                      if (num > 0) {
                        onUpdateSettings({
                          ...settings,
                          dailyWordGoal: num,
                        });
                      }
                    }}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-mono border focus:outline-none ${
                      isLightMode
                        ? 'bg-white border-black/20 text-[#2c2a27]'
                        : 'bg-black/40 border-white/20 text-[#dedad4]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={onResetDailyWords}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition ${btnSecondary}`}
                    title="Reset today's counter to 0"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[10px] uppercase tracking-wider opacity-50 mr-1">Presets:</span>
                {[500, 1000, 1667, 2500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleApplyDailyGoal(preset)}
                    className={`px-2 py-0.5 rounded-md text-[11px] border transition ${
                      dailyGoalNum === preset ? btnActive : btnSecondary
                    }`}
                  >
                    {preset === 1667 ? '1,667 (NaNoWriMo)' : preset.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Display Preference in Stats Bar */}
        <div className="mt-4 pt-3 border-t border-inherit/10 flex items-center justify-between text-xs">
          <span className="text-[11px] opacity-75">Display in Bottom Stats Bar:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSwitchDisplayView('chapter')}
              className={`px-2 py-1 rounded-md text-[11px] border transition ${
                (settings.activeGoalView || 'chapter') === 'chapter' ? btnActive : btnSecondary
              }`}
            >
              Chapter Goal
            </button>
            <button
              type="button"
              onClick={() => handleSwitchDisplayView('daily')}
              className={`px-2 py-1 rounded-md text-[11px] border transition ${
                settings.activeGoalView === 'daily' ? btnActive : btnSecondary
              }`}
            >
              Daily Goal
            </button>
          </div>
        </div>

        {/* Footer Done Button */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium transition ${btnActive}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
};

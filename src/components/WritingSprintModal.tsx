import React, { useState, useEffect } from 'react';
import type { Note, WritingSprint } from '../types';
import { X, Flame, Play, Square, Award } from 'lucide-react';
import { TypewriterAudio } from '../services/audio';

export interface WritingSprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeNote: Note | null;
  onUpdateNote: (updated: Note) => void;
  sprint: WritingSprint;
  onUpdateSprint: (sprint: WritingSprint) => void;
  isLightMode: boolean;
  accentColor: string;
  accentContrast: string;
}

export const WritingSprintModal: React.FC<WritingSprintModalProps> = ({
  isOpen,
  onClose,
  activeNote,
  onUpdateNote,
  sprint,
  onUpdateSprint,
  isLightMode,
  accentColor,
  accentContrast,
}) => {
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [targetWordCount, setTargetWordCount] = useState(300);

  // Compute live sprint stats
  const currentWordCount = activeNote?.wordCount || 0;
  const wordsWrittenInSprint = Math.max(0, currentWordCount - sprint.startWordCount);

  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (!sprint.active) return;

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - sprint.startTime;
      const totalMs = sprint.durationMinutes * 60 * 1000;
      const remainingSec = Math.max(0, Math.ceil((totalMs - elapsedMs) / 1000));

      setSecondsRemaining(remainingSec);

      if (remainingSec <= 0) {
        clearInterval(interval);
        // Complete sprint
        TypewriterAudio.playKey('Enter');
        const finalWords = Math.max(0, (activeNote?.wordCount || 0) - sprint.startWordCount);
        const wpm = Math.round(finalWords / Math.max(1, sprint.durationMinutes));

        if (activeNote) {
          const newLog = {
            id: `tl-sprint-${Date.now()}`,
            timestamp: Date.now(),
            note: `Sprint Completed: ${finalWords} words written in ${sprint.durationMinutes} min (~${wpm} WPM).`,
            type: 'sprint' as const,
            wordCountSnapshot: activeNote.wordCount,
          };
          onUpdateNote({
            ...activeNote,
            timelineLog: [newLog, ...(activeNote.timelineLog || [])],
          });
        }

        onUpdateSprint({
          ...sprint,
          active: false,
        });
      }
    }, 500);

    return () => clearInterval(interval);
  }, [sprint, activeNote, onUpdateNote, onUpdateSprint]);

  if (!isOpen && !sprint.active) return null;

  const handleStart = () => {
    onUpdateSprint({
      active: true,
      startTime: Date.now(),
      durationMinutes: selectedDuration,
      startWordCount: currentWordCount,
      targetWords: targetWordCount,
    });
    setSecondsRemaining(selectedDuration * 60);
    onClose();
  };

  const handleCancel = () => {
    onUpdateSprint({
      ...sprint,
      active: false,
    });
    onClose();
  };

  const border = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.08]';
  const modalBg = isLightMode ? 'bg-[#f7f5f0] text-[#2c2a27]' : 'bg-[#18191c] text-[#dedad4]';
  const cardBg = isLightMode
    ? 'bg-black/[0.02] border-black/[0.06]'
    : 'bg-white/[0.02] border-white/[0.06]';

  // If sprint is active and modal was closed: render minimal floating HUD
  if (sprint.active && !isOpen) {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const progressPct = Math.min(
      100,
      Math.round((wordsWrittenInSprint / Math.max(1, sprint.targetWords)) * 100)
    );

    return (
      <div
        onClick={() => {
          // Reopen modal on click
          onUpdateSprint({ ...sprint });
        }}
        className={`fixed top-14 right-6 z-40 flex items-center gap-3 px-3 py-1.5 rounded-full border shadow-xl backdrop-blur-md cursor-pointer transition select-none hover:scale-105 active:scale-95 ${border} ${modalBg}`}
      >
        <Flame className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
        <span className="font-mono text-xs font-semibold">{timeStr}</span>
        <div className="h-3 w-px bg-current opacity-20" />
        <span className="text-[11px] font-medium">
          {wordsWrittenInSprint} / {sprint.targetWords} w ({progressPct}%)
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleCancel();
          }}
          className="p-1 rounded-full opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
          title="Stop sprint"
        >
          <Square className="h-3 w-3" />
        </button>
      </div>
    );
  }

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex flex-col w-full max-w-md rounded-xl border ${border} ${modalBg} shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b ${border} px-6 py-4`}>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-medium tracking-wide">
              {sprint.active ? 'Writing Sprint Active' : 'Configure Writing Sprint'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 transition opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {sprint.active ? (
            <div className="text-center space-y-4 py-3">
              <div className="font-mono text-4xl font-bold tracking-tight">{timeStr}</div>
              <div className="flex items-center justify-center gap-6 text-xs">
                <div>
                  <div className="text-lg font-semibold">{wordsWrittenInSprint}</div>
                  <div className="text-[10px] opacity-60">Words Written</div>
                </div>
                <div className="h-8 w-px bg-current opacity-15" />
                <div>
                  <div className="text-lg font-semibold">{sprint.targetWords}</div>
                  <div className="text-[10px] opacity-60">Sprint Target</div>
                </div>
              </div>
              <div className="w-full bg-black/10 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: accentColor,
                    width: `${Math.min(
                      100,
                      (wordsWrittenInSprint / Math.max(1, sprint.targetWords)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <>
              {/* Duration Options */}
              <div className="space-y-2">
                <span className="text-[11px] font-medium opacity-70 block">
                  Select Sprint Duration
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { mins: 15, label: '15 Minutes', sub: 'Quick Burst' },
                    { mins: 25, label: '25 Minutes', sub: 'Pomodoro' },
                    { mins: 45, label: '45 Minutes', sub: 'Deep Flow' },
                  ].map((d) => (
                    <button
                      key={d.mins}
                      type="button"
                      onClick={() => setSelectedDuration(d.mins)}
                      className={`p-2.5 rounded-lg border text-center transition ${cardBg} ${
                        selectedDuration === d.mins
                          ? 'ring-1 ring-current font-semibold shadow-xs'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="text-xs">{d.label}</div>
                      <div className="text-[10px] opacity-60 mt-0.5">{d.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Words */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center opacity-70">
                  <span>Target Words</span>
                  <span>{targetWordCount} words</span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={1500}
                  step={50}
                  value={targetWordCount}
                  onChange={(e) => setTargetWordCount(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-1.5 rounded-lg appearance-none bg-stone-500/20"
                />
              </div>

              {/* Active Note Target */}
              <div className="flex items-center gap-2 p-3 rounded-lg border opacity-80 text-[11px]">
                <Award className="h-4 w-4 shrink-0 text-amber-500" />
                <span>
                  Words written will automatically log to this note's TimeLog upon completion.
                </span>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`border-t ${border} px-6 py-3.5 flex justify-between`}>
          {sprint.active ? (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-1.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition text-xs font-medium"
              >
                Cancel Sprint
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg transition text-xs font-semibold shadow-sm"
                style={{
                  backgroundColor: accentColor,
                  color: accentContrast,
                }}
              >
                Keep Writing (Minimize HUD)
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg border transition text-xs opacity-70 hover:opacity-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStart}
                className="flex items-center gap-1.5 px-5 py-1.5 rounded-lg transition text-xs font-semibold shadow-sm hover:opacity-95"
                style={{
                  backgroundColor: accentColor,
                  color: accentContrast,
                }}
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Begin Sprint</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

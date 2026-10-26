import React, { useState, useEffect } from 'react';
import type { Note, TimelineEntry } from '../types';
import { StorageService } from '../services/storage';
import {
  Clock,
  Zap,
  Plus,
  Play,
  Square,
} from 'lucide-react';

interface TimeJotPanelProps {
  activeNote: Note | null;
  allNotes: Note[];
  onSelectNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  isLightMode: boolean;
}

export const TimeJotPanel: React.FC<TimeJotPanelProps> = ({
  activeNote,
  allNotes,
  onSelectNote,
  onUpdateNote,
  isLightMode,
}) => {
  const [activeTab, setActiveTab] = useState<'intervals' | 'story' | 'logs'>('intervals');

  const [newLogNote, setNewLogNote] = useState('');
  const [newLogType, setNewLogType] = useState<TimelineEntry['type']>('revision');

  const [sprintActive, setSprintActive] = useState(false);
  const [sprintSeconds, setSprintSeconds] = useState(0);
  const [sprintTargetWords, setSprintTargetWords] = useState(300);
  const [startSprintWordCount, setStartSprintWordCount] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (sprintActive) {
      interval = setInterval(() => {
        setSprintSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sprintActive]);

  const handleStartSprint = () => {
    setSprintActive(true);
    setSprintSeconds(0);
    setStartSprintWordCount(activeNote?.wordCount || 0);
  };

  const handleStopSprint = () => {
    if (!activeNote) return;
    const wordsGained = Math.max(0, (activeNote.wordCount || 0) - startSprintWordCount);
    const minutes = Math.max(1, Math.round(sprintSeconds / 60));
    const speed = Math.round((wordsGained / sprintSeconds) * 60) || 0;

    const entry: TimelineEntry = {
      id: `sprint-${Date.now()}`,
      timestamp: Date.now(),
      note: `Writing sprint: +${wordsGained} words in ${minutes}m (~${speed} WPM).`,
      type: 'sprint',
      wordCountSnapshot: activeNote.wordCount,
    };

    const updatedNote = {
      ...activeNote,
      timelineLog: [entry, ...(activeNote.timelineLog || [])],
    };

    onUpdateNote(updatedNote);
    setSprintActive(false);
  };

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNote || !newLogNote.trim()) return;

    const entry: TimelineEntry = {
      id: `log-${Date.now()}`,
      timestamp: Date.now(),
      note: newLogNote.trim(),
      type: newLogType,
      wordCountSnapshot: activeNote.wordCount,
    };

    const updated = {
      ...activeNote,
      timelineLog: [entry, ...(activeNote.timelineLog || [])],
    };

    onUpdateNote(updated);
    setNewLogNote('');
  };

  const storyTimelineNotes = [...allNotes]
    .filter((n) => n.inUniverseDate && n.inUniverseDate.trim().length > 0)
    .sort((a, b) => (a.inUniverseDate || '').localeCompare(b.inUniverseDate || ''));

  const notesByInterval = [...allNotes].sort((a, b) => b.updatedAt - a.updatedAt);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const wordsWrittenInSprint = Math.max(0, (activeNote?.wordCount || 0) - startSprintWordCount);
  const sprintProgress = Math.min(100, Math.round((wordsWrittenInSprint / sprintTargetWords) * 100));

  const border = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.06]';
  const panelBg = isLightMode ? 'bg-[#f4f1ea]' : 'bg-[#131416]';
  const cardBg = isLightMode
    ? 'bg-black/[0.02] border-black/[0.06]'
    : 'bg-white/[0.02] border-white/[0.06]';
  const activeTabClass = isLightMode
    ? 'border-[#302e2b] text-[#222] font-medium'
    : 'border-white/80 text-[#f0ece4] font-medium';
  const subtext = isLightMode ? 'text-[#857f77]' : 'text-[#84817d]';

  return (
    <div
      className={`flex flex-col h-full ${panelBg} border-l ${border} ${subtext} w-72 text-xs`}
    >
      <div className={`flex items-center justify-between border-b ${border} px-3 py-2.5`}>
        <div className="flex items-center gap-1.5 font-medium text-inherit">
          <Clock className="h-4 w-4 opacity-70" />
          <span className="font-serif">TimeJot Timeline</span>
        </div>
      </div>

      <div className={`grid grid-cols-3 border-b ${border} text-[11px] font-mono`}>
        <button
          onClick={() => setActiveTab('intervals')}
          className={`py-2 text-center transition border-b-2 ${
            activeTab === 'intervals' ? activeTabClass : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          Intervals
        </button>
        <button
          onClick={() => setActiveTab('story')}
          className={`py-2 text-center transition border-b-2 ${
            activeTab === 'story' ? activeTabClass : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          Story
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-2 text-center transition border-b-2 ${
            activeTab === 'logs' ? activeTabClass : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          Micro-Logs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeTab === 'intervals' && (
          <div className="space-y-4">
            <div className={`p-3 rounded-lg border ${cardBg} space-y-2.5`}>
              <div className="flex items-center justify-between">
                <span className="font-medium text-inherit flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500/80" />
                  Writing Sprint
                </span>
                <span className="font-mono opacity-70">{formatTimer(sprintSeconds)}</span>
              </div>

              {sprintActive ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-mono opacity-70">
                    <span>
                      {wordsWrittenInSprint} / {sprintTargetWords} words
                    </span>
                    <span>{sprintProgress}%</span>
                  </div>
                  <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`}>
                    <div
                      className="h-full bg-stone-500 transition-all duration-300"
                      style={{ width: `${sprintProgress}%` }}
                    />
                  </div>
                  <button
                    onClick={handleStopSprint}
                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border text-xs transition ${
                      isLightMode
                        ? 'border-black/10 bg-black/[0.04] hover:bg-black/[0.08]'
                        : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08]'
                    }`}
                  >
                    <Square className="h-3 w-3 fill-current" />
                    Finish &amp; Log Sprint
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] opacity-70">Target:</span>
                    <input
                      type="number"
                      value={sprintTargetWords}
                      onChange={(e) => setSprintTargetWords(Number(e.target.value))}
                      className={`w-16 rounded px-2 py-0.5 text-[11px] font-mono text-center border focus:outline-none ${
                        isLightMode
                          ? 'bg-black/[0.03] border-black/[0.08] text-[#2c2a27]'
                          : 'bg-white/[0.03] border-white/[0.08] text-[#dedad4]'
                      }`}
                    />
                    <span className="text-[11px] opacity-60">words</span>
                  </div>
                  <button
                    onClick={handleStartSprint}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-stone-700 hover:bg-stone-600 text-stone-100 font-medium text-xs transition"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    Start Sprint
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider opacity-50 px-1 flex items-center justify-between">
                <span>Last Revised</span>
                <span>Interval</span>
              </div>
              <div className="space-y-1">
                {notesByInterval.map((note) => {
                  const isActive = activeNote?.id === note.id;
                  const intervalStr = StorageService.formatInterval(note.updatedAt);
                  return (
                    <button
                      key={note.id}
                      onClick={() => onSelectNote(note)}
                      className={`w-full text-left p-2 rounded-md border transition flex items-center justify-between ${
                        isActive
                          ? isLightMode
                            ? 'border-black/10 bg-black/[0.05] text-[#222]'
                            : 'border-white/10 bg-white/[0.06] text-[#dedad4]'
                          : 'border-transparent hover:border-black/[0.04] hover:bg-black/[0.02] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate font-medium">{note.title || 'Untitled'}</div>
                        <div className="text-[10px] opacity-60 font-mono">
                          {note.wordCount} words
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          isLightMode
                            ? 'bg-black/[0.03] border-black/[0.06]'
                            : 'bg-white/[0.03] border-white/[0.06]'
                        }`}
                      >
                        {intervalStr}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'story' && (
          <div className="space-y-3">
            <div className={`p-2.5 rounded-md border ${cardBg}`}>
              <span className="text-[11px] opacity-70 block mb-1">
                Active Chapter In-Universe Date:
              </span>
              <input
                type="text"
                placeholder="e.g. Cycle 412, Dawn"
                value={activeNote?.inUniverseDate || ''}
                onChange={(e) => {
                  if (activeNote) {
                    onUpdateNote({ ...activeNote, inUniverseDate: e.target.value });
                  }
                }}
                className={`w-full rounded px-2.5 py-1 text-xs focus:outline-none border ${
                  isLightMode
                    ? 'bg-black/[0.02] border-black/[0.08] text-[#2c2a27]'
                    : 'bg-white/[0.02] border-white/[0.08] text-[#dedad4]'
                }`}
              />
            </div>

            <div className={`relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px ${isLightMode ? 'before:bg-black/10' : 'before:bg-white/10'}`}>
              {storyTimelineNotes.length === 0 ? (
                <div className="opacity-50 text-center py-6">
                  Set an in-universe date above to map your plot chronology.
                </div>
              ) : (
                storyTimelineNotes.map((note) => {
                  const isCurrent = activeNote?.id === note.id;
                  return (
                    <div
                      key={note.id}
                      onClick={() => onSelectNote(note)}
                      className={`relative cursor-pointer group pl-2 transition ${
                        isCurrent ? 'opacity-100 font-medium' : 'opacity-65 hover:opacity-100'
                      }`}
                    >
                      <span
                        className={`absolute -left-[18px] top-1.5 h-2 w-2 rounded-full ${
                          isCurrent
                            ? 'bg-stone-400 ring-2 ring-stone-500/40'
                            : isLightMode
                            ? 'bg-stone-300'
                            : 'bg-stone-600'
                        }`}
                      />

                      <div className="text-[10px] font-mono opacity-80">
                        {note.inUniverseDate}
                      </div>
                      <div className="truncate mt-0.5">{note.title}</div>
                      <div className="text-[10px] opacity-50 font-mono">
                        {note.wordCount} words
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <form onSubmit={handleAddLog} className="space-y-2">
              <input
                type="text"
                placeholder="Log milestone or revision..."
                value={newLogNote}
                onChange={(e) => setNewLogNote(e.target.value)}
                className={`w-full rounded px-2.5 py-1.5 text-xs focus:outline-none border ${
                  isLightMode
                    ? 'bg-black/[0.02] border-black/[0.08] text-[#2c2a27]'
                    : 'bg-white/[0.02] border-white/[0.08] text-[#dedad4]'
                }`}
              />
              <div className="flex items-center justify-between">
                <select
                  value={newLogType}
                  onChange={(e) => setNewLogType(e.target.value as any)}
                  className={`rounded px-2 py-1 text-[11px] border focus:outline-none ${
                    isLightMode
                      ? 'bg-[#f4f1ea] border-black/[0.08] text-[#2c2a27]'
                      : 'bg-[#18191c] border-white/[0.08] text-[#dedad4]'
                  }`}
                >
                  <option value="revision">Revision</option>
                  <option value="milestone">Milestone</option>
                  <option value="event">Plot Event</option>
                  <option value="sprint">Sprint</option>
                </select>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1 bg-stone-700 hover:bg-stone-600 text-stone-100 rounded-md text-[11px] font-medium transition"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {(!activeNote?.timelineLog || activeNote.timelineLog.length === 0) ? (
                <div className="opacity-50 text-center py-6">
                  No micro-logs recorded for this document yet.
                </div>
              ) : (
                activeNote.timelineLog.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-md border ${cardBg} space-y-1`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono opacity-60">
                      <span className="uppercase font-medium">{log.type}</span>
                      <span>
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="leading-snug">{log.note}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

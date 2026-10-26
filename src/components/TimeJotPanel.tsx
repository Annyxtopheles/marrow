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
}

export const TimeJotPanel: React.FC<TimeJotPanelProps> = ({
  activeNote,
  allNotes,
  onSelectNote,
  onUpdateNote,
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

  return (
    <div className="flex flex-col h-full bg-neutral-950/80 border-l border-neutral-900 text-neutral-300 w-80 text-xs">
      <div className="flex items-center justify-between border-b border-neutral-800/80 px-3 py-2 bg-neutral-950">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <Clock className="h-4 w-4 text-neutral-400" />
          <span>TimeJot Engine</span>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-neutral-800/80 bg-neutral-900/40 text-[11px] font-mono">
        <button
          onClick={() => setActiveTab('intervals')}
          className={`py-2 text-center transition border-b-2 ${
            activeTab === 'intervals'
              ? 'border-white text-white font-medium bg-neutral-900/60'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Intervals
        </button>
        <button
          onClick={() => setActiveTab('story')}
          className={`py-2 text-center transition border-b-2 ${
            activeTab === 'story'
              ? 'border-white text-white font-medium bg-neutral-900/60'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Story Plot
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-2 text-center transition border-b-2 ${
            activeTab === 'logs'
              ? 'border-white text-white font-medium bg-neutral-900/60'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Micro-Logs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeTab === 'intervals' && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg border border-neutral-800 bg-neutral-900/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Writing Sprint
                </span>
                <span className="font-mono text-neutral-400">{formatTimer(sprintSeconds)}</span>
              </div>

              {sprintActive ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] text-neutral-400 font-mono">
                    <span>
                      {wordsWrittenInSprint} / {sprintTargetWords} words
                    </span>
                    <span>{sprintProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${sprintProgress}%` }}
                    />
                  </div>
                  <button
                    onClick={handleStopSprint}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition"
                  >
                    <Square className="h-3 w-3 fill-current" />
                    Finish &amp; Log Sprint
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-neutral-400">Target:</span>
                    <input
                      type="number"
                      value={sprintTargetWords}
                      onChange={(e) => setSprintTargetWords(Number(e.target.value))}
                      className="w-20 bg-neutral-950 border border-neutral-800 rounded px-2 py-0.5 text-[11px] font-mono text-white text-center"
                    />
                    <span className="text-[11px] text-neutral-500">words</span>
                  </div>
                  <button
                    onClick={handleStartSprint}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-neutral-200 hover:bg-white text-black font-semibold text-xs transition"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    Start Fast Sprint
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 px-1 flex items-center justify-between">
                <span>Touch Intervals</span>
                <span>Last Revised</span>
              </div>
              <div className="space-y-1">
                {notesByInterval.map((note) => {
                  const isActive = activeNote?.id === note.id;
                  const intervalStr = StorageService.formatInterval(note.updatedAt);
                  return (
                    <button
                      key={note.id}
                      onClick={() => onSelectNote(note)}
                      className={`w-full text-left p-2 rounded-lg border transition flex items-center justify-between ${
                        isActive
                          ? 'border-neutral-700 bg-neutral-900 text-white'
                          : 'border-transparent hover:border-neutral-800/80 hover:bg-neutral-900/40 text-neutral-400'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="truncate font-medium text-neutral-300">
                          {note.title || 'Untitled'}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          {note.wordCount} words
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-mono text-neutral-500 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
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
            <div className="p-2.5 rounded-lg border border-neutral-800 bg-neutral-900/30">
              <span className="text-[11px] text-neutral-400 block mb-1">
                Active Chapter In-Universe Date:
              </span>
              <input
                type="text"
                placeholder="e.g. Cycle 412, High Noon"
                value={activeNote?.inUniverseDate || ''}
                onChange={(e) => {
                  if (activeNote) {
                    onUpdateNote({ ...activeNote, inUniverseDate: e.target.value });
                  }
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />
            </div>

            <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-neutral-800">
              {storyTimelineNotes.length === 0 ? (
                <div className="text-neutral-500 text-center py-6">
                  No story dates set yet. Add an in-universe date to anchor this chapter in time!
                </div>
              ) : (
                storyTimelineNotes.map((note) => {
                  const isCurrent = activeNote?.id === note.id;
                  return (
                    <div
                      key={note.id}
                      onClick={() => onSelectNote(note)}
                      className={`relative cursor-pointer group pl-2 transition ${
                        isCurrent ? 'opacity-100' : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <span
                        className={`absolute -left-[18px] top-1.5 h-2.5 w-2.5 rounded-full border border-black ${
                          isCurrent ? 'bg-white ring-2 ring-neutral-700' : 'bg-neutral-600 group-hover:bg-neutral-400'
                        }`}
                      />

                      <div className="text-[10px] font-mono text-neutral-400 font-semibold">
                        {note.inUniverseDate}
                      </div>
                      <div className="font-medium text-neutral-200 truncate mt-0.5">
                        {note.title}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono">
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
                placeholder="Log milestone or revision thought..."
                value={newLogNote}
                onChange={(e) => setNewLogNote(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />
              <div className="flex items-center justify-between">
                <select
                  value={newLogType}
                  onChange={(e) => setNewLogType(e.target.value as any)}
                  className="bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-[11px] text-neutral-400"
                >
                  <option value="revision">Revision</option>
                  <option value="milestone">Milestone</option>
                  <option value="event">Plot Event</option>
                  <option value="sprint">Sprint</option>
                </select>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-3 py-1 bg-white text-black font-semibold rounded text-[11px] hover:bg-neutral-200 transition"
                >
                  <Plus className="h-3 w-3" />
                  Add Log
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {(!activeNote?.timelineLog || activeNote.timelineLog.length === 0) ? (
                <div className="text-neutral-500 text-center py-6">
                  No micro-logs recorded for this note yet.
                </div>
              ) : (
                activeNote.timelineLog.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg border border-neutral-900 bg-neutral-900/30 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                      <span className="uppercase text-neutral-400 font-semibold">{log.type}</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-neutral-300 leading-snug">{log.note}</div>
                    {log.wordCountSnapshot !== undefined && (
                      <div className="text-[10px] font-mono text-neutral-500">
                        Snapshot: {log.wordCountSnapshot} words
                      </div>
                    )}
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

import React, { useState, useEffect, useCallback } from 'react';
import type { Note, TimelineEntry, ThemeMode, SceneBeat } from '../types';
import { StorageService } from '../services/storage';
import { THEMES } from '../services/themes';
import {
  Clock,
  Zap,
  Plus,
  Play,
  Square,
  ListTodo,
  Check,
  Trash2,
} from 'lucide-react';

interface TimelinePanelProps {
  activeNote: Note | null;
  allNotes: Note[];
  onSelectNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  isLightMode: boolean;
  theme?: ThemeMode;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  activeNote,
  allNotes,
  onSelectNote,
  onUpdateNote,
  isLightMode,
  theme,
}) => {
  const currentTheme = THEMES[theme || 'charcoal'] || THEMES.charcoal;
  const [activeTab, setActiveTab] = useState<'intervals' | 'story' | 'beats' | 'logs'>('intervals');

  const [newLogNote, setNewLogNote] = useState('');
  const [newLogType, setNewLogType] = useState<TimelineEntry['type']>('revision');
  const [newBeatText, setNewBeatText] = useState('');

  const handleAddBeat = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeNote || !newBeatText.trim()) return;
      const now = Date.now();
      const newBeat: SceneBeat = {
        id: `beat-${now}`,
        text: newBeatText.trim(),
        done: false,
      };
      const nextBeats = [...(activeNote.sceneBeats || []), newBeat];
      onUpdateNote({
        ...activeNote,
        sceneBeats: nextBeats,
        updatedAt: now,
      });
      setNewBeatText('');
    },
    [activeNote, newBeatText, onUpdateNote]
  );

  const handleToggleBeat = useCallback(
    (beatId: string) => {
      if (!activeNote || !activeNote.sceneBeats) return;
      const now = Date.now();
      const nextBeats = activeNote.sceneBeats.map((b) =>
        b.id === beatId ? { ...b, done: !b.done } : b
      );
      onUpdateNote({
        ...activeNote,
        sceneBeats: nextBeats,
        updatedAt: now,
      });
    },
    [activeNote, onUpdateNote]
  );

  const handleDeleteBeat = useCallback(
    (beatId: string) => {
      if (!activeNote || !activeNote.sceneBeats) return;
      const now = Date.now();
      const nextBeats = activeNote.sceneBeats.filter((b) => b.id !== beatId);
      onUpdateNote({
        ...activeNote,
        sceneBeats: nextBeats,
        updatedAt: now,
      });
    },
    [activeNote, onUpdateNote]
  );

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

  const border = theme === 'sakura'
    ? 'border-[#e5e7eb]'
    : theme === 'sepia'
    ? 'border-[#e7ddce]'
    : theme === 'nordic'
    ? 'border-sky-500/15'
    : theme === 'evergreen'
    ? 'border-emerald-500/15'
    : isLightMode
    ? 'border-[#e4e0d7]'
    : 'border-white/[0.08]';

  const panelBg = theme === 'sakura'
    ? 'bg-[#fafafc]'
    : theme === 'sepia'
    ? 'bg-[#f5eedd]'
    : theme === 'nordic'
    ? 'bg-[#111722]'
    : theme === 'evergreen'
    ? 'bg-[#0f1a14]'
    : isLightMode
    ? 'bg-[#f4f1ea]'
    : 'bg-[#131416]';
  const cardBg = isLightMode
    ? 'bg-black/[0.02] border-black/[0.08]'
    : 'bg-white/[0.03] border-white/[0.08]';
  const activeTabClass = isLightMode
    ? 'border-[#302e2b] text-[#1c1a17] font-semibold'
    : 'border-white text-[#f5f2eb] font-semibold';
  const inactiveTabClass = isLightMode
    ? 'border-transparent text-[#706c64] hover:text-[#1c1a17]'
    : 'border-transparent text-neutral-400 hover:text-[#f0ece4]';
  const baseText = isLightMode ? 'text-[#383531]' : 'text-[#c5c1ba]';
  const headerText = isLightMode ? 'text-[#1c1a17]' : 'text-[#f0ece4]';
  const labelText = isLightMode ? 'text-[#706c64]' : 'text-neutral-400';

  return (
    <div
      className={`flex flex-col h-full ${panelBg} border-l ${border} ${baseText} w-72 text-xs`}
    >
      <div className={`flex items-center justify-between border-b ${border} px-3 py-2.5 ${headerText}`}>
        <div className="flex items-center gap-1.5 font-semibold">
          <Clock className="h-4 w-4 opacity-80" />
          <span>Timeline</span>
        </div>
      </div>

      <div className={`grid grid-cols-4 border-b ${border} text-[11px]`}>
        <button
          onClick={() => setActiveTab('intervals')}
          className={`py-2 text-center transition border-b-2 truncate ${
            activeTab === 'intervals' ? activeTabClass : inactiveTabClass
          }`}
          title="Cadence, Sprints & Intervals"
        >
          Intervals
        </button>
        <button
          onClick={() => setActiveTab('story')}
          className={`py-2 text-center transition border-b-2 truncate ${
            activeTab === 'story' ? activeTabClass : inactiveTabClass
          }`}
          title="Plot Chronology & Dates"
        >
          Story
        </button>
        <button
          onClick={() => setActiveTab('beats')}
          className={`py-2 text-center transition border-b-2 truncate ${
            activeTab === 'beats' ? activeTabClass : inactiveTabClass
          }`}
          title="Chapter Synopsis & Scene Beats Checklist"
        >
          Beats
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-2 text-center transition border-b-2 truncate ${
            activeTab === 'logs' ? activeTabClass : inactiveTabClass
          }`}
          title="Revision Micro-Logs"
        >
          Logs
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {activeTab === 'intervals' && (
          <div className="space-y-4">
            <div className={`p-3 rounded-lg border ${cardBg} space-y-2.5`}>
              <div className="flex items-center justify-between">
                <span className={`font-semibold flex items-center gap-1.5 ${headerText}`}>
                  <Zap className="h-3.5 w-3.5" style={{ color: currentTheme.tokens.accentColor }} />
                  Writing Sprint
                </span>
                <span className={`font-mono text-xs tabular-nums ${labelText}`}>{formatTimer(sprintSeconds)}</span>
              </div>

              {sprintActive ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className={baseText}>
                      {wordsWrittenInSprint} / {sprintTargetWords} words
                    </span>
                    <span className={`font-medium ${headerText}`}>{sprintProgress}%</span>
                  </div>
                  <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLightMode ? 'bg-black/10' : 'bg-white/10'}`}>
                    <div
                      className="h-full transition-all duration-300 rounded-full"
                      style={{
                        width: `${sprintProgress}%`,
                        backgroundColor: currentTheme.tokens.accentColor,
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleStopSprint}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold shadow-sm transition hover:opacity-90 active:scale-95"
                    style={{
                      backgroundColor: currentTheme.tokens.accentColor,
                      color: currentTheme.tokens.accentContrast,
                    }}
                  >
                    <Square className="h-3 w-3 fill-current" />
                    Finish &amp; Log Sprint
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] ${labelText}`}>Target:</span>
                    <input
                      type="number"
                      value={sprintTargetWords}
                      onChange={(e) => setSprintTargetWords(Number(e.target.value))}
                      className={`w-16 rounded px-2 py-0.5 text-[11px] text-center border focus:outline-none ${
                        isLightMode
                          ? 'bg-black/[0.03] border-black/[0.08] text-[#2c2a27]'
                          : 'bg-white/[0.03] border-white/[0.08] text-[#dedad4]'
                      }`}
                    />
                    <span className={`text-[11px] ${labelText}`}>words</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleStartSprint}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold shadow-sm transition hover:opacity-90 active:scale-95"
                    style={{
                      backgroundColor: currentTheme.tokens.accentColor,
                      color: currentTheme.tokens.accentContrast,
                    }}
                  >
                    <Play className="h-3 w-3 fill-current" />
                    Start Sprint
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className={`text-[10px] uppercase tracking-wider font-medium px-1 flex items-center justify-between ${labelText}`}>
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
                            ? 'border-black/10 bg-black/[0.05] text-[#1c1a17]'
                            : 'border-white/15 bg-white/[0.08] text-[#f5f2eb]'
                          : isLightMode
                          ? 'border-transparent hover:border-black/[0.06] hover:bg-black/[0.03] text-[#45423d] hover:text-[#1c1a17]'
                          : 'border-transparent hover:border-white/[0.06] hover:bg-white/[0.04] text-[#b8b4ab] hover:text-[#f0ece4]'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className={`truncate font-semibold ${isActive ? headerText : (isLightMode ? 'text-[#201e1b]' : 'text-[#dedad4]')}`}>
                          {note.title || 'Untitled'}
                        </div>
                        <div className={`text-[10px] ${labelText}`}>
                          {note.wordCount} words
                        </div>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${
                          isLightMode
                            ? 'bg-black/[0.03] border-black/[0.08] text-[#555]'
                            : 'bg-white/[0.04] border-white/[0.08] text-[#b8b4ab]'
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
              <span className={`text-[11px] font-medium block mb-1 ${labelText}`}>
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
                <div className={`text-center py-6 ${labelText}`}>
                  Set an in-universe date above to map your plot chronology.
                </div>
              ) : (
                storyTimelineNotes.map((note) => {
                  const isCurrent = activeNote?.id === note.id;
                  return (
                    <div
                      key={note.id}
                      onClick={() => onSelectNote(note)}
                      className="relative cursor-pointer group pl-2 transition"
                    >
                      <span
                        className="absolute -left-[18px] top-1.5 h-2 w-2 rounded-full transition-all"
                        style={{
                          backgroundColor: isCurrent
                            ? currentTheme.tokens.accentColor
                            : isLightMode
                            ? '#a8a29e'
                            : '#78716c',
                          boxShadow: isCurrent ? `0 0 0 2.5px ${currentTheme.tokens.accentBg}` : undefined,
                        }}
                      />

                      <div className={`text-[10px] font-mono ${labelText}`}>
                        {note.inUniverseDate}
                      </div>
                      <div className={`truncate mt-0.5 font-semibold ${isCurrent ? headerText : (isLightMode ? 'text-[#201e1b]' : 'text-[#dedad4]')}`}>
                        {note.title}
                      </div>
                      <div className={`text-[10px] ${labelText}`}>
                        {note.wordCount} words
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'beats' && (
          <div className="space-y-4">
            {/* Chapter Synopsis & Objective */}
            <div className={`p-3 rounded-lg border ${cardBg} space-y-2`}>
              <div className="flex items-center justify-between">
                <span className={`font-semibold flex items-center gap-1.5 ${headerText}`}>
                  <ListTodo className="h-3.5 w-3.5" style={{ color: currentTheme.tokens.accentColor }} />
                  Chapter Synopsis
                </span>
                <span className="text-[10px] opacity-50 font-mono">Scratchpad</span>
              </div>
              <textarea
                placeholder="Jot chapter objective, POV notes, or key reveals (e.g. Lola confronts Vance; plant the bronze key)..."
                value={activeNote?.synopsis || ''}
                onChange={(e) => {
                  if (activeNote) {
                    onUpdateNote({
                      ...activeNote,
                      synopsis: e.target.value,
                      updatedAt: Date.now(),
                    });
                  }
                }}
                className={`w-full rounded-md p-2 text-xs leading-relaxed outline-none resize-y min-h-[85px] border focus:border-current transition ${
                  isLightMode
                    ? 'bg-black/[0.02] border-black/[0.08] text-[#2c2a27]'
                    : 'bg-white/[0.02] border-white/[0.08] text-[#dedad4]'
                }`}
              />
              <p className="text-[10px] opacity-50 leading-tight">
                Kept alongside drafting. Does not affect manuscript word count.
              </p>
            </div>

            {/* Scene Beats Checklist */}
            <div className={`p-3 rounded-lg border ${cardBg} space-y-3`}>
              <div className="flex items-center justify-between">
                <span className={`font-semibold flex items-center gap-1.5 ${headerText}`}>
                  <ListTodo className="h-3.5 w-3.5" style={{ color: currentTheme.tokens.accentColor }} />
                  Scene Beats Checklist
                </span>
                {activeNote?.sceneBeats && activeNote.sceneBeats.length > 0 && (
                  <span className="text-[10px] font-mono opacity-60">
                    {activeNote.sceneBeats.filter((b) => b.done).length} / {activeNote.sceneBeats.length}
                  </span>
                )}
              </div>

              {/* Add Beat Form */}
              <form onSubmit={handleAddBeat} className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="New scene beat..."
                  value={newBeatText}
                  onChange={(e) => setNewBeatText(e.target.value)}
                  className={`flex-1 rounded px-2 py-1 text-xs outline-none border ${
                    isLightMode
                      ? 'bg-black/[0.02] border-black/[0.08] text-[#2c2a27]'
                      : 'bg-white/[0.02] border-white/[0.08] text-[#dedad4]'
                  }`}
                />
                <button
                  type="submit"
                  disabled={!newBeatText.trim()}
                  className="px-2.5 py-1 rounded text-xs font-semibold disabled:opacity-40 transition shadow-xs hover:opacity-90 active:scale-95"
                  style={{
                    backgroundColor: currentTheme.tokens.accentColor,
                    color: currentTheme.tokens.accentContrast,
                  }}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </form>

              {/* Beats list */}
              <div className="space-y-1">
                {(!activeNote?.sceneBeats || activeNote.sceneBeats.length === 0) ? (
                  <div className={`text-center py-4 text-[11px] ${labelText}`}>
                    No scene beats added yet. Outline key beats to track while drafting.
                  </div>
                ) : (
                  activeNote.sceneBeats.map((beat) => (
                    <div
                      key={beat.id}
                      className={`group flex items-center justify-between p-1.5 rounded-md border border-transparent hover:border-inherit/10 transition ${
                        beat.done ? 'opacity-50' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleBeat(beat.id)}
                        className="flex items-center gap-2 flex-1 text-left mr-2 min-w-0"
                      >
                        <span
                          className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 transition ${
                            beat.done
                              ? 'border-transparent text-white'
                              : isLightMode
                              ? 'border-black/30'
                              : 'border-white/30'
                          }`}
                          style={{
                            backgroundColor: beat.done ? currentTheme.tokens.accentColor : undefined,
                            color: beat.done ? currentTheme.tokens.accentContrast : undefined,
                          }}
                        >
                          {beat.done && <Check className="h-2.5 w-2.5" />}
                        </span>
                        <span
                          className={`text-xs truncate ${
                            beat.done ? 'line-through opacity-70' : ''
                          }`}
                        >
                          {beat.text}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteBeat(beat.id)}
                        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 p-0.5 rounded transition text-inherit"
                        title="Delete beat"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
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
                  className="flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold transition hover:opacity-90 active:scale-95 shadow-sm"
                  style={{
                    backgroundColor: currentTheme.tokens.accentColor,
                    color: currentTheme.tokens.accentContrast,
                  }}
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
            </form>

            <div className="space-y-2">
              {(!activeNote?.timelineLog || activeNote.timelineLog.length === 0) ? (
                <div className={`text-center py-6 ${labelText}`}>
                  No micro-logs recorded for this document yet.
                </div>
              ) : (
                activeNote.timelineLog.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2.5 rounded-md border ${cardBg} space-y-1`}
                  >
                    <div className={`flex items-center justify-between text-[10px] font-medium ${labelText}`}>
                      <span className="uppercase tracking-wider">{log.type}</span>
                      <span>
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className={`leading-snug text-xs ${isLightMode ? 'text-[#201e1b]' : 'text-[#dedad4]'}`}>{log.note}</div>
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

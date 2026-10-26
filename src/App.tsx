import { useState, useRef } from 'react';
import type { Note, Folder, EditorSettings, HistoryRecord } from './types';
import { StorageService } from './services/storage';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { TimeJotPanel } from './components/TimeJotPanel';
import { BacklinksPanel } from './components/BacklinksPanel';
import { StatsBar } from './components/StatsBar';
import { SettingsModal } from './components/SettingsModal';
import { PanelLeftClose, PanelLeft, Clock, Link2, Plus, Sparkles } from 'lucide-react';

export function App() {
  const [notes, setNotes] = useState<Note[]>(() => StorageService.getNotes());
  const [folders, setFolders] = useState<Folder[]>(() => StorageService.getFolders());
  const [activeNoteId, setActiveNoteId] = useState<string | null>(() => {
    const initialNotes = StorageService.getNotes();
    return initialNotes.length > 0 ? initialNotes[0].id : null;
  });
  const [settings, setSettings] = useState<EditorSettings>(() => StorageService.getSettings());
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // UI Panels
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTimeJotOpen, setIsTimeJotOpen] = useState(true);
  const [isBacklinksOpen, setIsBacklinksOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshotRef = useRef<number>(Date.now());

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0] || null;

  const handleUpdateSettings = (newSettings: EditorSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  const handleUpdateNote = (updatedNote: Note) => {
    setSaveStatus('saving');

    setNotes((prevNotes) => {
      return prevNotes.map((n) => (n.id === updatedNote.id ? updatedNote : n));
    });

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      setNotes((latestNotes) => {
        StorageService.saveNotes(latestNotes);
        setSaveStatus('saved');
        return latestNotes;
      });

      const now = Date.now();
      if (now - lastSnapshotRef.current > 30000) {
        lastSnapshotRef.current = now;
        const record: HistoryRecord = {
          id: `snap-${now}`,
          noteId: updatedNote.id,
          timestamp: now,
          content: updatedNote.content,
          title: updatedNote.title,
          wordCount: updatedNote.wordCount,
        };
        StorageService.addHistoryRecord(record);
      }
    }, settings.autoSaveDelayMs);
  };

  const handleCreateNote = (folderId: string | null = null) => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'Untitled Document',
      content: '<p></p>',
      folderId,
      tags: ['draft'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
      wordCount: 0,
      characterCount: 0,
      pinned: false,
      favorite: false,
      timelineLog: [
        {
          id: `init-${Date.now()}`,
          timestamp: Date.now(),
          note: 'Document created.',
          type: 'milestone',
        },
      ],
    };

    const nextNotes = [newNote, ...notes];
    setNotes(nextNotes);
    StorageService.saveNotes(nextNotes);
    setActiveNoteId(newNote.id);
  };

  const handleCreateFolder = (name: string, parentId: string | null = null) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      parentId,
      order: folders.length + 1,
    };
    const nextFolders = [...folders, newFolder];
    setFolders(nextFolders);
    StorageService.saveFolders(nextFolders);
  };

  const handleDeleteNote = (noteId: string) => {
    const nextNotes = notes.filter((n) => n.id !== noteId);
    setNotes(nextNotes);
    StorageService.saveNotes(nextNotes);
    if (activeNoteId === noteId) {
      setActiveNoteId(nextNotes.length > 0 ? nextNotes[0].id : null);
    }
  };

  const handleTogglePin = (noteId: string) => {
    const nextNotes = notes.map((n) => (n.id === noteId ? { ...n, pinned: !n.pinned } : n));
    setNotes(nextNotes);
    StorageService.saveNotes(nextNotes);
  };

  const handleNavigateToTitle = (title: string) => {
    const found = notes.find((n) => n.title.trim().toLowerCase() === title.trim().toLowerCase());
    if (found) {
      setActiveNoteId(found.id);
    } else {
      const linkedNote: Note = {
        id: `note-${Date.now()}`,
        title: title.trim(),
        content: `<h1>${title.trim()}</h1><p>Created from linked reference.</p>`,
        folderId: activeNote?.folderId || null,
        tags: ['linked'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastOpenedAt: Date.now(),
        wordCount: 0,
        characterCount: 0,
        pinned: false,
        favorite: false,
        timelineLog: [
          {
            id: `link-${Date.now()}`,
            timestamp: Date.now(),
            note: `Created via [[${title.trim()}]] link.`,
            type: 'milestone',
          },
        ],
      };
      const nextNotes = [linkedNote, ...notes];
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);
      setActiveNoteId(linkedNote.id);
    }
  };

  const handleExportVault = () => {
    const vaultData = {
      app: 'PureJot',
      exportedAt: new Date().toISOString(),
      folders,
      notes,
    };
    const blob = new Blob([JSON.stringify(vaultData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purejot-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Modern, low-contrast, warm theme classes
  const isLightMode = settings.theme === 'canvas' || settings.theme === 'fog';

  const themeClasses =
    settings.theme === 'charcoal'
      ? 'bg-[#151618] text-[#dedad4]'
      : settings.theme === 'zinc'
      ? 'bg-[#18191c] text-[#d6d6dc]'
      : settings.theme === 'canvas'
      ? 'bg-[#f7f5f0] text-[#2c2a27]'
      : 'bg-[#ece9e3] text-[#302e2b]';

  const headerBorder = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.07]';
  const headerBg = isLightMode ? 'bg-[#f7f5f0]/90' : 'bg-[#151618]/90';
  const buttonHover = isLightMode ? 'hover:bg-black/[0.05]' : 'hover:bg-white/[0.06]';
  const activeBtn = isLightMode
    ? 'bg-black/[0.08] text-[#222] font-medium'
    : 'bg-white/[0.08] text-[#f0ece4] font-medium';

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden select-none transition-colors duration-200 ${themeClasses}`}
    >
      {/* Refined Minimalist App Bar */}
      {!settings.focusMode && (
        <header
          className={`h-11 border-b ${headerBorder} ${headerBg} backdrop-blur-md px-3.5 flex items-center justify-between text-xs select-none`}
        >
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1.5 rounded-md ${buttonHover} text-neutral-400 hover:text-inherit transition`}
              title="Toggle Sidebar (Ctrl+\)"
            >
              {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </button>
            <div className="flex items-center gap-1.5">
              <span className="font-serif tracking-tight text-sm font-medium text-inherit">
                PureJot
              </span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${
                  isLightMode
                    ? 'bg-black/[0.03] border-black/[0.07] text-neutral-600'
                    : 'bg-white/[0.04] border-white/[0.06] text-neutral-400'
                }`}
              >
                editorial
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsTimeJotOpen(!isTimeJotOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition ${
                isTimeJotOpen ? activeBtn : `${buttonHover} text-neutral-400`
              }`}
              title="TimeJot Timeline & Sprints"
            >
              <Clock className="h-3 w-3" />
              <span>TimeJot</span>
            </button>

            <button
              onClick={() => setIsBacklinksOpen(!isBacklinksOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition ${
                isBacklinksOpen ? activeBtn : `${buttonHover} text-neutral-400`
              }`}
              title="Obsidian Knowledge Graph & Links"
            >
              <Link2 className="h-3 w-3" />
              <span>Links</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {!settings.focusMode && isSidebarOpen && (
          <Sidebar
            notes={notes}
            folders={folders}
            activeNoteId={activeNoteId}
            onSelectNote={(n) => setActiveNoteId(n.id)}
            onCreateNote={handleCreateNote}
            onCreateFolder={handleCreateFolder}
            onDeleteNote={handleDeleteNote}
            onTogglePin={handleTogglePin}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onToggleTimeJot={() => setIsTimeJotOpen(!isTimeJotOpen)}
            isTimeJotOpen={isTimeJotOpen}
            onToggleBacklinks={() => setIsBacklinksOpen(!isBacklinksOpen)}
            isBacklinksOpen={isBacklinksOpen}
            isLightMode={isLightMode}
          />
        )}

        {/* Central Editor */}
        {activeNote ? (
          <Editor
            key={activeNote.id}
            note={activeNote}
            settings={settings}
            onUpdateNote={handleUpdateNote}
            onNavigateToTitle={handleNavigateToTitle}
            saveStatus={saveStatus}
            onToggleTypewriter={() =>
              handleUpdateSettings({ ...settings, typewriterMode: !settings.typewriterMode })
            }
            onToggleFocus={() =>
              handleUpdateSettings({ ...settings, focusMode: !settings.focusMode })
            }
            isLightMode={isLightMode}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-500">
            <Sparkles className="h-6 w-6 text-neutral-400 mb-2 opacity-50" />
            <h3 className="text-base font-serif font-medium text-inherit mb-1">No Document Open</h3>
            <p className="text-xs max-w-sm mb-4 text-neutral-400">
              Select an entry from your vault or draft a new piece.
            </p>
            <button
              onClick={() => handleCreateNote(null)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-200 text-neutral-900 font-medium text-xs rounded-lg hover:bg-white transition"
            >
              <Plus className="h-3.5 w-3.5" />
              New Draft
            </button>
          </div>
        )}

        {/* TimeJot Panel */}
        {!settings.focusMode && isTimeJotOpen && (
          <TimeJotPanel
            activeNote={activeNote}
            allNotes={notes}
            onSelectNote={(n) => setActiveNoteId(n.id)}
            onUpdateNote={handleUpdateNote}
            isLightMode={isLightMode}
          />
        )}

        {/* Obsidian Backlinks & Graph Panel */}
        {!settings.focusMode && isBacklinksOpen && (
          <BacklinksPanel
            activeNote={activeNote}
            allNotes={notes}
            onSelectNote={(n) => setActiveNoteId(n.id)}
            isLightMode={isLightMode}
          />
        )}
      </div>

      {/* PureWriter Live Statistics Bar */}
      {!settings.focusMode && (
        <StatsBar note={activeNote} saveStatus={saveStatus} isLightMode={isLightMode} />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setIsSettingsOpen(false)}
          onExportVault={handleExportVault}
          isLightMode={isLightMode}
        />
      )}
    </div>
  );
}

export default App;

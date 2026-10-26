import { useState, useRef } from 'react';
import type { Note, Folder, EditorSettings, HistoryRecord } from './types';
import { StorageService } from './services/storage';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { TimeJotPanel } from './components/TimeJotPanel';
import { BacklinksPanel } from './components/BacklinksPanel';
import { StatsBar } from './components/StatsBar';
import { SettingsModal } from './components/SettingsModal';
import { PanelLeftClose, PanelLeft, Clock, Link2, Plus } from 'lucide-react';

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

  // Persist settings
  const handleUpdateSettings = (newSettings: EditorSettings) => {
    setSettings(newSettings);
    StorageService.saveSettings(newSettings);
  };

  // Fail-safe auto-save handler (PureWriter standard)
  const handleUpdateNote = (updatedNote: Note) => {
    setSaveStatus('saving');

    // Update in-memory state immediately for zero typing lag
    setNotes((prevNotes) => {
      const nextNotes = prevNotes.map((n) => (n.id === updatedNote.id ? updatedNote : n));
      return nextNotes;
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

      // Periodic history snapshot for the PureWriter time machine slider
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

  // Navigate to an Obsidian [[Wikilink]] title or create it on the fly
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

  const themeClasses =
    settings.theme === 'amoled'
      ? 'bg-black text-neutral-200'
      : settings.theme === 'slate'
      ? 'bg-[#111113] text-neutral-200'
      : settings.theme === 'paper'
      ? 'bg-white text-neutral-900'
      : 'bg-[#faf6ee] text-[#2c2925]';

  return (
    <div className={`flex flex-col h-screen w-screen overflow-hidden select-none transition-colors duration-300 ${themeClasses}`}>
      {/* Main App Bar (Zen / Minimalist) */}
      {!settings.focusMode && (
        <header className="h-10 border-b border-neutral-900/80 bg-inherit px-3 flex items-center justify-between text-xs text-neutral-400 select-none">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
              title="Toggle Obsidian Vault Explorer (Ctrl+\)"
            >
              {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
            </button>
            <span className="font-semibold text-white tracking-wider text-xs font-mono uppercase">
              PureJot
            </span>
            <span className="text-[10px] text-neutral-500 font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800">
              v1.0 • Fail-Safe
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsTimeJotOpen(!isTimeJotOpen)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition ${
                isTimeJotOpen ? 'bg-neutral-800 text-white font-medium' : 'hover:bg-neutral-900 text-neutral-400'
              }`}
              title="TimeJot Timeline & Sprints"
            >
              <Clock className="h-3 w-3" />
              <span>TimeJot</span>
            </button>

            <button
              onClick={() => setIsBacklinksOpen(!isBacklinksOpen)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono transition ${
                isBacklinksOpen ? 'bg-neutral-800 text-white font-medium' : 'hover:bg-neutral-900 text-neutral-400'
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
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-500">
            <h3 className="text-lg font-semibold text-neutral-300 mb-2">No Document Selected</h3>
            <p className="text-xs max-w-sm mb-4">
              Select an existing document from your vault or create a brand new draft to begin writing.
            </p>
            <button
              onClick={() => handleCreateNote(null)}
              className="flex items-center gap-2 px-4 py-2 bg-white text-black font-semibold text-xs rounded-lg hover:bg-neutral-200 transition"
            >
              <Plus className="h-4 w-4" />
              Create Document
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
          />
        )}

        {/* Obsidian Backlinks & Graph Panel */}
        {!settings.focusMode && isBacklinksOpen && (
          <BacklinksPanel
            activeNote={activeNote}
            allNotes={notes}
            onSelectNote={(n) => setActiveNoteId(n.id)}
          />
        )}
      </div>

      {/* PureWriter Live Statistics Bar */}
      {!settings.focusMode && <StatsBar note={activeNote} saveStatus={saveStatus} />}

      {/* Typography & App Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClose={() => setIsSettingsOpen(false)}
          onExportVault={handleExportVault}
        />
      )}
    </div>
  );
}

export default App;

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Note, Folder, EditorSettings, HistoryRecord, VaultAction, ToastNotification } from './types';
import { StorageService } from './services/storage';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { TimeJotPanel } from './components/TimeJotPanel';
import { BacklinksPanel } from './components/BacklinksPanel';
import { SettingsModal } from './components/SettingsModal';
import { SyncModal } from './components/SyncModal';
import { PanelLeftClose, PanelLeft, Clock, Link2, Plus, Cloud, RotateCcw, X } from 'lucide-react';

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
  const [isSyncOpen, setIsSyncOpen] = useState(false);

  // Vault Undo/Redo & Toast System
  const [undoStack, setUndoStack] = useState<VaultAction[]>([]);
  const [redoStack, setRedoStack] = useState<VaultAction[]>([]);
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (notification: ToastNotification, duration = 6500) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(notification);
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  };

  const dismissToast = () => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToast(null);
  };

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshotRef = useRef<number>(0);

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0] || null;

  const handleRestoreVault = (newNotes: Note[], newFolders: Folder[]) => {
    setNotes(newNotes);
    setFolders(newFolders);
    StorageService.saveNotes(newNotes);
    StorageService.saveFolders(newFolders);
    if (newNotes.length > 0) {
      setActiveNoteId(newNotes[0].id);
    }
  };

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

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const [action, ...restUndo] = undoStack;

    if (action.type === 'DELETE_NOTE') {
      const restoredNotes = [...notes];
      const targetIndex = Math.min(Math.max(0, action.index), restoredNotes.length);
      restoredNotes.splice(targetIndex, 0, action.note);

      setNotes(restoredNotes);
      StorageService.saveNotes(restoredNotes);
      StorageService.restoreFromTrash(action.note.id);
      setActiveNoteId(action.note.id);

      setUndoStack(restUndo);
      setRedoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `Restored "${action.note.title || 'Untitled Document'}"`,
      });
    } else if (action.type === 'CREATE_NOTE') {
      const nextNotes = notes.filter((n) => n.id !== action.noteId);
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);

      if (action.previousActiveNoteId) {
        setActiveNoteId(action.previousActiveNoteId);
      } else if (nextNotes.length > 0) {
        setActiveNoteId(nextNotes[0].id);
      }

      setUndoStack(restUndo);
      setRedoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: 'Removed created document',
      });
    } else if (action.type === 'TOGGLE_PIN') {
      const nextNotes = notes.map((n) =>
        n.id === action.noteId ? { ...n, pinned: action.previousPinned } : n
      );
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);

      setUndoStack(restUndo);
      setRedoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `${action.previousPinned ? 'Pinned' : 'Unpinned'} "${action.noteTitle}"`,
      });
    } else if (action.type === 'CREATE_FOLDER') {
      const nextFolders = folders.filter((f) => f.id !== action.folder.id);
      setFolders(nextFolders);
      StorageService.saveFolders(nextFolders);

      const nextNotes = notes.map((n) =>
        n.folderId === action.folder.id ? { ...n, folderId: null } : n
      );
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);

      setUndoStack(restUndo);
      setRedoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `Removed folder "${action.folder.name}"`,
      });
    } else if (action.type === 'DELETE_FOLDER') {
      const nextFolders = [...folders, action.folder];
      setFolders(nextFolders);
      StorageService.saveFolders(nextFolders);

      const nextNotes = notes.map((n) => {
        const match = action.affectedNotes.find((an) => an.noteId === n.id);
        return match ? { ...n, folderId: action.folder.id } : n;
      });
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);

      setUndoStack(restUndo);
      setRedoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `Restored folder "${action.folder.name}"`,
      });
    }
  }, [undoStack, notes, folders]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const [action, ...restRedo] = redoStack;

    if (action.type === 'DELETE_NOTE') {
      const nextNotes = notes.filter((n) => n.id !== action.note.id);
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);
      StorageService.moveToTrash(action.note);

      if (activeNoteId === action.note.id) {
        setActiveNoteId(nextNotes.length > 0 ? nextNotes[0].id : null);
      }

      setRedoStack(restRedo);
      setUndoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `Deleted "${action.note.title || 'Untitled Document'}"`,
        actionLabel: 'Undo',
        undoHint: true,
        onAction: handleUndo,
      });
    } else if (action.type === 'CREATE_NOTE') {
      const nextNotes = [action.note, ...notes];
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);
      setActiveNoteId(action.note.id);

      setRedoStack(restRedo);
      setUndoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `Recreated "${action.note.title || 'Untitled Document'}"`,
      });
    } else if (action.type === 'TOGGLE_PIN') {
      const nextNotes = notes.map((n) =>
        n.id === action.noteId ? { ...n, pinned: !action.previousPinned } : n
      );
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);

      setRedoStack(restRedo);
      setUndoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `${!action.previousPinned ? 'Pinned' : 'Unpinned'} "${action.noteTitle}"`,
      });
    } else if (action.type === 'CREATE_FOLDER') {
      const nextFolders = [...folders, action.folder];
      setFolders(nextFolders);
      StorageService.saveFolders(nextFolders);

      setRedoStack(restRedo);
      setUndoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `Recreated folder "${action.folder.name}"`,
      });
    } else if (action.type === 'DELETE_FOLDER') {
      const nextFolders = folders.filter((f) => f.id !== action.folder.id);
      setFolders(nextFolders);
      StorageService.saveFolders(nextFolders);

      const nextNotes = notes.map((n) =>
        n.folderId === action.folder.id ? { ...n, folderId: null } : n
      );
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);

      setRedoStack(restRedo);
      setUndoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `Deleted folder "${action.folder.name}"`,
      });
    }
  }, [redoStack, notes, folders, activeNoteId, handleUndo]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (!isMod) return;

      const key = e.key.toLowerCase();
      const isZ = key === 'z';
      const isY = key === 'y';

      if (!isZ && !isY) return;

      const isUndo = isZ && !e.shiftKey;
      const isRedo = isY || (isZ && e.shiftKey);

      const activeEl = document.activeElement;
      const isInput =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement;

      // When focused inside native input/textarea, let the browser handle native text undo
      if (isInput) return;

      // If inside ProseMirror and default was prevented, ProseMirror already handled text undo
      if (e.defaultPrevented) return;

      if (isUndo) {
        if (undoStack.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      } else if (isRedo) {
        if (redoStack.length > 0) {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [undoStack.length, redoStack.length, handleUndo, handleRedo]);

  const handleCreateNote = (folderId: string | null = null) => {
    const prevActiveId = activeNoteId;
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

    const action: VaultAction = {
      type: 'CREATE_NOTE',
      noteId: newNote.id,
      note: newNote,
      previousActiveNoteId: prevActiveId,
    };
    setUndoStack((prev) => [action, ...prev.slice(0, 49)]);
    setRedoStack([]);
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

    const action: VaultAction = {
      type: 'CREATE_FOLDER',
      folder: newFolder,
    };
    setUndoStack((prev) => [action, ...prev.slice(0, 49)]);
    setRedoStack([]);
  };

  const handleDeleteFolder = (folderId: string) => {
    const folderToDelete = folders.find((f) => f.id === folderId);
    if (!folderToDelete) return;

    const nextFolders = folders.filter((f) => f.id !== folderId);
    setFolders(nextFolders);
    StorageService.saveFolders(nextFolders);

    const affectedNotes: { noteId: string; previousFolderId: string | null }[] = [];
    const nextNotes = notes.map((n) => {
      if (n.folderId === folderId) {
        affectedNotes.push({ noteId: n.id, previousFolderId: folderId });
        return { ...n, folderId: null };
      }
      return n;
    });
    setNotes(nextNotes);
    StorageService.saveNotes(nextNotes);

    const action: VaultAction = {
      type: 'DELETE_FOLDER',
      folder: folderToDelete,
      affectedNotes,
    };
    setUndoStack((prev) => [action, ...prev.slice(0, 49)]);
    setRedoStack([]);

    showToast({
      id: `toast-${Date.now()}`,
      message: `Deleted folder "${folderToDelete.name}"`,
      actionLabel: 'Undo',
      undoHint: true,
      onAction: handleUndo,
    });
  };

  const handleDeleteNote = (noteId: string) => {
    const noteToDelete = notes.find((n) => n.id === noteId);
    if (!noteToDelete) return;

    const noteIndex = notes.findIndex((n) => n.id === noteId);
    const prevActiveId = activeNoteId;

    const nextNotes = notes.filter((n) => n.id !== noteId);
    setNotes(nextNotes);
    StorageService.saveNotes(nextNotes);
    StorageService.moveToTrash(noteToDelete);

    if (activeNoteId === noteId) {
      const fallbackId =
        nextNotes.length > 0
          ? (nextNotes[Math.min(noteIndex, nextNotes.length - 1)]?.id || nextNotes[0].id)
          : null;
      setActiveNoteId(fallbackId);
    }

    const action: VaultAction = {
      type: 'DELETE_NOTE',
      note: { ...noteToDelete },
      index: noteIndex,
      previousActiveNoteId: prevActiveId,
    };

    setUndoStack((prev) => [action, ...prev.slice(0, 49)]);
    setRedoStack([]);

    showToast({
      id: `toast-${Date.now()}`,
      message: `Deleted "${noteToDelete.title || 'Untitled Document'}"`,
      actionLabel: 'Undo',
      undoHint: true,
      onAction: handleUndo,
    });
  };

  const handleTogglePin = (noteId: string) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;

    const newPinned = !target.pinned;
    const nextNotes = notes.map((n) => (n.id === noteId ? { ...n, pinned: newPinned } : n));
    setNotes(nextNotes);
    StorageService.saveNotes(nextNotes);

    const action: VaultAction = {
      type: 'TOGGLE_PIN',
      noteId,
      noteTitle: target.title || 'Untitled Document',
      previousPinned: target.pinned,
    };
    setUndoStack((prev) => [action, ...prev.slice(0, 49)]);
    setRedoStack([]);

    showToast({
      id: `toast-${Date.now()}`,
      message: `${newPinned ? 'Pinned' : 'Unpinned'} "${target.title || 'Untitled Document'}"`,
      actionLabel: 'Undo',
      undoHint: true,
      onAction: handleUndo,
    });
  };

  const handleRenameNote = (noteId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const nextNotes = notes.map((n) =>
      n.id === noteId ? { ...n, title: trimmed, updatedAt: Date.now() } : n
    );
    setNotes(nextNotes);
    StorageService.saveNotes(nextNotes);
  };

  const handleMoveNote = (noteId: string, targetFolderId: string | null) => {
    const targetNote = notes.find((n) => n.id === noteId);
    if (!targetNote || targetNote.folderId === targetFolderId) return;

    const prevFolderId = targetNote.folderId;
    const nextNotes = notes.map((n) =>
      n.id === noteId ? { ...n, folderId: targetFolderId, updatedAt: Date.now() } : n
    );
    setNotes(nextNotes);
    StorageService.saveNotes(nextNotes);

    const targetFolder = folders.find((f) => f.id === targetFolderId);
    const folderName = targetFolder ? targetFolder.name : 'General';
    showToast({
      id: `toast-${Date.now()}`,
      message: `Moved "${targetNote.title || 'Untitled'}" to ${folderName}`,
      actionLabel: 'Undo',
      undoHint: true,
      onAction: () => {
        setNotes((curNotes) => {
          const reverted = curNotes.map((n) =>
            n.id === noteId ? { ...n, folderId: prevFolderId, updatedAt: Date.now() } : n
          );
          StorageService.saveNotes(reverted);
          return reverted;
        });
      },
    });
  };

  const handleDuplicateNote = (sourceNote: Note) => {
    const newNote: Note = {
      ...sourceNote,
      id: `note-${Date.now()}`,
      title: `${sourceNote.title || 'Untitled'} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastOpenedAt: Date.now(),
      pinned: false,
      timelineLog: [
        {
          id: `init-${Date.now()}`,
          timestamp: Date.now(),
          note: `Duplicated from "${sourceNote.title || 'Untitled'}".`,
          type: 'milestone',
        },
      ],
    };

    const nextNotes = [newNote, ...notes];
    setNotes(nextNotes);
    StorageService.saveNotes(nextNotes);
    setActiveNoteId(newNote.id);

    const action: VaultAction = {
      type: 'CREATE_NOTE',
      noteId: newNote.id,
      note: newNote,
      previousActiveNoteId: activeNoteId,
    };
    setUndoStack((prev) => [action, ...prev.slice(0, 49)]);
    setRedoStack([]);

    showToast({
      id: `toast-${Date.now()}`,
      message: `Duplicated "${sourceNote.title || 'Untitled'}"`,
    });
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const nextFolders = folders.map((f) =>
      f.id === folderId ? { ...f, name: trimmed } : f
    );
    setFolders(nextFolders);
    StorageService.saveFolders(nextFolders);
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
      app: 'Marrow',
      exportedAt: new Date().toISOString(),
      folders,
      notes,
    };
    const blob = new Blob([JSON.stringify(vaultData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marrow-vault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLightMode = settings.theme === 'canvas';

  const themeClasses = isLightMode
    ? 'bg-[#f7f5f0] text-[#2c2a27]'
    : 'bg-[#151618] text-[#dedad4]';

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
            <div className="flex items-center gap-2">
              <img
                src="/marrow-wordmark.svg"
                alt="Marrow"
                className="h-[13px] w-auto object-contain select-none opacity-90 -translate-y-[1px]"
                style={{ filter: isLightMode ? 'brightness(0) opacity(0.8)' : undefined }}
              />
              <span
                className={`text-[10px] leading-none px-1.5 py-1 rounded-md border flex items-center justify-center ${
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
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition ${
                isTimeJotOpen ? activeBtn : `${buttonHover} text-neutral-400`
              }`}
              title="TimeJot Timeline & Sprints"
            >
              <Clock className="h-3 w-3" />
              <span>TimeJot</span>
            </button>

            <button
              onClick={() => setIsBacklinksOpen(!isBacklinksOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition ${
                isBacklinksOpen ? activeBtn : `${buttonHover} text-neutral-400`
              }`}
              title="Knowledge Graph & Backlinks"
            >
              <Link2 className="h-3 w-3" />
              <span>Graph</span>
            </button>

            <button
              onClick={() => setIsSyncOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition ${
                isSyncOpen ? activeBtn : `${buttonHover} text-neutral-400`
              }`}
              title="Cross-Device Cloud Sync (Google Drive)"
            >
              <Cloud className="h-3 w-3" />
              <span>Sync</span>
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
            onRenameFolder={handleRenameFolder}
            onDeleteNote={handleDeleteNote}
            onDeleteFolder={handleDeleteFolder}
            onTogglePin={handleTogglePin}
            onRenameNote={handleRenameNote}
            onMoveNote={handleMoveNote}
            onDuplicateNote={handleDuplicateNote}
            onOpenSettings={() => setIsSettingsOpen(true)}
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
            <img
              src="/marrow-icon.svg"
              alt="Marrow"
              className="h-8 w-8 mb-3 opacity-60"
              style={{ filter: isLightMode ? 'brightness(0) opacity(0.6)' : undefined }}
            />
            <h3 className="text-base font-medium text-inherit mb-1">No Document Open</h3>
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

      {/* Cross-Device Cloud Sync Modal */}
      {isSyncOpen && (
        <SyncModal
          notes={notes}
          folders={folders}
          settings={settings}
          onRestoreVault={handleRestoreVault}
          onClose={() => setIsSyncOpen(false)}
          isLightMode={isLightMode}
        />
      )}

      {/* Vault Action / Undo Notification Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-lg border shadow-xl backdrop-blur-md text-xs transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 select-none ${
            isLightMode
              ? 'bg-[#ffffff]/95 text-[#2c2a27] border-black/[0.1] shadow-black/10'
              : 'bg-[#1a1b1e]/95 text-[#dedad4] border-white/[0.1] shadow-black/40'
          }`}
        >
          <span className="font-medium truncate max-w-xs">{toast.message}</span>
          {toast.onAction && toast.actionLabel && (
            <button
              type="button"
              onClick={toast.onAction}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium text-xs transition ${
                isLightMode
                  ? 'bg-black text-white hover:bg-neutral-800'
                  : 'bg-white text-black hover:bg-neutral-200'
              }`}
            >
              <RotateCcw className="h-3 w-3" />
              <span>{toast.actionLabel}</span>
              {toast.undoHint && (
                <span className="text-[10px] opacity-70 font-normal ml-0.5">Ctrl+Z</span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={dismissToast}
            className="opacity-40 hover:opacity-100 p-0.5 rounded transition ml-1"
            title="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default App;

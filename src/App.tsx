import { useState, useRef, useEffect, useCallback } from 'react';
import type { Note, Folder, EditorSettings, HistoryRecord, VaultAction, ToastNotification } from './types';
import { StorageService } from './services/storage';
import { THEMES, VALID_THEMES, isThemeLight, applyThemeToDocument } from './services/themes';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/Editor';
import { TimelinePanel } from './components/TimelinePanel';
import { BacklinksPanel } from './components/BacklinksPanel';
import { SettingsModal } from './components/SettingsModal';
import { SyncModal } from './components/SyncModal';
import { CompileModal } from './components/CompileModal';
import { PanelLeftClose, PanelLeft, Clock, Link2, Plus, Cloud, RotateCcw, X, Palette, BookOpen } from 'lucide-react';

export function App() {
  const [notes, setNotes] = useState<Note[]>(() => StorageService.getNotes());
  const [folders, setFolders] = useState<Folder[]>(() => StorageService.getFolders());
  const [activeNoteId, setActiveNoteId] = useState<string | null>(() => {
    const initialNotes = StorageService.getNotes();
    return initialNotes.length > 0 ? initialNotes[0].id : null;
  });
  const [settings, setSettings] = useState<EditorSettings>(() => StorageService.getSettings());
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [dailyProgress, setDailyProgress] = useState<{ date: string; wordsWritten: number }>(() =>
    StorageService.getDailyProgress()
  );

  // UI Panels
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [isBacklinksOpen, setIsBacklinksOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncOpen, setIsSyncOpen] = useState(false);
  const [isCompileOpen, setIsCompileOpen] = useState(false);
  const [compileFolderId, setCompileFolderId] = useState<string | null>(null);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  useEffect(() => {
    applyThemeToDocument(settings.theme);
  }, [settings.theme]);

  // Vault Undo/Redo & Toast System
  const [undoStack, setUndoStack] = useState<VaultAction[]>([]);
  const [redoStack, setRedoStack] = useState<VaultAction[]>([]);
  const undoRef = useRef<() => void>(() => {});
  const redoRef = useRef<() => void>(() => {});
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

  const handleResetDailyWords = () => {
    const reset = StorageService.setDailyWordsWritten(0);
    setDailyProgress(reset);
  };

  const handleUpdateNote = (updatedNote: Note) => {
    setSaveStatus('saving');

    setNotes((prevNotes) => {
      const prev = prevNotes.find((n) => n.id === updatedNote.id);
      if (prev && updatedNote.wordCount > prev.wordCount) {
        const delta = updatedNote.wordCount - prev.wordCount;
        const nextDaily = StorageService.recordWordsWritten(delta);
        setDailyProgress(nextDaily);
      }
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
        actionLabel: 'Redo',
        onAction: () => redoRef.current(),
      });
    } else if (action.type === 'CREATE_NOTE' || action.type === 'DUPLICATE_NOTE') {
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
        message:
          action.type === 'DUPLICATE_NOTE'
            ? `Removed duplicate "${action.note.title}"`
            : 'Removed created document',
        actionLabel: 'Redo',
        onAction: () => redoRef.current(),
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
        actionLabel: 'Redo',
        onAction: () => redoRef.current(),
      });
    } else if (action.type === 'RENAME_NOTE') {
      const nextNotes = notes.map((n) =>
        n.id === action.noteId ? { ...n, title: action.previousTitle, updatedAt: Date.now() } : n
      );
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);

      setUndoStack(restUndo);
      setRedoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `Reverted note title to "${action.previousTitle}"`,
        actionLabel: 'Redo',
        onAction: () => redoRef.current(),
      });
    } else if (action.type === 'MOVE_NOTE') {
      const nextNotes = notes.map((n) =>
        n.id === action.noteId ? { ...n, folderId: action.previousFolderId, updatedAt: Date.now() } : n
      );
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);

      setUndoStack(restUndo);
      setRedoStack((prev) => [action, ...prev]);

      const prevFolder = folders.find((f) => f.id === action.previousFolderId);
      const folderName = prevFolder ? prevFolder.name : 'General';
      showToast({
        id: `toast-${Date.now()}`,
        message: `Moved "${action.noteTitle}" back to ${folderName}`,
        actionLabel: 'Redo',
        onAction: () => redoRef.current(),
      });
    } else if (action.type === 'UPDATE_TAGS') {
      const nextNotes = notes.map((n) =>
        n.id === action.noteId ? { ...n, tags: action.previousTags, updatedAt: Date.now() } : n
      );
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);

      setUndoStack(restUndo);
      setRedoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `Reverted tags for "${action.noteTitle}"`,
        actionLabel: 'Redo',
        onAction: () => redoRef.current(),
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
        actionLabel: 'Redo',
        onAction: () => redoRef.current(),
      });
    } else if (action.type === 'RENAME_FOLDER') {
      const nextFolders = folders.map((f) =>
        f.id === action.folderId ? { ...f, name: action.previousName } : f
      );
      setFolders(nextFolders);
      StorageService.saveFolders(nextFolders);

      setUndoStack(restUndo);
      setRedoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `Reverted folder name to "${action.previousName}"`,
        actionLabel: 'Redo',
        onAction: () => redoRef.current(),
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
        actionLabel: 'Redo',
        onAction: () => redoRef.current(),
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
        onAction: () => undoRef.current(),
      });
    } else if (action.type === 'CREATE_NOTE' || action.type === 'DUPLICATE_NOTE') {
      const nextNotes = [action.note, ...notes.filter((n) => n.id !== action.note.id)];
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);
      setActiveNoteId(action.note.id);

      setRedoStack(restRedo);
      setUndoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message:
          action.type === 'DUPLICATE_NOTE'
            ? `Re-duplicated "${action.note.title}"`
            : `Recreated "${action.note.title || 'Untitled Document'}"`,
        actionLabel: 'Undo',
        undoHint: true,
        onAction: () => undoRef.current(),
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
        actionLabel: 'Undo',
        undoHint: true,
        onAction: () => undoRef.current(),
      });
    } else if (action.type === 'RENAME_NOTE') {
      const nextNotes = notes.map((n) =>
        n.id === action.noteId ? { ...n, title: action.newTitle, updatedAt: Date.now() } : n
      );
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);

      setRedoStack(restRedo);
      setUndoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `Renamed to "${action.newTitle}"`,
        actionLabel: 'Undo',
        undoHint: true,
        onAction: () => undoRef.current(),
      });
    } else if (action.type === 'MOVE_NOTE') {
      const nextNotes = notes.map((n) =>
        n.id === action.noteId ? { ...n, folderId: action.newFolderId, updatedAt: Date.now() } : n
      );
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);

      setRedoStack(restRedo);
      setUndoStack((prev) => [action, ...prev]);

      const targetFolder = folders.find((f) => f.id === action.newFolderId);
      const folderName = targetFolder ? targetFolder.name : 'General';
      showToast({
        id: `toast-${Date.now()}`,
        message: `Moved "${action.noteTitle}" to ${folderName}`,
        actionLabel: 'Undo',
        undoHint: true,
        onAction: () => undoRef.current(),
      });
    } else if (action.type === 'UPDATE_TAGS') {
      const nextNotes = notes.map((n) =>
        n.id === action.noteId ? { ...n, tags: action.newTags, updatedAt: Date.now() } : n
      );
      setNotes(nextNotes);
      StorageService.saveNotes(nextNotes);

      setRedoStack(restRedo);
      setUndoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `Updated tags for "${action.noteTitle}"`,
        actionLabel: 'Undo',
        undoHint: true,
        onAction: () => undoRef.current(),
      });
    } else if (action.type === 'CREATE_FOLDER') {
      const nextFolders = [...folders.filter((f) => f.id !== action.folder.id), action.folder];
      setFolders(nextFolders);
      StorageService.saveFolders(nextFolders);

      setRedoStack(restRedo);
      setUndoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `Recreated folder "${action.folder.name}"`,
        actionLabel: 'Undo',
        undoHint: true,
        onAction: () => undoRef.current(),
      });
    } else if (action.type === 'RENAME_FOLDER') {
      const nextFolders = folders.map((f) =>
        f.id === action.folderId ? { ...f, name: action.newName } : f
      );
      setFolders(nextFolders);
      StorageService.saveFolders(nextFolders);

      setRedoStack(restRedo);
      setUndoStack((prev) => [action, ...prev]);

      showToast({
        id: `toast-${Date.now()}`,
        message: `Renamed folder to "${action.newName}"`,
        actionLabel: 'Undo',
        undoHint: true,
        onAction: () => undoRef.current(),
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
        actionLabel: 'Undo',
        undoHint: true,
        onAction: () => undoRef.current(),
      });
    }
  }, [redoStack, notes, folders, activeNoteId]);

  useEffect(() => {
    undoRef.current = handleUndo;
    redoRef.current = handleRedo;
  });

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
    const target = notes.find((n) => n.id === noteId);
    if (!target || target.title === trimmed) return;

    const prevTitle = target.title;
    const nextNotes = notes.map((n) =>
      n.id === noteId ? { ...n, title: trimmed, updatedAt: Date.now() } : n
    );
    setNotes(nextNotes);
    StorageService.saveNotes(nextNotes);

    const action: VaultAction = {
      type: 'RENAME_NOTE',
      noteId,
      previousTitle: prevTitle,
      newTitle: trimmed,
    };
    setUndoStack((prev) => [action, ...prev.slice(0, 49)]);
    setRedoStack([]);

    showToast({
      id: `toast-${Date.now()}`,
      message: `Renamed to "${trimmed}"`,
      actionLabel: 'Undo',
      undoHint: true,
      onAction: () => undoRef.current(),
    });
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

    const action: VaultAction = {
      type: 'MOVE_NOTE',
      noteId,
      noteTitle: targetNote.title || 'Untitled',
      previousFolderId: prevFolderId,
      newFolderId: targetFolderId,
    };
    setUndoStack((prev) => [action, ...prev.slice(0, 49)]);
    setRedoStack([]);

    const targetFolder = folders.find((f) => f.id === targetFolderId);
    const folderName = targetFolder ? targetFolder.name : 'General';
    showToast({
      id: `toast-${Date.now()}`,
      message: `Moved "${targetNote.title || 'Untitled'}" to ${folderName}`,
      actionLabel: 'Undo',
      undoHint: true,
      onAction: () => undoRef.current(),
    });
  };

  const handleUpdateTags = (noteId: string, newTags: string[]) => {
    const target = notes.find((n) => n.id === noteId);
    if (!target) return;

    const prevTags = target.tags;
    const nextNotes = notes.map((n) =>
      n.id === noteId ? { ...n, tags: newTags, updatedAt: Date.now() } : n
    );
    setNotes(nextNotes);
    StorageService.saveNotes(nextNotes);

    const action: VaultAction = {
      type: 'UPDATE_TAGS',
      noteId,
      noteTitle: target.title || 'Untitled Document',
      previousTags: prevTags,
      newTags,
    };
    setUndoStack((prev) => [action, ...prev.slice(0, 49)]);
    setRedoStack([]);

    const added = newTags.filter((t) => !prevTags.includes(t));
    const removed = prevTags.filter((t) => !newTags.includes(t));
    const diffText =
      added.length > 0
        ? `Added tag #${added.join(', #')}`
        : removed.length > 0
        ? `Removed tag #${removed.join(', #')}`
        : 'Updated tags';

    showToast({
      id: `toast-${Date.now()}`,
      message: `${diffText} · "${target.title || 'Untitled'}"`,
      actionLabel: 'Undo',
      undoHint: true,
      onAction: () => undoRef.current(),
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
      type: 'DUPLICATE_NOTE',
      noteId: newNote.id,
      note: newNote,
      previousActiveNoteId: activeNoteId,
    };
    setUndoStack((prev) => [action, ...prev.slice(0, 49)]);
    setRedoStack([]);

    showToast({
      id: `toast-${Date.now()}`,
      message: `Duplicated "${sourceNote.title || 'Untitled'}"`,
      actionLabel: 'Undo',
      undoHint: true,
      onAction: () => undoRef.current(),
    });
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const target = folders.find((f) => f.id === folderId);
    if (!target || target.name === trimmed) return;

    const prevName = target.name;
    const nextFolders = folders.map((f) =>
      f.id === folderId ? { ...f, name: trimmed } : f
    );
    setFolders(nextFolders);
    StorageService.saveFolders(nextFolders);

    const action: VaultAction = {
      type: 'RENAME_FOLDER',
      folderId,
      previousName: prevName,
      newName: trimmed,
    };
    setUndoStack((prev) => [action, ...prev.slice(0, 49)]);
    setRedoStack([]);

    showToast({
      id: `toast-${Date.now()}`,
      message: `Renamed folder to "${trimmed}"`,
      actionLabel: 'Undo',
      undoHint: true,
      onAction: () => undoRef.current(),
    });
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

  const currentTheme = THEMES[settings.theme] || THEMES.charcoal;
  const isLightMode = isThemeLight(settings.theme);

  const themeClasses = isLightMode
    ? settings.theme === 'sakura'
      ? 'bg-[#ffffff] text-[#18181b]'
      : settings.theme === 'sepia'
      ? 'bg-[#fbf7ee] text-[#362b21]'
      : settings.theme === 'dreamscape'
      ? 'bg-[#faf7fc] text-[#1e1b4b]'
      : 'bg-[#f7f5f0] text-[#2c2a27]'
    : settings.theme === 'nordic'
    ? 'bg-[#0c1017] text-[#e2e8f0]'
    : settings.theme === 'evergreen'
    ? 'bg-[#09110d] text-[#dff0e6]'
    : 'bg-[#121315] text-[#dedad4]';

  const headerBorder = isLightMode
    ? settings.theme === 'sakura'
      ? 'border-[#e5e7eb]'
      : settings.theme === 'sepia'
      ? 'border-[#e7ddce]'
      : settings.theme === 'dreamscape'
      ? 'border-[#e8ddf0]'
      : 'border-[#e4e0d7]'
    : settings.theme === 'nordic'
    ? 'border-sky-500/15'
    : settings.theme === 'evergreen'
    ? 'border-emerald-500/15'
    : 'border-white/[0.07]';

  const headerBg = isLightMode
    ? settings.theme === 'sakura'
      ? 'bg-[#fafafc]/95'
      : settings.theme === 'sepia'
      ? 'bg-[#f5eedd]/95'
      : settings.theme === 'dreamscape'
      ? 'bg-[#f5f0f9]/95'
      : 'bg-[#f7f5f0]/90'
    : settings.theme === 'nordic'
    ? 'bg-[#111722]/95'
    : settings.theme === 'evergreen'
    ? 'bg-[#0f1a14]/95'
    : 'bg-[#151618]/90';

  const buttonHover = isLightMode ? 'hover:bg-black/[0.05]' : 'hover:bg-white/[0.06]';
  const activeBtn = isLightMode
    ? 'bg-black/[0.08] text-[#111] font-medium'
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
                src={isLightMode ? '/marrow wordmark logo dark.svg' : '/marrow wordmark logo.svg'}
                alt="Marrow"
                className="h-[13px] w-auto object-contain select-none opacity-90 -translate-y-[1px]"
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
              onClick={() => setIsTimelineOpen(!isTimelineOpen)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition ${
                isTimelineOpen ? activeBtn : `${buttonHover} text-neutral-400`
              }`}
              title="Timeline, Cadence & Sprints"
            >
              <Clock className="h-3 w-3" />
              <span>Timeline</span>
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

            <button
              onClick={() => {
                setCompileFolderId(null);
                setIsCompileOpen(true);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition ${
                isCompileOpen ? activeBtn : `${buttonHover} text-neutral-400`
              }`}
              title="Compile & Export Complete Manuscript"
            >
              <BookOpen className="h-3 w-3" />
              <span>Compile</span>
            </button>

            {/* Quick Theme Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                className={`p-1.5 rounded-md transition ${
                  isThemeMenuOpen ? activeBtn : `${buttonHover} text-neutral-400`
                }`}
                title={`Atmosphere Theme: ${currentTheme.name}`}
              >
                <Palette className="h-3.5 w-3.5" />
              </button>

              {isThemeMenuOpen && (
                <div
                  className={`absolute right-0 mt-1.5 w-52 rounded-lg border shadow-xl p-1.5 z-50 text-xs backdrop-blur-md ${
                    isLightMode
                      ? 'bg-[#fffefb]/95 border-black/10 text-[#222]'
                      : 'bg-[#18191c]/95 border-white/10 text-[#dedad4]'
                  }`}
                >
                  <div className="px-2 py-1 text-[10px] uppercase tracking-wider opacity-50 font-medium">
                    Editorial Theme
                  </div>
                  <div className="space-y-0.5">
                    {VALID_THEMES.map((themeId) => {
                      const th = THEMES[themeId];
                      const isSel = settings.theme === th.id;
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => {
                            handleUpdateSettings({ ...settings, theme: th.id });
                            setIsThemeMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition ${
                            isSel
                              ? isLightMode
                                ? 'bg-black/[0.08] font-semibold text-black'
                                : 'bg-white/[0.1] font-semibold text-white'
                              : isLightMode
                              ? 'hover:bg-black/[0.04]'
                              : 'hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: th.accentColor }}
                            />
                            <span className="truncate">{th.name}</span>
                          </div>
                          <span className="text-[10px] opacity-50 capitalize shrink-0">{th.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
            onOpenCompile={(folderId) => {
              setCompileFolderId(folderId || null);
              setIsCompileOpen(true);
            }}
            isLightMode={isLightMode}
            theme={settings.theme}
          />
        )}

        {/* Central Editor */}
        {activeNote ? (
          <Editor
            key={activeNote.id}
            note={activeNote}
            settings={settings}
            onUpdateNote={handleUpdateNote}
            onUpdateSettings={handleUpdateSettings}
            dailyWordsWritten={dailyProgress.wordsWritten}
            onResetDailyWords={handleResetDailyWords}
            onUpdateTags={handleUpdateTags}
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
              src={isLightMode ? '/marrow logo icon dark.svg' : '/marrow logo icon.svg'}
              alt="Marrow"
              className="h-8 w-8 mb-3 opacity-60"
            />
            <h3 className="text-base font-medium text-inherit mb-1">No Document Open</h3>
            <p className="text-xs max-w-sm mb-4 text-neutral-400">
              Select an entry from your vault or draft a new piece.
            </p>
            <button
              onClick={() => handleCreateNote(null)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 font-semibold text-xs rounded-lg transition shadow-sm hover:opacity-90 active:scale-95"
              style={{
                backgroundColor: currentTheme.tokens.accentColor,
                color: currentTheme.tokens.accentContrast,
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              New Draft
            </button>
          </div>
        )}

        {/* Timeline & Cadence Panel */}
        {!settings.focusMode && isTimelineOpen && (
          <TimelinePanel
            activeNote={activeNote}
            allNotes={notes}
            onSelectNote={(n) => setActiveNoteId(n.id)}
            onUpdateNote={handleUpdateNote}
            isLightMode={isLightMode}
            theme={settings.theme}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />
        )}

        {/* Obsidian Backlinks & Graph Panel */}
        {!settings.focusMode && isBacklinksOpen && (
          <BacklinksPanel
            activeNote={activeNote}
            allNotes={notes}
            onSelectNote={(n) => setActiveNoteId(n.id)}
            isLightMode={isLightMode}
            theme={settings.theme}
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
          theme={settings.theme}
        />
      )}

      {/* Manuscript Compiler Modal */}
      {isCompileOpen && (
        <CompileModal
          notes={notes}
          folders={folders}
          initialFolderId={compileFolderId}
          onClose={() => setIsCompileOpen(false)}
          isLightMode={isLightMode}
          theme={settings.theme}
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

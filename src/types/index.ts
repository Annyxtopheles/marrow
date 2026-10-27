export interface TimelineEntry {
  id: string;
  timestamp: number;
  note: string;
  type: 'revision' | 'sprint' | 'event' | 'milestone';
  wordCountSnapshot?: number;
}

export interface HistoryRecord {
  id: string;
  noteId: string;
  timestamp: number;
  content: string;
  title: string;
  wordCount: number;
}

export interface SceneBeat {
  id: string;
  text: string;
  done: boolean;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folderId: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  lastOpenedAt: number;
  wordCount: number;
  characterCount: number;
  pinned: boolean;
  favorite: boolean;
  targetWordCount?: number;
  inUniverseDate?: string;
  synopsis?: string;
  sceneBeats?: SceneBeat[];
  timelineLog: TimelineEntry[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color?: string;
  order: number;
}

export type ThemeMode =
  | 'charcoal'
  | 'canvas'
  | 'nordic'
  | 'sakura'
  | 'sepia'
  | 'evergreen';
export type FontFamily = 'serif' | 'sans' | 'mono';

export interface EditorSettings {
  theme: ThemeMode;
  fontFamily: FontFamily;
  fontSize: number; // in px, default 19
  lineHeight: number; // default 1.8
  paragraphSpacing: number; // in px, default 18
  typewriterMode: boolean;
  breathingCursor: boolean;
  soundEffects: boolean;
  autoSaveDelayMs: number;
  showLineNumbers: boolean;
  focusMode: boolean;
  dualModePreview: boolean;
  dailyWordGoal?: number; // default 1000
  activeGoalView?: 'chapter' | 'daily'; // default 'chapter'
}

export interface WritingSprint {
  active: boolean;
  startTime: number;
  durationMinutes: number;
  startWordCount: number;
  targetWords: number;
}

export type VaultAction =
  | {
      type: 'DELETE_NOTE';
      note: Note;
      index: number;
      previousActiveNoteId: string | null;
    }
  | {
      type: 'CREATE_NOTE';
      noteId: string;
      note: Note;
      previousActiveNoteId: string | null;
    }
  | {
      type: 'DUPLICATE_NOTE';
      noteId: string;
      note: Note;
      previousActiveNoteId: string | null;
    }
  | {
      type: 'TOGGLE_PIN';
      noteId: string;
      noteTitle: string;
      previousPinned: boolean;
    }
  | {
      type: 'RENAME_NOTE';
      noteId: string;
      previousTitle: string;
      newTitle: string;
    }
  | {
      type: 'MOVE_NOTE';
      noteId: string;
      noteTitle: string;
      previousFolderId: string | null;
      newFolderId: string | null;
    }
  | {
      type: 'UPDATE_TAGS';
      noteId: string;
      noteTitle: string;
      previousTags: string[];
      newTags: string[];
    }
  | {
      type: 'CREATE_FOLDER';
      folder: Folder;
    }
  | {
      type: 'RENAME_FOLDER';
      folderId: string;
      previousName: string;
      newName: string;
    }
  | {
      type: 'DELETE_FOLDER';
      folder: Folder;
      affectedNotes: { noteId: string; previousFolderId: string | null }[];
    };

export interface ToastNotification {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  undoHint?: boolean;
}


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
  inUniverseDate?: string; // Story / Plot date (e.g., "Year 1024, High Summer", "1945-08-15")
  timelineLog: TimelineEntry[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color?: string;
  order: number;
}

export type ThemeMode = 'amoled' | 'slate' | 'paper' | 'ivory';
export type FontFamily = 'serif' | 'sans' | 'mono';

export interface EditorSettings {
  theme: ThemeMode;
  fontFamily: FontFamily;
  fontSize: number; // in px, default 18
  lineHeight: number; // default 1.75
  paragraphSpacing: number; // in px, default 16
  typewriterMode: boolean; // keep active line in center
  breathingCursor: boolean;
  soundEffects: boolean;
  autoSaveDelayMs: number; // default 200ms
  showLineNumbers: boolean;
  focusMode: boolean; // hide sidebars
  dualModePreview: boolean; // live preview vs split markdown
}

export interface WritingSprint {
  active: boolean;
  startTime: number;
  durationMinutes: number;
  startWordCount: number;
  targetWords: number;
}

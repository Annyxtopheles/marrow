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
  inUniverseDate?: string;
  timelineLog: TimelineEntry[];
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  color?: string;
  order: number;
}

export type ThemeMode = 'charcoal' | 'canvas';
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
}

export interface WritingSprint {
  active: boolean;
  startTime: number;
  durationMinutes: number;
  startWordCount: number;
  targetWords: number;
}

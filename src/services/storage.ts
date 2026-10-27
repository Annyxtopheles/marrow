import type { Note, Folder, HistoryRecord, EditorSettings } from '../types';
import { IndexedDBService } from './db';

const STORAGE_KEY_NOTES = 'marrow_notes_v1';
const STORAGE_KEY_FOLDERS = 'marrow_folders_v1';
const STORAGE_KEY_HISTORY = 'marrow_history_v1';
const STORAGE_KEY_SETTINGS = 'marrow_settings_v1';
const STORAGE_KEY_TRASH = 'marrow_trash_v1';

export const DEFAULT_SETTINGS: EditorSettings = {
  theme: 'charcoal',
  fontFamily: 'sans',
  fontSize: 19,
  lineHeight: 1.85,
  paragraphSpacing: 18,
  typewriterMode: false,
  breathingCursor: true,
  soundEffects: false,
  autoSaveDelayMs: 150,
  showLineNumbers: false,
  focusMode: false,
  dualModePreview: false,
};

const SEED_FOLDERS: Folder[] = [
  { id: 'f-novel', name: 'The Obsidian Spire', parentId: null, order: 1 },
  { id: 'f-world', name: 'Worldbuilding & Lore', parentId: 'f-novel', order: 1 },
  { id: 'f-characters', name: 'Character Dossiers', parentId: 'f-novel', order: 2 },
  { id: 'f-journal', name: 'Daily Chrono Logs', parentId: null, order: 2 },
];

const SEED_NOTES: Note[] = [
  {
    id: 'note-prologue',
    title: 'Chapter 1: The Echoes of Solitude',
    folderId: 'f-novel',
    tags: ['manuscript', 'act1', 'draft'],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 3600000 * 2,
    lastOpenedAt: Date.now(),
    wordCount: 382,
    characterCount: 2210,
    pinned: true,
    favorite: true,
    inUniverseDate: 'Era of Glass, Cycle 412 - Dawn',
    timelineLog: [
      {
        id: 'tl-1',
        timestamp: Date.now() - 86400000 * 3,
        note: 'First draft outline established.',
        type: 'milestone',
        wordCountSnapshot: 150,
      },
      {
        id: 'tl-2',
        timestamp: Date.now() - 86400000 * 1,
        note: 'Expanded the confrontation scene with [[Kaelen Vance]].',
        type: 'revision',
        wordCountSnapshot: 320,
      },
      {
        id: 'tl-3',
        timestamp: Date.now() - 3600000 * 2,
        note: 'Polished cadence, adjusted typewriter sensory rhythm.',
        type: 'sprint',
        wordCountSnapshot: 382,
      },
    ],
    content: `<p>The dawn broke over the obsidian ridge not with fire, but with a whisper of silver mist. In the quiet heights of the high tower, every keystroke felt indelible.</p><p>She watched the lantern smoke coil against the rafters, recalling what [[Elena Vane]] had whispered before departing for the borderlands: <em>"A story is not written once; it is etched into the grain of time, line by line."</em></p><p>Beyond the courtyard gates, the scouts of [[The Iron Concord]] were already preparing their march. She checked the ancient seal on the manuscript parchment. The ink had dried hours ago, but the weight of the decree remained fresh.</p><blockquote><p>"He who masters the stillness of the cursor masters the mind."</p></blockquote><p>With a slow breath, she placed both hands back upon the desk, letting the stillness of the morning guide the next chapter.</p>`,
  },
  {
    id: 'note-elena',
    title: 'Elena Vane',
    folderId: 'f-characters',
    tags: ['characters', 'protagonist', 'archivist'],
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 2,
    lastOpenedAt: Date.now() - 86400000 * 2,
    wordCount: 195,
    characterCount: 1150,
    pinned: true,
    favorite: false,
    inUniverseDate: 'Born Cycle 388, Southern Vale',
    timelineLog: [
      {
        id: 'tl-elena-1',
        timestamp: Date.now() - 86400000 * 5,
        note: 'Character conceptualized from JotterPad character template.',
        type: 'milestone',
      },
    ],
    content: `<p><strong>Role:</strong> Keeper of the Timelines &amp; Chief Archivist</p><p><strong>Traits:</strong> Meticulous, vigilant, haunted by lost drafts.</p><p><strong>Connections:</strong> Appears prominently in [[Chapter 1: The Echoes of Solitude]], adversarial history with [[The Iron Concord]].</p><p>Elena carries an antique brass time-tracker that counts down the cycles until the convergence. Her dialogue is sparse, measured, and always purposeful.</p>`,
  },
  {
    id: 'note-concord',
    title: 'The Iron Concord',
    folderId: 'f-world',
    tags: ['factions', 'lore', 'military'],
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 4,
    lastOpenedAt: Date.now() - 86400000 * 4,
    wordCount: 142,
    characterCount: 890,
    pinned: false,
    favorite: false,
    inUniverseDate: 'Founded Era of Iron, Cycle 204',
    timelineLog: [],
    content: `<p>A militaristic monastic order dedicated to cataloging and seizing historical artifacts before the Great Collapse.</p><p>First mentioned as an looming threat in [[Chapter 1: The Echoes of Solitude]]. They believe that words written without restraint degrade the fabric of memory.</p>`,
  },
  {
    id: 'note-journal',
    title: 'TimeLog & Writing Rituals',
    folderId: 'f-journal',
    tags: ['habits', 'timejot', 'reflection'],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 1800000,
    lastOpenedAt: Date.now() - 1800000,
    wordCount: 160,
    characterCount: 950,
    pinned: false,
    favorite: true,
    inUniverseDate: 'Real World / Habit Tracker',
    timelineLog: [
      {
        id: 'tl-j-1',
        timestamp: Date.now() - 86400000 * 2,
        note: '25-minute sprint: 450 words completed.',
        type: 'sprint',
      },
      {
        id: 'tl-j-2',
        timestamp: Date.now() - 1800000,
        note: 'Switched to Canvas Linen theme. Writing flow state achieved.',
        type: 'event',
      },
    ],
    content: `<p>Notes on writing cadence, interval tracking, and sprint milestones.</p><p><strong>Marrow Fail-safe:</strong> Not a single stroke lost. The history scrubber allows continuous time-travel across draft sessions.</p><p><strong>Obsidian Graph:</strong> Interlinks connecting [[Elena Vane]] and [[The Iron Concord]] form the backbone of the plot.</p>`,
  },
];

export const StorageService = {
  getNotes(): Note[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_NOTES) || localStorage.getItem('purejot_notes_v1');
      if (!data) {
        localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(SEED_NOTES));
        return SEED_NOTES;
      }
      const parsed: Note[] = JSON.parse(data);
      return parsed.map((n) => ({
        ...n,
        content: n.content.replace(/^<h1>.*?<\/h1>/i, ''),
      }));
    } catch {
      return SEED_NOTES;
    }
  },

  saveNotes(notes: Note[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_NOTES, JSON.stringify(notes));
      IndexedDBService.saveAllNotes(notes);
    } catch (e) {
      console.error('Failed to save notes to localStorage', e);
      // Fallback directly to IndexedDB if localStorage quota exceeded
      IndexedDBService.saveAllNotes(notes);
    }
  },

  getFolders(): Folder[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_FOLDERS) || localStorage.getItem('purejot_folders_v1');
      if (!data) {
        localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(SEED_FOLDERS));
        IndexedDBService.saveAllFolders(SEED_FOLDERS);
        return SEED_FOLDERS;
      }
      return JSON.parse(data);
    } catch {
      return SEED_FOLDERS;
    }
  },

  saveFolders(folders: Folder[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_FOLDERS, JSON.stringify(folders));
      IndexedDBService.saveAllFolders(folders);
    } catch (e) {
      console.error('Failed to save folders', e);
      IndexedDBService.saveAllFolders(folders);
    }
  },

  getSettings(): EditorSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SETTINGS) || localStorage.getItem('purejot_settings_v1');
      if (!data) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(data);
      const validTheme = parsed.theme === 'canvas' ? 'canvas' : 'charcoal';
      return { ...DEFAULT_SETTINGS, ...parsed, theme: validTheme };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: EditorSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  },

  getTrash(): Note[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_TRASH);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveTrash(trash: Note[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_TRASH, JSON.stringify(trash.slice(0, 100)));
    } catch (e) {
      console.error('Failed to save trash', e);
    }
  },

  moveToTrash(note: Note): void {
    const trash = this.getTrash().filter((n) => n.id !== note.id);
    this.saveTrash([note, ...trash]);
  },

  restoreFromTrash(noteId: string): Note | null {
    const trash = this.getTrash();
    const note = trash.find((n) => n.id === noteId) || null;
    if (note) {
      this.saveTrash(trash.filter((n) => n.id !== noteId));
    }
    return note;
  },

  getHistory(noteId: string): HistoryRecord[] {
    try {
      const data =
        localStorage.getItem(`${STORAGE_KEY_HISTORY}_${noteId}`) ||
        localStorage.getItem(`purejot_history_v1_${noteId}`);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  addHistoryRecord(record: HistoryRecord): void {
    try {
      const key = `${STORAGE_KEY_HISTORY}_${record.noteId}`;
      const records = this.getHistory(record.noteId);
      const updated = [record, ...records.slice(0, 99)];
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save history snapshot', e);
    }
  },

  findBacklinks(targetTitle: string, allNotes: Note[]): Note[] {
    if (!targetTitle) return [];
    const normalizedTarget = targetTitle.trim().toLowerCase();
    return allNotes.filter((note) => {
      if (note.title.trim().toLowerCase() === normalizedTarget) return false;
      const lowerContent = note.content.toLowerCase();
      return (
        lowerContent.includes(`[[${normalizedTarget}]]`) ||
        lowerContent.includes(`[[${targetTitle.trim()}]]`) ||
        lowerContent.includes(`>${targetTitle.trim()}<`)
      );
    });
  },

  formatInterval(timestamp: number): string {
    const diffMs = Date.now() - timestamp;
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  },
};

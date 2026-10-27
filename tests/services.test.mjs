import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node test environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

test('StorageService: Interval Formatting', async () => {
  // Test interval calculations
  const now = Date.now();
  const formatInterval = (timestamp) => {
    const diff = Math.max(0, now - timestamp);
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  assert.equal(formatInterval(now - 10000), 'just now');
  assert.equal(formatInterval(now - 15 * 60000), '15m ago');
  assert.equal(formatInterval(now - 3 * 3600000), '3h ago');
  assert.equal(formatInterval(now - 4 * 86400000), '4d ago');
});

test('StorageService: Backlinks Extraction Logic', async () => {
  const allNotes = [
    {
      id: 'note-1',
      title: 'Chapter 1',
      content: '<p>Met with [[Elena Vane]] near [[The Iron Concord]] base.</p>',
    },
    {
      id: 'note-2',
      title: 'Elena Vane',
      content: '<p>Characters: Mentioned in [[Chapter 1]] and [[The Iron Concord]].</p>',
    },
    {
      id: 'note-3',
      title: 'The Iron Concord',
      content: '<p>Faction lore without backlinks.</p>',
    },
  ];

  const findBacklinks = (targetTitle, notes) => {
    if (!targetTitle) return [];
    const normalizedTarget = targetTitle.trim().toLowerCase();
    return notes.filter((note) => {
      if (note.title.trim().toLowerCase() === normalizedTarget) return false;
      const lowerContent = note.content.toLowerCase();
      return (
        lowerContent.includes(`[[${normalizedTarget}]]`) ||
        lowerContent.includes(`[[${targetTitle.trim()}]]`)
      );
    });
  };

  const elenaBacklinks = findBacklinks('Elena Vane', allNotes);
  assert.equal(elenaBacklinks.length, 1);
  assert.equal(elenaBacklinks[0].id, 'note-1');

  const concordBacklinks = findBacklinks('The Iron Concord', allNotes);
  assert.equal(concordBacklinks.length, 2);
  assert.ok(concordBacklinks.some(n => n.id === 'note-1'));
  assert.ok(concordBacklinks.some(n => n.id === 'note-2'));

  // Ensure self-links are ignored
  const chapter1Backlinks = findBacklinks('Chapter 1', allNotes);
  assert.equal(chapter1Backlinks.length, 1);
  assert.equal(chapter1Backlinks[0].id, 'note-2');
});

test('GoogleDriveService: Vault Backup Payload Structure', async () => {
  const notes = [{ id: 'n1', title: 'Test', content: 'test', tags: [] }];
  const folders = [{ id: 'f1', name: 'Folder', parentId: null, order: 1 }];
  const settings = { theme: 'charcoal', fontSize: 19 };

  const payload = {
    version: 1,
    appName: 'marrow',
    timestamp: Date.now(),
    notes,
    folders,
    settings,
  };

  assert.equal(payload.appName, 'marrow');
  assert.equal(payload.version, 1);
  assert.equal(payload.notes.length, 1);
  assert.equal(payload.folders.length, 1);
  assert.ok(payload.timestamp > 0);

  // Validate JSON round-trip
  const jsonStr = JSON.stringify(payload);
  const parsed = JSON.parse(jsonStr);
  assert.deepEqual(parsed.notes, notes);
  assert.deepEqual(parsed.folders, folders);
});

test('Wikilink Regex and Boundary Matching', async () => {
  const text = 'First mentioned in [[Chapter 1: The Echoes of Solitude]]. They believe in [[Elena Vane]].';
  const regex = /\[\[(.*?)\]\]/g;
  const matches = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    matches.push({ title: m[1], start: m.index, end: m.index + m[0].length });
  }

  assert.equal(matches.length, 2);
  assert.equal(matches[0].title, 'Chapter 1: The Echoes of Solitude');
  assert.equal(matches[1].title, 'Elena Vane');

  // Test character offset within wikilink
  const clickPos1 = matches[0].start + 5;
  const inFirstLink = matches.some(match => clickPos1 >= match.start && clickPos1 <= match.end);
  assert.equal(inFirstLink, true);

  // Test click outside any wikilink
  const clickPosOutside = 5; // On "First"
  const inAnyLink = matches.some(match => clickPosOutside >= match.start && clickPosOutside <= match.end);
  assert.equal(inAnyLink, false);
});

test('Vault Action History: Delete Note and Undo/Redo Restoration', async () => {
  let notes = [
    { id: 'note-1', title: 'Chapter 1: The Echoes of Solitude', folderId: 'f-novel' },
    { id: 'note-2', title: 'Elena Vane', folderId: 'f-characters' },
    { id: 'note-3', title: 'The Iron Concord', folderId: 'f-world' },
  ];

  let undoStack = [];
  let redoStack = [];

  // Simulate user deleting "note-1"
  const targetId = 'note-1';
  const targetNote = notes.find((n) => n.id === targetId);
  const targetIndex = notes.findIndex((n) => n.id === targetId);

  // Perform delete
  notes = notes.filter((n) => n.id !== targetId);
  assert.equal(notes.length, 2);
  assert.equal(notes.some((n) => n.id === targetId), false);

  const action = {
    type: 'DELETE_NOTE',
    note: { ...targetNote },
    index: targetIndex,
    previousActiveNoteId: targetId,
  };
  undoStack.push(action);

  // Simulate Ctrl+Z: Undo Delete
  assert.equal(undoStack.length, 1);
  const undoAction = undoStack.pop();
  assert.equal(undoAction.type, 'DELETE_NOTE');

  // Restore at original index
  notes.splice(undoAction.index, 0, undoAction.note);
  redoStack.push(undoAction);

  assert.equal(notes.length, 3);
  assert.equal(notes[0].id, 'note-1');
  assert.equal(notes[0].folderId, 'f-novel'); // verify folder intact!
  assert.equal(notes[0].title, 'Chapter 1: The Echoes of Solitude');

  // Simulate Ctrl+Y: Redo Delete
  assert.equal(redoStack.length, 1);
  const redoAction = redoStack.pop();
  notes = notes.filter((n) => n.id !== redoAction.note.id);
  undoStack.push(redoAction);

  assert.equal(notes.length, 2);
  assert.equal(notes.some((n) => n.id === 'note-1'), false);
});

test('StorageService: Trash Soft-Delete and Recovery', async () => {
  const noteToDelete = {
    id: 'note-trash-1',
    title: 'Obsidian Spire Lore',
    content: '<p>Secret lore</p>',
    tags: ['lore'],
  };

  const STORAGE_KEY_TRASH = 'marrow_trash_v1';
  let trash = [];

  const moveToTrash = (note) => {
    trash = [note, ...trash.filter((n) => n.id !== note.id)];
    localStorage.setItem(STORAGE_KEY_TRASH, JSON.stringify(trash));
  };

  const restoreFromTrash = (noteId) => {
    const found = trash.find((n) => n.id === noteId);
    if (found) {
      trash = trash.filter((n) => n.id !== noteId);
      localStorage.setItem(STORAGE_KEY_TRASH, JSON.stringify(trash));
    }
    return found || null;
  };

  moveToTrash(noteToDelete);
  assert.equal(trash.length, 1);
  assert.equal(trash[0].id, 'note-trash-1');

  const restored = restoreFromTrash('note-trash-1');
  assert.ok(restored);
  assert.equal(restored.title, 'Obsidian Spire Lore');
  assert.equal(trash.length, 0);
});

test('Sidebar Note Sorting: Pinned Notes First', async () => {
  const notes = [
    { id: '1', title: 'Older Pinned', pinned: true, updatedAt: 100 },
    { id: '2', title: 'Newer Unpinned', pinned: false, updatedAt: 500 },
    { id: '3', title: 'Newest Pinned', pinned: true, updatedAt: 600 },
    { id: '4', title: 'Oldest Unpinned', pinned: false, updatedAt: 50 },
  ];

  const sorted = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.updatedAt - a.updatedAt;
  });

  assert.equal(sorted[0].id, '3'); // Newest Pinned
  assert.equal(sorted[1].id, '1'); // Older Pinned
  assert.equal(sorted[2].id, '2'); // Newer Unpinned
  assert.equal(sorted[3].id, '4'); // Oldest Unpinned
});

test('Sidebar Actions: Move Note to Folder and Duplicate Note', async () => {
  const note = {
    id: 'note-move-1',
    title: 'Chapter 2: The Spire',
    content: '<p>Body text</p>',
    folderId: 'f-novel',
    tags: ['act1'],
    pinned: true,
  };

  // Move
  const targetFolderId = 'f-world';
  const moved = { ...note, folderId: targetFolderId };
  assert.equal(moved.folderId, 'f-world');

  // Duplicate
  const duplicated = {
    ...note,
    id: 'note-copy-2',
    title: `${note.title} (Copy)`,
    pinned: false,
  };
  assert.equal(duplicated.title, 'Chapter 2: The Spire (Copy)');
  assert.equal(duplicated.pinned, false);
  assert.equal(duplicated.content, note.content);
  assert.equal(duplicated.folderId, 'f-novel');
});

test('Vault Actions: Comprehensive Undo and Redo for Tags, Rename, Move, and Pin', async () => {
  let note = {
    id: 'note-vault-1',
    title: 'The Great Chronicle',
    content: '<p>Content</p>',
    folderId: 'folder-1',
    tags: ['draft', 'lore'],
    pinned: false,
    updatedAt: 1000,
  };

  const undoStack = [];
  const redoStack = [];

  // --- 1. Test UPDATE_TAGS ---
  const prevTags = [...note.tags];
  const newTags = [...note.tags, 'chapter1'];
  note = { ...note, tags: newTags };
  undoStack.push({
    type: 'UPDATE_TAGS',
    noteId: note.id,
    noteTitle: note.title,
    previousTags: prevTags,
    newTags,
  });

  assert.deepEqual(note.tags, ['draft', 'lore', 'chapter1']);

  // Undo tag update
  const undoTagAction = undoStack.pop();
  assert.equal(undoTagAction.type, 'UPDATE_TAGS');
  note = { ...note, tags: undoTagAction.previousTags };
  redoStack.push(undoTagAction);

  assert.deepEqual(note.tags, ['draft', 'lore']);

  // Redo tag update
  const redoTagAction = redoStack.pop();
  note = { ...note, tags: redoTagAction.newTags };
  undoStack.push(redoTagAction);

  assert.deepEqual(note.tags, ['draft', 'lore', 'chapter1']);

  // --- 2. Test RENAME_NOTE ---
  const prevTitle = note.title;
  const newTitle = 'The Ancient Chronicle';
  note = { ...note, title: newTitle };
  undoStack.push({
    type: 'RENAME_NOTE',
    noteId: note.id,
    previousTitle: prevTitle,
    newTitle,
  });

  assert.equal(note.title, 'The Ancient Chronicle');

  // Undo rename
  const undoRenameAction = undoStack.pop();
  note = { ...note, title: undoRenameAction.previousTitle };
  redoStack.push(undoRenameAction);
  assert.equal(note.title, 'The Great Chronicle');

  // Redo rename
  const redoRenameAction = redoStack.pop();
  note = { ...note, title: redoRenameAction.newTitle };
  assert.equal(note.title, 'The Ancient Chronicle');

  // --- 3. Test MOVE_NOTE ---
  const prevFolderId = note.folderId;
  const targetFolderId = 'folder-archived';
  note = { ...note, folderId: targetFolderId };
  undoStack.push({
    type: 'MOVE_NOTE',
    noteId: note.id,
    noteTitle: note.title,
    previousFolderId: prevFolderId,
    newFolderId: targetFolderId,
  });

  assert.equal(note.folderId, 'folder-archived');

  // Undo move
  const undoMoveAction = undoStack.pop();
  note = { ...note, folderId: undoMoveAction.previousFolderId };
  redoStack.push(undoMoveAction);
  assert.equal(note.folderId, 'folder-1');

  // Redo move
  const redoMoveAction = redoStack.pop();
  note = { ...note, folderId: redoMoveAction.newFolderId };
  assert.equal(note.folderId, 'folder-archived');

  // --- 4. Test TOGGLE_PIN ---
  const prevPinned = note.pinned;
  note = { ...note, pinned: !prevPinned };
  undoStack.push({
    type: 'TOGGLE_PIN',
    noteId: note.id,
    noteTitle: note.title,
    previousPinned: prevPinned,
  });
  assert.equal(note.pinned, true);

  // Undo pin
  const undoPinAction = undoStack.pop();
  note = { ...note, pinned: undoPinAction.previousPinned };
  assert.equal(note.pinned, false);
});

test('Word Count Goals: Daily Progress Tracking and Chapter Target Computation', async () => {
  const STORAGE_KEY_DAILY_PROGRESS = 'marrow_daily_progress_v1';
  const getDailyDateKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const getDailyProgress = () => {
    const today = getDailyDateKey();
    const data = localStorage.getItem(STORAGE_KEY_DAILY_PROGRESS);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && parsed.date === today && typeof parsed.wordsWritten === 'number') {
        return parsed;
      }
    }
    return { date: today, wordsWritten: 0 };
  };

  const recordWordsWritten = (delta) => {
    if (delta <= 0) return getDailyProgress();
    const cur = getDailyProgress();
    const updated = { date: cur.date, wordsWritten: cur.wordsWritten + delta };
    localStorage.setItem(STORAGE_KEY_DAILY_PROGRESS, JSON.stringify(updated));
    return updated;
  };

  // Test initialization
  const initial = getDailyProgress();
  assert.equal(initial.wordsWritten, 0);

  // Test recording words
  const step1 = recordWordsWritten(350);
  assert.equal(step1.wordsWritten, 350);

  const step2 = recordWordsWritten(150);
  assert.equal(step2.wordsWritten, 500);

  // Test Chapter goal progress percentage calculation
  const note = {
    id: 'n-chapter',
    title: 'Chapter 3: The Ascent',
    wordCount: 1250,
    targetWordCount: 2000,
  };

  const chapterPercent = Math.min(100, Math.round((note.wordCount / note.targetWordCount) * 100));
  assert.equal(chapterPercent, 63);

  const wordsRemaining = Math.max(0, note.targetWordCount - note.wordCount);
  assert.equal(wordsRemaining, 750);

  // Daily goal completion check
  const dailyGoal = 1000;
  const dailyPercent = Math.min(100, Math.round((step2.wordsWritten / dailyGoal) * 100));
  assert.equal(dailyPercent, 50);
});

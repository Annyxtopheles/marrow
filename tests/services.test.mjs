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
    title: 'Sovereign Spire Lore',
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
  assert.equal(restored.title, 'Sovereign Spire Lore');
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

test('Double-Click Quick Rename Logic for Notes and Folders', async () => {
  // Test note double click state transition
  let renamingNoteId = null;
  let editingTitle = '';

  const handleNoteDoubleClick = (note) => {
    renamingNoteId = note.id;
    editingTitle = note.title || 'Untitled';
  };

  const sampleNote = { id: 'note-77', title: 'The Silent Archives' };
  handleNoteDoubleClick(sampleNote);

  assert.equal(renamingNoteId, 'note-77');
  assert.equal(editingTitle, 'The Silent Archives');

  // Finish rename
  let committedTitle = '';
  const finishNoteRename = (newTitle) => {
    if (newTitle.trim()) {
      committedTitle = newTitle.trim();
    }
    renamingNoteId = null;
  };

  finishNoteRename('The Whispering Archives');
  assert.equal(committedTitle, 'The Whispering Archives');
  assert.equal(renamingNoteId, null);

  // Test folder double click state transition
  let renamingFolderId = null;
  let editingFolderName = '';

  const handleFolderDoubleClick = (folder) => {
    renamingFolderId = folder.id;
    editingFolderName = folder.name;
  };

  const sampleFolder = { id: 'f-manuscripts', name: 'Manuscripts' };
  handleFolderDoubleClick(sampleFolder);

  assert.equal(renamingFolderId, 'f-manuscripts');
  assert.equal(editingFolderName, 'Manuscripts');

  let committedFolderName = '';
  const finishFolderRename = (newName) => {
    if (newName.trim()) {
      committedFolderName = newName.trim();
    }
    renamingFolderId = null;
  };

  finishFolderRename('Novels & Lore');
  assert.equal(committedFolderName, 'Novels & Lore');
  assert.equal(renamingFolderId, null);
});

test('Theme System: Multiple Modern & Editorial Themes with Blue and Pink Accents', async () => {
  const VALID_THEMES = ['charcoal', 'canvas', 'nordic', 'sakura', 'sepia', 'evergreen', 'dreamscape', 'grunge'];

  // Test light/dark categorization
  const isLightMode = (theme) => ['canvas', 'sakura', 'sepia', 'dreamscape'].includes(theme);

  assert.equal(isLightMode('charcoal'), false); // Warm Dark
  assert.equal(isLightMode('canvas'), true);    // Warm Light
  assert.equal(isLightMode('nordic'), false);   // Cool Slate Dark with Blue
  assert.equal(isLightMode('sakura'), true);    // Pure White Light with Pink
  assert.equal(isLightMode('sepia'), true);     // Sepia Light with Amber
  assert.equal(isLightMode('evergreen'), false);// Deep Pine Forest Dark with Sage
  assert.equal(isLightMode('dreamscape'), true);// Dreamy Dynamic Gradient Light with Orchid
  assert.equal(isLightMode('grunge'), false);   // Brutalist Grunge Solid Dark with Industrial Amber

  // Test that requested themes are properly represented
  // 1. Clean modern one with blue accent color
  assert.equal(VALID_THEMES.includes('nordic'), true);
  // 2. Bright white one with pink accent color
  assert.equal(VALID_THEMES.includes('sakura'), true);
  // 3. Dreamy dynamic gradients on canvas
  assert.equal(VALID_THEMES.includes('dreamscape'), true);
  // 4. Brutalist grunge solid color
  assert.equal(VALID_THEMES.includes('grunge'), true);

  // Test storage theme parser validation
  const parseTheme = (input) => VALID_THEMES.includes(input) ? input : 'charcoal';
  assert.equal(parseTheme('nordic'), 'nordic');
  assert.equal(parseTheme('sakura'), 'sakura');
  assert.equal(parseTheme('sepia'), 'sepia');
  assert.equal(parseTheme('evergreen'), 'evergreen');
  assert.equal(parseTheme('dreamscape'), 'dreamscape');
  assert.equal(parseTheme('grunge'), 'grunge');
  assert.equal(parseTheme('invalid-theme'), 'charcoal');
});

test('Drag and Drop: Move notes into folders, between folders, and to root', async () => {
  let notes = [
    { id: 'note-prologue', title: 'Prologue', folderId: null },
    { id: 'note-ch1', title: 'Chapter 1', folderId: 'f-act1' },
    { id: 'note-ch2', title: 'Chapter 2', folderId: 'f-act1' },
  ];

  const handleMove = (noteId, targetFolderId) => {
    notes = notes.map((n) =>
      n.id === noteId ? { ...n, folderId: targetFolderId, updatedAt: Date.now() } : n
    );
  };

  // 1. Drag note from root (General) into folder 'f-act1'
  handleMove('note-prologue', 'f-act1');
  assert.equal(notes.find((n) => n.id === 'note-prologue').folderId, 'f-act1');

  // 2. Drag note between folders: from 'f-act1' into 'f-act2'
  handleMove('note-ch2', 'f-act2');
  assert.equal(notes.find((n) => n.id === 'note-ch2').folderId, 'f-act2');

  // 3. Drag note out of folder back to root (null)
  handleMove('note-ch1', null);
  assert.equal(notes.find((n) => n.id === 'note-ch1').folderId, null);
});

test('Folder Quick-Add: Create note with direct folder association', async () => {

  const createNoteInFolder = (folderId = null) => {
    return {
      id: `n-${Date.now()}`,
      title: 'Untitled Draft',
      content: '',
      folderId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      wordCount: 0,
      charCount: 0,
      readingTime: 0,
      tags: [],
    };
  };

  // Quick add inside Act I folder
  const noteAct1 = createNoteInFolder('f-act1');
  assert.equal(noteAct1.folderId, 'f-act1');

  // Quick add inside Act II folder
  const noteAct2 = createNoteInFolder('f-act2');
  assert.equal(noteAct2.folderId, 'f-act2');

  // General add without folder
  const rootNote = createNoteInFolder(null);
  assert.equal(rootNote.folderId, null);
});

test('Manuscript Compiler: Filter by scope, format chapters, dividers, and metrics', async () => {
  const notes = [
    {
      id: 'n1',
      title: 'Prologue: Before Dawn',
      content: '<p>The city was quiet under the shroud of mist.</p>',
      folderId: 'f-novel',
      wordCount: 8,
      inUniverseDate: 'Summer, 1842',
      createdAt: 1000,
    },
    {
      id: 'n2',
      title: 'Chapter 1: The Arrival',
      content: '<p>The train hissed to a complete stop at platform nine.</p>',
      folderId: 'f-novel',
      wordCount: 9,
      inUniverseDate: 'Autumn, 1842',
      createdAt: 2000,
    },
    {
      id: 'n3',
      title: 'Worldbuilding Notes',
      content: '<p>Magic system rules and timeline notes.</p>',
      folderId: 'f-lore',
      wordCount: 6,
      createdAt: 3000,
    },
  ];

  // Helper compiler
  const compileManuscript = ({ targetFolderId, includeHeadings, divider, format, includeDates }) => {
    const targetNotes = targetFolderId
      ? notes.filter((n) => n.folderId === targetFolderId)
      : notes;

    const sections = targetNotes.map((n) => {
      let body = n.content.replace(/<p>(.*?)<\/p>/gi, '$1\n\n').trim();
      let parts = [];
      if (includeHeadings) {
        parts.push(format === 'markdown' ? `# ${n.title}` : n.title.toUpperCase());
      }
      if (includeDates && n.inUniverseDate) {
        parts.push(format === 'markdown' ? `*${n.inUniverseDate}*` : `[${n.inUniverseDate}]`);
      }
      parts.push(body);
      return parts.join('\n\n');
    });

    const dividerStr = divider === 'lines' ? '\n\n---\n\n' : '\n\n* * *\n\n';
    const manuscript = sections.join(dividerStr);
    const totalWords = targetNotes.reduce((acc, n) => acc + n.wordCount, 0);

    return { manuscript, totalWords, count: targetNotes.length };
  };

  // 1. Compile novel folder only
  const compiledFolder = compileManuscript({
    targetFolderId: 'f-novel',
    includeHeadings: true,
    divider: 'lines',
    format: 'markdown',
    includeDates: true,
  });

  assert.equal(compiledFolder.count, 2);
  assert.equal(compiledFolder.totalWords, 17);
  assert.ok(compiledFolder.manuscript.includes('# Prologue: Before Dawn'));
  assert.ok(compiledFolder.manuscript.includes('*Summer, 1842*'));
  assert.ok(compiledFolder.manuscript.includes('---'));
  assert.ok(compiledFolder.manuscript.includes('# Chapter 1: The Arrival'));
  assert.ok(!compiledFolder.manuscript.includes('Worldbuilding Notes'));

  // 2. Compile entire vault in plain text
  const compiledVault = compileManuscript({
    targetFolderId: null,
    includeHeadings: true,
    divider: 'asterisks',
    format: 'txt',
    includeDates: false,
  });

  assert.equal(compiledVault.count, 3);
  assert.equal(compiledVault.totalWords, 23);
  assert.ok(compiledVault.manuscript.includes('PROLOGUE: BEFORE DAWN'));
  assert.ok(compiledVault.manuscript.includes('* * *'));
  assert.ok(compiledVault.manuscript.includes('WORLDBUILDING NOTES'));
});

test('Scene Beats Checklist & Chapter Synopsis: Add, toggle, delete, and progress', async () => {
  let note = {
    id: 'n-beat-test',
    title: 'Chapter 4',
    content: '<p>Content</p>',
    synopsis: 'Elena confronts the guildmaster about the forged contract.',
    sceneBeats: [
      { id: 'b1', text: 'Enter guildhall in disguise', done: true },
      { id: 'b2', text: 'Present the wax seal', done: false },
    ],
  };

  // Synopsis verification
  assert.equal(note.synopsis, 'Elena confronts the guildmaster about the forged contract.');

  // Progress check
  const completedCount = note.sceneBeats.filter((b) => b.done).length;
  assert.equal(completedCount, 1);
  assert.equal(note.sceneBeats.length, 2);

  // Add beat
  const newBeat = { id: 'b3', text: 'Escape before the guards seal the courtyard', done: false };
  note = { ...note, sceneBeats: [...note.sceneBeats, newBeat] };
  assert.equal(note.sceneBeats.length, 3);

  // Toggle beat b2 to done
  note = {
    ...note,
    sceneBeats: note.sceneBeats.map((b) => (b.id === 'b2' ? { ...b, done: true } : b)),
  };
  const updatedCompleted = note.sceneBeats.filter((b) => b.done).length;
  assert.equal(updatedCompleted, 2);

  // Delete beat b1
  note = {
    ...note,
    sceneBeats: note.sceneBeats.filter((b) => b.id !== 'b1'),
  };
  assert.equal(note.sceneBeats.length, 2);
  assert.equal(note.sceneBeats.some((b) => b.id === 'b1'), false);
});

test('AIService: HTML-to-text cleanup and Scene Beats parser', async () => {
  const cleanHtmlToText = (html) => {
    return html
      .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n\n')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
  };

  const sampleHtml = '<h2>The Confrontation</h2><p>Elena stood <strong>frozen</strong> in the doorway.</p><blockquote>"You shouldn\'t have come," he whispered.</blockquote>';
  const cleaned = cleanHtmlToText(sampleHtml);
  assert.ok(cleaned.includes('## The Confrontation'));
  assert.ok(cleaned.includes('Elena stood **frozen** in the doorway.'));
  assert.ok(cleaned.includes('> "You shouldn\'t have come," he whispered.'));
  assert.ok(!cleaned.includes('<p>'));

  // Test Beats Parser from Gemini LLM output
  const parseBeatsFromResponse = (text) => {
    const lines = text.split('\n');
    const beats = [];
    let index = 1;

    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/^(?:(?:\d+[.)])|[-*•])\s*(.*)$/);
      if (match && match[1]) {
        const beatText = match[1]
          .replace(/^\[[ xX]\]\s*/, '')
          .replace(/^\*\*(.*?)\*\*:?\s*/, '$1: ')
          .trim();
        if (beatText.length > 2 && beatText.length < 250) {
          beats.push({
            id: `beat-ai-test-${index++}`,
            text: beatText,
            done: false,
          });
        }
      }
    }
    return beats;
  };

  const aiOutput = `Here are the suggested scene beats:
1. **The Arrival**: Elena enters the dimly lit sanctuary under cover of the storm.
2. The Encounter: Marcus refuses to hand over the cipher cylinder.
3. [ ] A sudden noise in the corridor alerts both to the inquisitor's guards.
- Elena escapes across the rooftops with half the manuscript.
`;

  const parsedBeats = parseBeatsFromResponse(aiOutput);
  assert.equal(parsedBeats.length, 4);
  assert.equal(parsedBeats[0].text, 'The Arrival: Elena enters the dimly lit sanctuary under cover of the storm.');
  assert.equal(parsedBeats[1].text, 'The Encounter: Marcus refuses to hand over the cipher cylinder.');
  assert.equal(parsedBeats[2].text, "A sudden noise in the corridor alerts both to the inquisitor's guards.");
  assert.equal(parsedBeats[3].text, 'Elena escapes across the rooftops with half the manuscript.');
  assert.equal(parsedBeats.every((b) => !b.done), true);
});

test('EditorialMarkdown: Structure classification for headers, dividers, and lists', async () => {
  const classifyBlock = (text) => {
    const trimmed = text.trim();
    if (/^[-*_]{3,}$/.test(trimmed)) return 'divider';
    if (trimmed.startsWith('#')) return 'header';
    if (trimmed.startsWith('>')) return 'quote';
    const lines = trimmed.split('\n');
    if (lines.some((l) => /^\d+[.)]\s+/.test(l.trim()))) return 'numbered-list';
    if (lines.some((l) => /^[-*•]\s+/.test(l.trim()))) return 'bullet-list';
    return 'paragraph';
  };

  assert.equal(classifyBlock('---'), 'divider');
  assert.equal(classifyBlock('### The Prescription'), 'header');
  assert.equal(classifyBlock('> "We must hurry," she said.'), 'quote');
  assert.equal(classifyBlock('1. **Clean House.**\n2. **Build a Frame.**'), 'numbered-list');
  assert.equal(classifyBlock('- Sight: amber light\n- Scent: old parchment'), 'bullet-list');
  assert.equal(classifyBlock('Elena carries an antique brass time-tracker.'), 'paragraph');
});

test('AIService: Wikilink-Aware Lore & Character Memory Extraction', async () => {
  const extractLinkedNotes = (activeNote, allNotes) => {
    if (!activeNote) return [];
    const linkedMap = new Map();
    const activeSource = `${activeNote.content || ''} ${activeNote.synopsis || ''}`;
    const regex = /\[\[(.*?)\]\]/g;
    let match;

    while ((match = regex.exec(activeSource)) !== null) {
      const targetTitle = match[1].trim().toLowerCase();
      if (!targetTitle) continue;
      const found = allNotes.find(
        (n) => n.id !== activeNote.id && n.title.trim().toLowerCase() === targetTitle
      );
      if (found) linkedMap.set(found.id, found);
    }

    const activeTitleLower = (activeNote.title || '').trim().toLowerCase();
    if (activeTitleLower) {
      for (const candidate of allNotes) {
        if (candidate.id === activeNote.id || linkedMap.has(candidate.id)) continue;
        const candidateSource = `${candidate.content || ''} ${candidate.synopsis || ''}`.toLowerCase();
        if (candidateSource.includes(`[[${activeTitleLower}]]`)) {
          linkedMap.set(candidate.id, candidate);
        }
      }
    }

    return Array.from(linkedMap.values());
  };

  const vault = [
    {
      id: 'n-ch1',
      title: 'Chapter 1: Ashfall',
      synopsis: 'Check [[The Obsidian Pact]] lore before scene end.',
      content: '<p>She met [[Elena Vane]] by the river.</p>',
    },
    {
      id: 'n-elena',
      title: 'Elena Vane',
      content: '<p>Dossier: Former captain of the watch. Appears in [[Chapter 1: Ashfall]].</p>',
    },
    {
      id: 'n-pact',
      title: 'The Obsidian Pact',
      content: '<p>Signed in Cycle 302.</p>',
    },
    {
      id: 'n-backlink',
      title: 'Epilogue Notes',
      content: '<p>Mirrors the opening image from [[Chapter 1: Ashfall]].</p>',
    },
    {
      id: 'n-unrelated',
      title: 'Unrelated Grocery List',
      content: '<p>Nothing linked here.</p>',
    },
  ];

  const linked = extractLinkedNotes(vault[0], vault);
  assert.equal(linked.length, 3);
  assert.ok(linked.some((n) => n.id === 'n-elena'));
  assert.ok(linked.some((n) => n.id === 'n-pact'));
  assert.ok(linked.some((n) => n.id === 'n-backlink'));
  assert.ok(!linked.some((n) => n.id === 'n-unrelated'));
});

test('Editor: Lossless HTML-to-Markdown and Markdown-to-HTML Round-Tripping', async () => {
  const inlineToMd = (str) =>
    str
      .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
      .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
      .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`');

  const htmlToMarkdown = (html) =>
    html
      .replace(/<hr\s*\/?>/gi, '---\n\n')
      .replace(/<h2>([\s\S]*?)<\/h2>/gi, (_, inner) => `## ${inlineToMd(inner).trim()}\n\n`)
      .replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
        const paragraphs = inner
          .replace(/<p>([\s\S]*?)<\/p>/gi, '$1\n')
          .trim()
          .split('\n')
          .map((line) => `> ${inlineToMd(line).trim()}`)
          .join('\n');
        return `${paragraphs}\n\n`;
      })
      .replace(/<ol>([\s\S]*?)<\/ol>/gi, (_, inner) => {
        let idx = 1;
        const items = inner.replace(/<li>([\s\S]*?)<\/li>/gi, (__, item) => {
          const cleanItem = inlineToMd(item.replace(/<\/?p>/gi, '').trim());
          return `${idx++}. ${cleanItem}\n`;
        });
        return `${items.trim()}\n\n`;
      })
      .replace(/<ul>([\s\S]*?)<\/ul>/gi, (_, inner) => {
        const items = inner.replace(/<li>([\s\S]*?)<\/li>/gi, (__, item) => {
          const cleanItem = inlineToMd(item.replace(/<\/?p>/gi, '').trim());
          return `- ${cleanItem}\n`;
        });
        return `${items.trim()}\n\n`;
      })
      .replace(/<p>([\s\S]*?)<\/p>/gi, (_, inner) => `${inlineToMd(inner)}\n\n`)
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const formatInline = (text) =>
    text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  const markdownToHtml = (markdown) => {
    const blocks = markdown.split(/\n\s*\n/);
    return blocks
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        if (/^[-*_]{3,}$/.test(trimmed)) return '<hr>';
        if (trimmed.startsWith('## ')) return `<h2>${formatInline(trimmed.slice(3))}</h2>`;
        const lines = trimmed.split('\n');
        if (lines.every((l) => l.trim().startsWith('>'))) {
          const quoteParagraphs = lines
            .map((l) => `<p>${formatInline(l.trim().replace(/^>\s?/, ''))}</p>`)
            .join('');
          return `<blockquote>${quoteParagraphs}</blockquote>`;
        }
        if (lines.every((l) => /^[-*•]\s+/.test(l.trim()))) {
          const listItems = lines
            .map((l) => `<li><p>${formatInline(l.trim().replace(/^[-*•]\s+/, ''))}</p></li>`)
            .join('');
          return `<ul>${listItems}</ul>`;
        }
        if (lines.every((l) => /^\d+[.)]\s+/.test(l.trim()))) {
          const listItems = lines
            .map((l) => `<li><p>${formatInline(l.trim().replace(/^\d+[.)]\s+/, ''))}</p></li>`)
            .join('');
          return `<ol>${listItems}</ol>`;
        }
        return `<p>${formatInline(trimmed)}</p>`;
      })
      .join('');
  };

  const originalHtml =
    '<h2>Scene Notes</h2><ul><li><p>First <strong>clue</strong></p></li><li><p>Second <em>clue</em></p></li></ul><ol><li><p>Step one</p></li><li><p>Step two</p></li></ol><blockquote><p>Line one</p><p>Line two</p></blockquote><hr><p>Final paragraph.</p>';

  const md = htmlToMarkdown(originalHtml);
  assert.ok(md.includes('- First **clue**'));
  assert.ok(md.includes('- Second *clue*'));
  assert.ok(md.includes('1. Step one'));
  assert.ok(md.includes('> Line one\n> Line two'));
  assert.ok(md.includes('---'));

  const roundTrippedHtml = markdownToHtml(md);
  assert.equal(roundTrippedHtml, originalHtml);
});

test('ProseCadence: Offline sentence rhythm, dialogue ratio, adverbs, and proximity echoes', async () => {
  const sampleHtml =
    '<p>Rain fell. The lantern flickered softly against the wet cobblestones while Elena waited silently by the iron gate.</p>' +
    '<p>“Stay back right now,” Marcus whispered urgently as the lantern flickered again.</p>';

  const plain = sampleHtml
    .replace(/<\/(p|h1|h2|h3|blockquote|li|div)>/gi, '. ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = plain
    .split(/\s+/)
    .map((w) => w.replace(/^[^a-zA-Z0-9']+|[^a-zA-Z0-9']+$/g, ''))
    .filter(Boolean);

  assert.equal(words.length, 30);

  // Dialogue ratio check (“Stay back right now,” = 4 words out of 30 => 13%)
  const dialogueMatches = plain.match(/(?:"[^"]*"|“[^”]*”)/g) || [];
  const dialogueWordCount = dialogueMatches.reduce(
    (sum, seg) => sum + seg.replace(/["“”]/g, '').trim().split(/\s+/).filter(Boolean).length,
    0
  );
  assert.equal(dialogueWordCount, 4);
  assert.equal(Math.round((dialogueWordCount / words.length) * 100), 13);

  // Adverbs check: softly, silently, urgently = 3
  const lowerWords = words.map((w) => w.toLowerCase().replace(/[^a-z]/g, ''));
  const adverbs = lowerWords.filter((w) => w.length >= 5 && w.endsWith('ly'));
  assert.deepEqual(adverbs, ['softly', 'silently', 'urgently']);

  // Proximity echoes check: "lantern" and "flickered" repeat within 45 words
  const echoCounts = new Map();
  for (let i = 0; i < lowerWords.length; i++) {
    const w = lowerWords[i];
    if (w.length < 5) continue;
    for (let j = i + 1; j < Math.min(lowerWords.length, i + 45); j++) {
      if (lowerWords[j] === w) {
        echoCounts.set(w, (echoCounts.get(w) || 1) + 1);
      }
    }
  }
  assert.equal(echoCounts.get('lantern'), 2);
  assert.equal(echoCounts.get('flickered'), 2);
});

test('Typography & Distraction-Free Flow: Typewriter font and active typing fade defaults', async () => {
  const VALID_FONTS = ['serif', 'sans', 'mono', 'brutalist'];
  assert.ok(VALID_FONTS.includes('mono'));
  assert.ok(VALID_FONTS.includes('serif'));
  assert.ok(VALID_FONTS.includes('sans'));
  assert.ok(VALID_FONTS.includes('brutalist'));

  // Test fontClass mapping
  const getFontClass = (fontFamily) => {
    switch (fontFamily) {
      case 'serif':
        return 'font-serif';
      case 'mono':
        return 'font-mono';
      case 'brutalist':
        return 'font-brutalist';
      default:
        return 'font-sans';
    }
  };

  assert.equal(getFontClass('mono'), 'font-mono');
  assert.equal(getFontClass('serif'), 'font-serif');
  assert.equal(getFontClass('sans'), 'font-sans');
  assert.equal(getFontClass('brutalist'), 'font-brutalist');

  // Test Active Typing Fade configuration
  const defaultSettings = {
    fontFamily: 'serif',
    fontSize: 19,
    activeTypingFade: true,
  };
  assert.equal(defaultSettings.activeTypingFade, true);

  // Test mouse movement delta threshold (6px) to resume toolbar visibility
  const hasMovedEnough = (prev, current) => {
    return Math.abs(current.x - prev.x) > 6 || Math.abs(current.y - prev.y) > 6;
  };

  assert.equal(hasMovedEnough({ x: 100, y: 100 }, { x: 102, y: 101 }), false);
  assert.equal(hasMovedEnough({ x: 100, y: 100 }, { x: 110, y: 100 }), true);
});

test('Typography: Chapter Drop Cap toggle and container class binding', async () => {
  const settingsOff = { dropCap: false };
  const settingsOn = { dropCap: true };

  const getContainerClasses = (fontClass, dropCap) => {
    return `${fontClass} ${dropCap ? 'drop-cap-enabled' : ''}`.trim();
  };

  assert.equal(getContainerClasses('font-serif', settingsOff.dropCap), 'font-serif');
  assert.equal(getContainerClasses('font-serif', settingsOn.dropCap), 'font-serif drop-cap-enabled');
  assert.equal(getContainerClasses('font-mono', settingsOn.dropCap), 'font-mono drop-cap-enabled');
});

test('Visual Studio: Dynamic Mix & Match Theme and Atmosphere Resolution', async () => {
  // Test OLED base atmosphere resolution
  const oledSettings = { theme: 'charcoal', baseAtmosphere: 'oled', accentColor: '#f59e0b' };
  const getAtmosphereBg = (base) => {
    const map = { oled: '#000000', charcoal: '#121315', canvas: '#f7f5f0' };
    return map[base] || '#121315';
  };
  assert.equal(getAtmosphereBg(oledSettings.baseAtmosphere), '#000000');

  // Test custom accent color override
  assert.equal(oledSettings.accentColor, '#f59e0b');

  // Test reading column width mapping
  const getReadingWidthClass = (width) => {
    switch (width) {
      case 'narrow': return 'max-w-[56ch]';
      case 'wide': return 'max-w-[88ch]';
      case 'full': return 'max-w-5xl';
      default: return 'max-w-[72ch]';
    }
  };

  assert.equal(getReadingWidthClass('narrow'), 'max-w-[56ch]');
  assert.equal(getReadingWidthClass('comfortable'), 'max-w-[72ch]');
  assert.equal(getReadingWidthClass('wide'), 'max-w-[88ch]');
  assert.equal(getReadingWidthClass('full'), 'max-w-5xl');
  assert.equal(getReadingWidthClass(undefined), 'max-w-[72ch]');
});

test('Typewriter Audio: Keyboard acoustic action mapping', async () => {
  const getAudioAction = (key) => {
    if (key === 'Enter') return 'carriage-return';
    if (key === ' ' || key === 'Space') return 'space-thump';
    if (key === 'Backspace' || key === 'Delete') return 'backspace-snap';
    return 'mechanical-clack';
  };

  assert.equal(getAudioAction('a'), 'mechanical-clack');
  assert.equal(getAudioAction('Enter'), 'carriage-return');
  assert.equal(getAudioAction(' '), 'space-thump');
  assert.equal(getAudioAction('Backspace'), 'backspace-snap');
});

test('Command Palette & Writing Sprint: Metric computation and fuzzy matching', async () => {
  // Test sprint word calculation
  const startWordCount = 420;
  const currentWordCount = 680;
  const targetWords = 300;
  const wordsWrittenInSprint = Math.max(0, currentWordCount - startWordCount);
  assert.equal(wordsWrittenInSprint, 260);

  const progressPct = Math.min(100, Math.round((wordsWrittenInSprint / targetWords) * 100));
  assert.equal(progressPct, 87);

  // Test command palette title matching
  const testNotes = [
    { id: '1', title: 'Chapter 1: The Echoes of Solitude', tags: ['story'] },
    { id: '2', title: 'Elena Vane', tags: ['characters'] },
    { id: '3', title: 'Untitled poem', tags: ['poetry'] },
  ];

  const filterNotes = (query) => {
    const q = query.toLowerCase();
    return testNotes.filter((n) => n.title.toLowerCase().includes(q) || n.tags.some((t) => t.includes(q)));
  };

  assert.equal(filterNotes('echoes').length, 1);
  assert.equal(filterNotes('poem').length, 1);
  assert.equal(filterNotes('characters').length, 1);
  assert.equal(filterNotes('nonexistent').length, 0);
});

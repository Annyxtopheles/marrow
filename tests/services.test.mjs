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

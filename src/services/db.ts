// IndexedDB Persistence Layer for Marrow
// Eliminates the 5MB browser quota and protects drafts against localStorage cleanup

import type { Note, Folder } from '../types';

const DB_NAME = 'marrow_db';
const DB_VERSION = 1;
const STORE_NOTES = 'notes';
const STORE_FOLDERS = 'folders';

export const openMarrowDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const IndexedDBService = {
  async saveAllNotes(notes: Note[]): Promise<void> {
    try {
      const db = await openMarrowDB();
      const tx = db.transaction(STORE_NOTES, 'readwrite');
      const store = tx.objectStore(STORE_NOTES);
      store.clear();
      for (const note of notes) {
        store.put(note);
      }
    } catch (e) {
      console.warn('IndexedDB saveAllNotes fallback error', e);
    }
  },

  async getAllNotes(): Promise<Note[] | null> {
    try {
      const db = await openMarrowDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NOTES, 'readonly');
        const store = tx.objectStore(STORE_NOTES);
        const req = store.getAll();
        req.onsuccess = () => {
          const res = req.result as Note[];
          resolve(res && res.length > 0 ? res : null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async saveAllFolders(folders: Folder[]): Promise<void> {
    try {
      const db = await openMarrowDB();
      const tx = db.transaction(STORE_FOLDERS, 'readwrite');
      const store = tx.objectStore(STORE_FOLDERS);
      store.clear();
      for (const folder of folders) {
        store.put(folder);
      }
    } catch (e) {
      console.warn('IndexedDB saveAllFolders error', e);
    }
  },

  async getAllFolders(): Promise<Folder[] | null> {
    try {
      const db = await openMarrowDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_FOLDERS, 'readonly');
        const store = tx.objectStore(STORE_FOLDERS);
        const req = store.getAll();
        req.onsuccess = () => {
          const res = req.result as Folder[];
          resolve(res && res.length > 0 ? res : null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },
};

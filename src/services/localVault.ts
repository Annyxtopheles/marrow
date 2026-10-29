// Native Local File System Vault Service using File System Access API (window.showDirectoryPicker)
// Directly binds Marrow to real directories and .md files in Windows File Explorer / OS disk.

import type { Note, Folder } from '../types';

const DB_VAULT_NAME = 'marrow_vault_db';
const STORE_HANDLES = 'handles';
const KEY_DIR_HANDLE = 'active_dir_handle';

const openHandleDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB not supported'));
    }
    const req = indexedDB.open(DB_VAULT_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_HANDLES)) {
        db.createObjectStore(STORE_HANDLES);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

// eslint-disable-next-line no-control-regex
const sanitizeFileName = (name: string): string => {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim() || 'Untitled';
};

// Markdown to HTML simple parser for disk intake
const markdownToHtml = (md: string): string => {
  if (!md.trim()) return '<p></p>';
  return md
    .split(/\n\n+/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('# ')) {
        return `<h1>${trimmed.slice(2)}</h1>`;
      }
      if (trimmed.startsWith('## ')) {
        return `<h2>${trimmed.slice(3)}</h2>`;
      }
      if (trimmed.startsWith('### ')) {
        return `<h3>${trimmed.slice(4)}</h3>`;
      }
      if (trimmed.startsWith('> ')) {
        return `<blockquote><p>${trimmed.slice(2)}</p></blockquote>`;
      }
      if (trimmed === '---') {
        return '<hr>';
      }
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
};

// HTML to Markdown for disk saving
const htmlToMarkdown = (html: string): string => {
  return html
    .replace(/<hr\s*\/?>/gi, '---\n\n')
    .replace(/<h1>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_, inner) => {
      const text = inner.replace(/<p>|<\/p>/gi, '').trim();
      return `> ${text}\n\n`;
    })
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
};

export class LocalVaultService {
  private dirHandle: FileSystemDirectoryHandle | null = null;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  public async getStoredHandle(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const db = await openHandleDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_HANDLES, 'readonly');
        const store = tx.objectStore(STORE_HANDLES);
        const req = store.get(KEY_DIR_HANDLE);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  public async storeHandle(handle: FileSystemDirectoryHandle): Promise<void> {
    try {
      const db = await openHandleDB();
      const tx = db.transaction(STORE_HANDLES, 'readwrite');
      tx.objectStore(STORE_HANDLES).put(handle, KEY_DIR_HANDLE);
    } catch (e) {
      console.warn('Failed to store directory handle in IndexedDB', e);
    }
  }

  public async clearStoredHandle(): Promise<void> {
    try {
      const db = await openHandleDB();
      const tx = db.transaction(STORE_HANDLES, 'readwrite');
      tx.objectStore(STORE_HANDLES).delete(KEY_DIR_HANDLE);
      this.dirHandle = null;
    } catch (e) {
      console.warn('Failed to clear stored directory handle', e);
    }
  }

  public setHandle(handle: FileSystemDirectoryHandle): void {
    this.dirHandle = handle;
  }

  public getHandle(): FileSystemDirectoryHandle | null {
    return this.dirHandle;
  }

  public getVaultName(): string {
    return this.dirHandle ? this.dirHandle.name : '';
  }

  // Request user to select a folder on disk
  public async pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.isSupported()) {
      throw new Error('Your browser does not support the File System Access API. Please use Google Chrome or Microsoft Edge.');
    }

    const handle = await (window as any).showDirectoryPicker({
      id: 'marrow-vault',
      mode: 'readwrite',
      startIn: 'documents',
    });

    if (handle) {
      this.dirHandle = handle;
      await this.storeHandle(handle);
    }

    return handle;
  }

  // Check and query readwrite permission
  public async verifyPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
    const opts = { mode: 'readwrite' as const };
    if ((await (handle as any).queryPermission(opts)) === 'granted') {
      return true;
    }
    if ((await (handle as any).requestPermission(opts)) === 'granted') {
      return true;
    }
    return false;
  }

  // Read all real files and directories recursively from disk
  public async loadVaultContent(): Promise<{ notes: Note[]; folders: Folder[] }> {
    if (!this.dirHandle) return { notes: [], folders: [] };

    const notes: Note[] = [];
    const folders: Folder[] = [];

    const traverse = async (
      dir: FileSystemDirectoryHandle,
      parentId: string | null = null,
      folderPath = ''
    ) => {
      for await (const entry of (dir as any).values()) {
        if (entry.kind === 'directory') {
          // Skip hidden directories like .git or .trash
          if (entry.name.startsWith('.')) continue;

          const folderId = `f-${parentId ? parentId + '_' : ''}${entry.name}`;
          folders.push({
            id: folderId,
            name: entry.name,
            parentId,
            order: folders.length + 1,
          });

          await traverse(entry as FileSystemDirectoryHandle, folderId, `${folderPath}${entry.name}/`);
        } else if (entry.kind === 'file' && entry.name.endsWith('.md')) {
          try {
            const file = await (entry as FileSystemFileHandle).getFile();
            const text = await file.text();
            const title = entry.name.replace(/\.md$/i, '');
            const html = markdownToHtml(text);
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;

            notes.push({
              id: `note-disk-${folderPath}${entry.name}`,
              title,
              content: html,
              folderId: parentId,
              tags: [],
              createdAt: file.lastModified,
              updatedAt: file.lastModified,
              lastOpenedAt: Date.now(),
              wordCount: words,
              characterCount: text.length,
              pinned: false,
              favorite: false,
              timelineLog: [],
            });
          } catch (err) {
            console.warn(`Failed to read file ${entry.name}`, err);
          }
        }
      }
    };

    await traverse(this.dirHandle);
    return { notes, folders };
  }

  // Find target directory handle for a given folderId
  private async resolveFolderHandle(
    folderId: string | null,
    folders: Folder[]
  ): Promise<FileSystemDirectoryHandle | null> {
    if (!this.dirHandle) return null;
    if (!folderId) return this.dirHandle;

    const pathParts: string[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder = folders.find((f) => f.id === currentId);
      if (!folder) break;
      pathParts.unshift(folder.name);
      currentId = folder.parentId;
    }

    let currentDir = this.dirHandle;
    for (const part of pathParts) {
      try {
        currentDir = await currentDir.getDirectoryHandle(part, { create: true });
      } catch {
        return null;
      }
    }

    return currentDir;
  }

  // Write note to actual file on disk
  public async writeNoteFile(note: Note, folders: Folder[]): Promise<boolean> {
    if (!this.dirHandle) return false;
    try {
      const dir = await this.resolveFolderHandle(note.folderId, folders);
      if (!dir) return false;

      const fileName = `${sanitizeFileName(note.title || 'Untitled Document')}.md`;
      const fileHandle = await dir.getFileHandle(fileName, { create: true });
      const writable = await (fileHandle as any).createWritable();
      const mdContent = htmlToMarkdown(note.content);
      await writable.write(mdContent);
      await writable.close();
      return true;
    } catch (e) {
      console.error('Failed to write note to disk', e);
      return false;
    }
  }

  // Delete note file from actual disk
  public async deleteNoteFile(title: string, folderId: string | null, folders: Folder[]): Promise<boolean> {
    if (!this.dirHandle) return false;
    try {
      const dir = await this.resolveFolderHandle(folderId, folders);
      if (!dir) return false;

      const fileName = `${sanitizeFileName(title)}.md`;
      await (dir as any).removeEntry(fileName);
      return true;
    } catch (e) {
      console.warn('Failed to delete note file from disk', e);
      return false;
    }
  }

  // Rename note file on actual disk
  public async renameNoteFile(
    oldTitle: string,
    newTitle: string,
    folderId: string | null,
    content: string,
    folders: Folder[]
  ): Promise<boolean> {
    if (!this.dirHandle) return false;
    try {
      const dir = await this.resolveFolderHandle(folderId, folders);
      if (!dir) return false;

      const oldName = `${sanitizeFileName(oldTitle)}.md`;
      const newName = `${sanitizeFileName(newTitle)}.md`;

      if (oldName === newName) return true;

      // Create new file with content
      const newHandle = await dir.getFileHandle(newName, { create: true });
      const writable = await (newHandle as any).createWritable();
      await writable.write(htmlToMarkdown(content));
      await writable.close();

      // Delete old file
      try {
        await (dir as any).removeEntry(oldName);
      } catch {}

      return true;
    } catch (e) {
      console.error('Failed to rename note on disk', e);
      return false;
    }
  }

  // Create folder directory on actual disk
  public async createFolderDir(
    name: string,
    parentId: string | null,
    folders: Folder[]
  ): Promise<boolean> {
    if (!this.dirHandle) return false;
    try {
      const parentDir = await this.resolveFolderHandle(parentId, folders);
      if (!parentDir) return false;

      await parentDir.getDirectoryHandle(sanitizeFileName(name), { create: true });
      return true;
    } catch (e) {
      console.error('Failed to create folder on disk', e);
      return false;
    }
  }

  // Delete folder directory on actual disk
  public async deleteFolderDir(
    name: string,
    parentId: string | null,
    folders: Folder[]
  ): Promise<boolean> {
    if (!this.dirHandle) return false;
    try {
      const parentDir = await this.resolveFolderHandle(parentId, folders);
      if (!parentDir) return false;

      await (parentDir as any).removeEntry(sanitizeFileName(name), { recursive: true });
      return true;
    } catch (e) {
      console.error('Failed to delete folder on disk', e);
      return false;
    }
  }
}

export const LocalVault = new LocalVaultService();

// Google Drive Cloud Sync Service for Marrow
// Zero server costs: stores notes directly into user's personal Google Drive

import type { Note, Folder, EditorSettings } from '../types';

export interface VaultBackup {
  version: number;
  appName: 'marrow';
  timestamp: number;
  notes: Note[];
  folders: Folder[];
  settings?: EditorSettings;
}

const GDRIVE_FILE_NAME = 'marrow-vault.json';
const GDRIVE_STORAGE_KEY_TOKEN = 'marrow_gdrive_token';
const GDRIVE_STORAGE_KEY_LAST_SYNC = 'marrow_gdrive_last_sync';

export const GoogleDriveService = {
  getStoredToken(): string | null {
    return localStorage.getItem(GDRIVE_STORAGE_KEY_TOKEN);
  },

  setStoredToken(token: string | null): void {
    if (token) {
      localStorage.setItem(GDRIVE_STORAGE_KEY_TOKEN, token);
    } else {
      localStorage.removeItem(GDRIVE_STORAGE_KEY_TOKEN);
    }
  },

  getLastSyncTime(): number | null {
    const val = localStorage.getItem(GDRIVE_STORAGE_KEY_LAST_SYNC);
    return val ? Number(val) : null;
  },

  setLastSyncTime(timestamp: number): void {
    localStorage.setItem(GDRIVE_STORAGE_KEY_LAST_SYNC, String(timestamp));
  },

  createBackupPayload(notes: Note[], folders: Folder[], settings?: EditorSettings): VaultBackup {
    return {
      version: 1,
      appName: 'marrow',
      timestamp: Date.now(),
      notes,
      folders,
      settings,
    };
  },

  // Direct Browser Download Backup
  downloadBackupFile(notes: Note[], folders: Folder[], settings?: EditorSettings): void {
    const payload = this.createBackupPayload(notes, folders, settings);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marrow-vault-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Direct REST API Upload to Google Drive (Multipart)
  async uploadToGoogleDrive(
    token: string,
    notes: Note[],
    folders: Folder[],
    settings?: EditorSettings
  ): Promise<{ fileId: string }> {
    const payload = this.createBackupPayload(notes, folders, settings);
    const metadata = {
      name: GDRIVE_FILE_NAME,
      mimeType: 'application/json',
      description: 'Marrow Vault Cloud Sync Backup',
    };

    // Check if file already exists in Drive
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${GDRIVE_FILE_NAME}' and trashed=false&fields=files(id,name)`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!searchRes.ok) {
      const err = await searchRes.text();
      throw new Error(`Google Drive API error: ${err}`);
    }

    const searchData = await searchRes.json();
    const existingFile = searchData.files && searchData.files.length > 0 ? searchData.files[0] : null;

    let uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    let method = 'POST';

    if (existingFile) {
      uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
      method = 'PATCH';
    }

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(payload, null, 2) +
      closeDelimiter;

    const uploadRes = await fetch(uploadUrl, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Failed to upload to Google Drive: ${err}`);
    }

    const data = await uploadRes.json();
    this.setLastSyncTime(Date.now());
    return { fileId: data.id };
  },

  // Fetch Vault from Google Drive
  async downloadFromGoogleDrive(token: string): Promise<VaultBackup> {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${GDRIVE_FILE_NAME}' and trashed=false&fields=files(id,name)`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!searchRes.ok) {
      throw new Error('Could not query Google Drive');
    }

    const searchData = await searchRes.json();
    if (!searchData.files || searchData.files.length === 0) {
      throw new Error('No Marrow Vault backup found on this Google Drive account.');
    }

    const fileId = searchData.files[0].id;
    const downloadRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!downloadRes.ok) {
      throw new Error('Failed to download vault content from Google Drive');
    }

    const backupData: VaultBackup = await downloadRes.json();
    this.setLastSyncTime(Date.now());
    return backupData;
  },
};

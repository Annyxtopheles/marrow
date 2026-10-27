import React, { useState } from 'react';
import type { Note, Folder, EditorSettings, ThemeMode } from '../types';
import { GoogleDriveService } from '../services/googleDrive';
import { THEMES } from '../services/themes';
import { X, Cloud, CloudUpload, CloudDownload, HardDrive, CheckCircle2, AlertCircle } from 'lucide-react';

interface SyncModalProps {
  notes: Note[];
  folders: Folder[];
  settings: EditorSettings;
  onRestoreVault: (notes: Note[], folders: Folder[]) => void;
  onClose: () => void;
  isLightMode: boolean;
  theme?: ThemeMode;
}

export const SyncModal: React.FC<SyncModalProps> = ({
  notes,
  folders,
  settings,
  onRestoreVault,
  onClose,
  isLightMode,
  theme,
}) => {
  const currentTheme = THEMES[theme || settings.theme || 'charcoal'] || THEMES.charcoal;
  const [token, setToken] = useState<string>(() => GoogleDriveService.getStoredToken() || '');
  const [lastSync, setLastSync] = useState<number | null>(() => GoogleDriveService.getLastSyncTime());
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const border = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.08]';
  const modalBg = isLightMode ? 'bg-[#f7f5f0] text-[#2c2a27]' : 'bg-[#18191c] text-[#dedad4]';
  const cardBg = isLightMode ? 'bg-black/[0.02] border-black/[0.06]' : 'bg-white/[0.02] border-white/[0.06]';
  const itemHover = isLightMode ? 'hover:bg-black/[0.04]' : 'hover:bg-white/[0.04]';

  const handleSaveToken = (val: string) => {
    setToken(val);
    GoogleDriveService.setStoredToken(val.trim() || null);
  };

  const handlePushToDrive = async () => {
    if (!token.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a Google Drive Access Token or connect your account.' });
      return;
    }
    setLoading(true);
    setStatusMessage(null);
    try {
      await GoogleDriveService.uploadToGoogleDrive(token.trim(), notes, folders, settings);
      setLastSync(Date.now());
      setStatusMessage({ type: 'success', text: 'Vault successfully backed up to your Google Drive!' });
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Failed to sync with Google Drive.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePullFromDrive = async () => {
    if (!token.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter a Google Drive Access Token.' });
      return;
    }
    setLoading(true);
    setStatusMessage(null);
    try {
      const backup = await GoogleDriveService.downloadFromGoogleDrive(token.trim());
      if (backup.notes && backup.folders) {
        onRestoreVault(backup.notes, backup.folders);
        setLastSync(Date.now());
        setStatusMessage({ type: 'success', text: `Restored ${backup.notes.length} notes and ${backup.folders.length} folders from Google Drive!` });
      }
    } catch (e: any) {
      setStatusMessage({ type: 'error', text: e.message || 'Failed to pull from Google Drive.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = () => {
    GoogleDriveService.downloadBackupFile(notes, folders, settings);
    setStatusMessage({ type: 'success', text: 'Vault backup JSON file downloaded to your device.' });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        if (data.notes && Array.isArray(data.notes)) {
          onRestoreVault(data.notes, data.folders || []);
          setStatusMessage({ type: 'success', text: `Restored ${data.notes.length} notes from uploaded backup!` });
        } else {
          setStatusMessage({ type: 'error', text: 'Invalid Marrow backup file format.' });
        }
      } catch {
        setStatusMessage({ type: 'error', text: 'Could not parse JSON file.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex flex-col w-full max-w-lg rounded-xl border ${border} ${modalBg} shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b ${border} px-6 py-4`}>
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 opacity-70" />
            <h2 className="text-sm font-medium tracking-wide">
              Cross-Device Cloud Sync
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`rounded-md p-1.5 transition ${itemHover} opacity-70 hover:opacity-100`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Status feedback */}
          {statusMessage && (
            <div
              className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                isLightMode
                  ? 'bg-black/[0.04] border-black/20 text-[#151618]'
                  : 'bg-white/[0.06] border-white/20 text-[#f4f1ea]'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 opacity-80" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 opacity-80" />
              )}
              <span className="leading-snug">{statusMessage.text}</span>
            </div>
          )}

          {/* Google Drive Card */}
          <div className={`p-4 rounded-lg border ${cardBg} space-y-3.5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 opacity-80" />
                <span className="font-medium text-inherit">Google Drive Sync</span>
              </div>
              <span className="text-[10px] opacity-50">
                {lastSync ? `Last synced ${new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Not synced yet'}
              </span>
            </div>

            <p className="text-[11px] opacity-70 leading-relaxed">
              Syncs <code className="opacity-90">marrow-vault.json</code> straight to your personal Google Drive with 100% privacy and zero middleman server storage.
            </p>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider opacity-60 block">
                Google Drive Access Token
              </label>
              <input
                type="password"
                placeholder="Paste Google OAuth Access Token..."
                value={token}
                onChange={(e) => handleSaveToken(e.target.value)}
                className={`w-full rounded-md px-3 py-2 text-xs focus:outline-none border ${
                  isLightMode
                    ? 'bg-black/[0.02] border-black/[0.08] text-[#2c2a27]'
                    : 'bg-white/[0.02] border-white/[0.08] text-[#dedad4]'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={handlePushToDrive}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-md font-semibold text-xs transition shadow-sm hover:opacity-90 active:scale-95 disabled:opacity-50"
                style={{
                  backgroundColor: currentTheme.tokens.accentColor,
                  color: currentTheme.tokens.accentContrast,
                }}
              >
                <CloudUpload className="h-3.5 w-3.5" />
                <span>{loading ? 'Syncing...' : 'Backup to Drive'}</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handlePullFromDrive}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border ${cardBg} ${itemHover} disabled:opacity-50 font-medium text-xs transition`}
              >
                <CloudDownload className="h-3.5 w-3.5" />
                <span>Restore from Drive</span>
              </button>
            </div>
          </div>

          {/* Local File Vault Backup */}
          <div className={`p-4 rounded-lg border ${cardBg} space-y-3`}>
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 opacity-70" />
              <span className="font-medium text-inherit">Offline File Vault</span>
            </div>

            <p className="text-[11px] opacity-70 leading-relaxed">
              Export your entire vault to an offline JSON file, or restore existing files on any machine.
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleDownloadFile}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border ${cardBg} ${itemHover} font-medium text-xs transition`}
              >
                <CloudDownload className="h-3.5 w-3.5" />
                <span>Download Vault</span>
              </button>

              <label className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md border ${cardBg} ${itemHover} font-medium text-xs cursor-pointer transition`}>
                <CloudUpload className="h-3.5 w-3.5" />
                <span>Import File</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`border-t ${border} px-6 py-3.5 flex justify-end`}>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-1.5 rounded-lg font-semibold text-xs transition shadow-sm hover:opacity-90 active:scale-95"
            style={{
              backgroundColor: currentTheme.tokens.accentColor,
              color: currentTheme.tokens.accentContrast,
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

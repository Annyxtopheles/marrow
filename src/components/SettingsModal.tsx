import React from 'react';
import type { EditorSettings, ThemeMode, FontFamily } from '../types';
import { X, Sliders, Download } from 'lucide-react';

interface SettingsModalProps {
  settings: EditorSettings;
  onUpdateSettings: (newSettings: EditorSettings) => void;
  onClose: () => void;
  onExportVault: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onExportVault,
}) => {
  const update = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="flex flex-col w-full max-w-lg rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 px-6 py-4">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-white" />
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Typography &amp; Writing Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1.5 text-neutral-400 hover:bg-neutral-900 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh] text-xs">
          {/* Minimalist Monochromatic Themes */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block">
              Monochrome Theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'amoled', name: 'AMOLED Black', bg: 'bg-black text-white border-neutral-800' },
                { id: 'slate', name: 'Obsidian Slate', bg: 'bg-[#121214] text-neutral-200 border-neutral-800' },
                { id: 'paper', name: 'Clean Paper', bg: 'bg-neutral-100 text-black border-neutral-300' },
                { id: 'ivory', name: 'Warm Ivory', bg: 'bg-[#faf6ee] text-[#2d2a26] border-[#e2dcd0]' },
              ].map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => update('theme', th.id as ThemeMode)}
                  className={`p-3 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1.5 ${th.bg} ${
                    settings.theme === th.id ? 'ring-2 ring-white font-semibold' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className="text-[11px]">{th.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Family Selection */}
          <div className="space-y-2.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block">
              Typeface
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'serif', name: 'Literary Serif', sample: 'Georgia, serif' },
                { id: 'sans', name: 'Modern Sans', sample: 'system-ui, sans-serif' },
                { id: 'mono', name: 'Distraction Mono', sample: 'monospace' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => update('fontFamily', f.id as FontFamily)}
                  className={`p-2.5 rounded-lg border text-center transition ${
                    settings.fontFamily === f.id
                      ? 'border-white bg-neutral-900 text-white font-semibold'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-400 hover:border-neutral-700'
                  }`}
                  style={{ fontFamily: f.sample }}
                >
                  <div className="text-xs">{f.name}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">Aa Bb Gg</div>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size & Line Height */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-neutral-400">
                <span>Font Size</span>
                <span className="font-mono text-white">{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min={15}
                max={28}
                value={settings.fontSize}
                onChange={(e) => update('fontSize', Number(e.target.value))}
                className="w-full accent-white cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-neutral-400">
                <span>Line Spacing</span>
                <span className="font-mono text-white">{settings.lineHeight.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={1.4}
                max={2.4}
                step={0.05}
                value={settings.lineHeight}
                onChange={(e) => update('lineHeight', Number(e.target.value))}
                className="w-full accent-white cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
              />
            </div>
          </div>

          {/* PureWriter Ergonomics */}
          <div className="space-y-3 pt-2 border-t border-neutral-900">
            <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 block">
              PureWriter Ergonomics
            </label>

            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-900 bg-neutral-900/40 cursor-pointer hover:bg-neutral-900/70 transition">
                <div>
                  <div className="font-medium text-white">Smooth Breathing Cursor</div>
                  <div className="text-[11px] text-neutral-400">
                    Gentle pulsing cursor animation for meditative writing flow.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.breathingCursor}
                  onChange={(e) => update('breathingCursor', e.target.checked)}
                  className="accent-white h-4 w-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-900 bg-neutral-900/40 cursor-pointer hover:bg-neutral-900/70 transition">
                <div>
                  <div className="font-medium text-white">Typewriter Center Mode</div>
                  <div className="text-[11px] text-neutral-400">
                    Locks the active line in the vertical center of the screen.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.typewriterMode}
                  onChange={(e) => update('typewriterMode', e.target.checked)}
                  className="accent-white h-4 w-4 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Vault Backup Export */}
          <div className="pt-2 border-t border-neutral-900">
            <button
              type="button"
              onClick={onExportVault}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-neutral-800 hover:bg-neutral-900 text-neutral-300 hover:text-white transition"
            >
              <Download className="h-4 w-4" />
              <span>Export Complete Vault (JSON / Markdown)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800/80 px-6 py-3.5 bg-neutral-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

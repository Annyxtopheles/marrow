import React, { useState } from 'react';
import type { EditorSettings, ThemeMode, FontFamily } from '../types';
import { X, Sliders, Download } from 'lucide-react';

interface SettingsModalProps {
  settings: EditorSettings;
  onUpdateSettings: (newSettings: EditorSettings) => void;
  onClose: () => void;
  onExportVault: () => void;
  isLightMode: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onExportVault,
  isLightMode,
}) => {
  const [isHoveringBackdrop, setIsHoveringBackdrop] = useState(false);

  const update = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const border = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.08]';
  const modalBg = isLightMode ? 'bg-[#f7f5f0] text-[#2c2a27]' : 'bg-[#18191c] text-[#dedad4]';
  const cardBg = isLightMode
    ? 'bg-black/[0.02] border-black/[0.06]'
    : 'bg-white/[0.02] border-white/[0.06]';
  const itemHover = isLightMode ? 'hover:bg-black/[0.04]' : 'hover:bg-white/[0.04]';

  // Subtle, thin outline for selected options (1px delicate ring instead of thick ring-2)
  const selectedOutline = isLightMode
    ? 'ring-1 ring-stone-600/35 border-stone-600/35 font-medium shadow-xs'
    : 'ring-1 ring-stone-300/35 border-stone-300/35 font-medium shadow-xs';
  const unselectedOutline = isLightMode
    ? 'border-black/[0.08] opacity-65 hover:opacity-100'
    : 'border-white/[0.08] opacity-65 hover:opacity-100';

  return (
    <div
      onClick={onClose}
      onMouseEnter={() => setIsHoveringBackdrop(true)}
      onMouseLeave={() => setIsHoveringBackdrop(false)}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isHoveringBackdrop ? 'bg-black/25 backdrop-blur-[2px]' : 'bg-black/60 backdrop-blur-sm'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={(e) => {
          e.stopPropagation();
          setIsHoveringBackdrop(false);
        }}
        onMouseLeave={() => setIsHoveringBackdrop(true)}
        className={`flex flex-col w-full max-w-lg rounded-xl border ${border} ${modalBg} shadow-2xl overflow-hidden transition-all duration-300 ${
          isHoveringBackdrop ? 'opacity-15 pointer-events-none scale-[0.99]' : 'opacity-100 scale-100'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b ${border} px-6 py-4`}>
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 opacity-70" />
            <h2 className="text-sm font-medium tracking-wide">
              Typography &amp; Environment
            </h2>
            <span className="text-[10px] opacity-40 ml-1.5 hidden sm:inline">
              (hover outside to preview)
            </span>
          </div>
          <button
            onClick={onClose}
            className={`rounded-md p-1.5 transition ${itemHover} opacity-70 hover:opacity-100`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh] text-xs">
          {/* Low-Contrast Color Schemes */}
          <div className="space-y-2.5">
            <label className="text-[11px] uppercase tracking-wider opacity-60 block">
              Low-Contrast Color Palette
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  id: 'charcoal',
                  name: 'Charcoal',
                  sub: 'Warm Dark',
                  style: 'bg-[#151618] text-[#dedad4]',
                },
                {
                  id: 'canvas',
                  name: 'Canvas Linen',
                  sub: 'Warm Light',
                  style: 'bg-[#f7f5f0] text-[#2c2a27]',
                },
              ].map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => update('theme', th.id as ThemeMode)}
                  className={`p-3 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 ${th.style} ${
                    settings.theme === th.id ? selectedOutline : unselectedOutline
                  }`}
                >
                  <span className="text-xs">{th.name}</span>
                  <span className="text-[10px] opacity-60">{th.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Typeface Selection */}
          <div className="space-y-2.5">
            <label className="text-[11px] uppercase tracking-wider opacity-60 block">
              Editorial Typeface
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  id: 'serif',
                  name: 'Newsreader Serif',
                  sub: 'Modern Editorial',
                  font: 'var(--font-serif)',
                },
                {
                  id: 'sans',
                  name: 'Jakarta Sans',
                  sub: 'Contemporary',
                  font: 'var(--font-sans)',
                },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => update('fontFamily', f.id as FontFamily)}
                  className={`p-2.5 rounded-lg border text-center transition ${cardBg} ${
                    settings.fontFamily === f.id ? selectedOutline : unselectedOutline
                  }`}
                  style={{ fontFamily: f.font }}
                >
                  <div className="text-xs">{f.name}</div>
                  <div className="text-[10px] opacity-60 mt-0.5">{f.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Typography Sliders */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between opacity-70">
                <span>Font Size</span>
                <span>{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min={16}
                max={26}
                value={settings.fontSize}
                onChange={(e) => update('fontSize', Number(e.target.value))}
                className="w-full accent-stone-400 cursor-pointer h-1.5 rounded-lg appearance-none bg-stone-500/20"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between opacity-70">
                <span>Line Height</span>
                <span>{settings.lineHeight.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={1.5}
                max={2.3}
                step={0.05}
                value={settings.lineHeight}
                onChange={(e) => update('lineHeight', Number(e.target.value))}
                className="w-full accent-stone-400 cursor-pointer h-1.5 rounded-lg appearance-none bg-stone-500/20"
              />
            </div>
          </div>

          {/* Ergonomic Toggles */}
          <div className={`space-y-3 pt-2 border-t ${border}`}>
            <label className="text-[11px] uppercase tracking-wider opacity-60 block">
              Writing Ergonomics
            </label>

            <div className="space-y-2">
              <label className={`flex items-center justify-between p-2.5 rounded-lg border ${cardBg} cursor-pointer transition ${itemHover}`}>
                <div>
                  <div className="font-medium">Soft Breathing Cursor</div>
                  <div className="text-[11px] opacity-60">
                    Gentle pulsing cursor animation for continuous flow state.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.breathingCursor}
                  onChange={(e) => update('breathingCursor', e.target.checked)}
                  className="accent-stone-400 h-4 w-4 cursor-pointer"
                />
              </label>

              <label className={`flex items-center justify-between p-2.5 rounded-lg border ${cardBg} cursor-pointer transition ${itemHover}`}>
                <div>
                  <div className="font-medium">Typewriter Center Mode</div>
                  <div className="text-[11px] opacity-60">
                    Locks current active paragraph in vertical center.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.typewriterMode}
                  onChange={(e) => update('typewriterMode', e.target.checked)}
                  className="accent-stone-400 h-4 w-4 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Export */}
          <div className={`pt-2 border-t ${border}`}>
            <button
              type="button"
              onClick={onExportVault}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg border transition ${cardBg} ${itemHover}`}
            >
              <Download className="h-4 w-4 opacity-70" />
              <span>Export Complete Vault (JSON / Markdown)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={`border-t ${border} px-6 py-3.5 flex justify-end`}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-stone-700 hover:bg-stone-600 text-stone-100 font-medium text-xs transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

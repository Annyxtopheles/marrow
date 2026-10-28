import React, { useState } from 'react';
import type { EditorSettings, FontFamily } from '../types';
import { X, Sliders, Download, Sparkles } from 'lucide-react';
import { THEMES, VALID_THEMES } from '../services/themes';

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
  const [showApiKey, setShowApiKey] = useState(false);
  const currentTheme = THEMES[settings.theme] || THEMES.charcoal;
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex flex-col w-full max-w-lg rounded-xl border ${border} ${modalBg} shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b ${border} px-6 py-4`}>
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 opacity-70" />
            <h2 className="text-sm font-medium tracking-wide">
              Typography &amp; Environment
            </h2>
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
              Editorial Atmosphere & Theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {VALID_THEMES.map((themeId) => {
                const th = THEMES[themeId];
                const isSelected = settings.theme === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => update('theme', th.id)}
                    className={`p-2.5 rounded-lg border text-left transition relative flex flex-col justify-between gap-2 overflow-hidden ${
                      isSelected ? selectedOutline : unselectedOutline
                    }`}
                    style={{
                      backgroundColor: th.tokens.appBg,
                      color: th.tokens.textColor,
                    }}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-medium tracking-tight truncate">{th.name}</span>
                      <span
                        className="h-2.5 w-2.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: th.accentColor }}
                        title={`Accent: ${th.accentName}`}
                      />
                    </div>
                    <div className="flex items-center justify-between w-full text-[10px] opacity-60">
                      <span>{th.sub}</span>
                      <span className="capitalize text-[9px]">{th.category}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Typeface Selection */}
          <div className="space-y-2.5">
            <label className="text-[11px] uppercase tracking-wider opacity-60 block">
              Editorial Typeface
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                {
                  id: 'serif',
                  name: 'Newsreader',
                  sub: 'Editorial Serif',
                  font: 'var(--font-serif)',
                },
                {
                  id: 'sans',
                  name: 'Jakarta Sans',
                  sub: 'Contemporary',
                  font: 'var(--font-sans)',
                },
                {
                  id: 'mono',
                  name: 'Typewriter',
                  sub: 'Serene Cadence',
                  font: 'var(--font-mono)',
                },
                {
                  id: 'brutalist',
                  name: 'Space Grotesk',
                  sub: 'Brutalist Raw',
                  font: 'var(--font-brutalist)',
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

              <label className={`flex items-center justify-between p-2.5 rounded-lg border ${cardBg} cursor-pointer transition ${itemHover}`}>
                <div>
                  <div className="font-medium">Active Typing Fade</div>
                  <div className="text-[11px] opacity-60">
                    Gently fades toolbars into zero-clutter flow while drafting.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.activeTypingFade ?? true}
                  onChange={(e) => update('activeTypingFade', e.target.checked)}
                  className="accent-stone-400 h-4 w-4 cursor-pointer"
                />
              </label>

              <label className={`flex items-center justify-between p-2.5 rounded-lg border ${cardBg} cursor-pointer transition ${itemHover}`}>
                <div>
                  <div className="font-medium">Chapter Drop Caps</div>
                  <div className="text-[11px] opacity-60">
                    Styles the opening letter of chapters and scene breaks with an illuminated drop cap.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.dropCap ?? false}
                  onChange={(e) => update('dropCap', e.target.checked)}
                  className="accent-stone-400 h-4 w-4 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* AI Editorial Assistant (Gemini) */}
          <div className={`space-y-3 pt-2 border-t ${border}`}>
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wider opacity-60 flex items-center gap-1.5 font-medium">
                <Sparkles className="h-3 w-3" style={{ color: currentTheme.tokens.accentColor }} />
                <span>Lumen Editorial Partner (Google Gemini)</span>
              </label>
              <span className="text-[10px] opacity-60">BYOK / Local-first</span>
            </div>

            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[11px] opacity-75">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings.geminiApiKey || ''}
                    onChange={(e) => update('geminiApiKey', e.target.value.trim())}
                    placeholder="Paste your Gemini API key (AQ... or AIza...)"
                    className={`w-full rounded-md px-3 py-1.5 text-xs font-mono border focus:outline-none pr-16 ${
                      isLightMode
                        ? 'bg-black/[0.03] border-black/[0.1] text-neutral-800'
                        : 'bg-white/[0.04] border-white/[0.1] text-neutral-200'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-60 hover:opacity-100 px-1.5 py-0.5 rounded"
                  >
                    {showApiKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="text-[10px] opacity-50 flex items-center justify-between">
                  <span>Stored securely in browser localStorage.</span>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:opacity-100"
                  >
                    Get free API key ↗
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] opacity-75">Model</label>
                  <select
                    value={settings.aiModel || 'gemini-3.5-flash-lite'}
                    onChange={(e) => update('aiModel', e.target.value as any)}
                    className={`w-full rounded-md px-2.5 py-1.5 text-xs border focus:outline-none ${
                      isLightMode
                        ? 'bg-black/[0.03] border-black/[0.1] text-neutral-800'
                        : 'bg-neutral-800 border-white/[0.1] text-neutral-200'
                    }`}
                  >
                    <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite (Fast &amp; Steady)</option>
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash (Deep Reasoning)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] opacity-75">Default Persona</label>
                  <select
                    value={settings.aiPersona || 'editor'}
                    onChange={(e) => update('aiPersona', e.target.value as any)}
                    className={`w-full rounded-md px-2.5 py-1.5 text-xs border focus:outline-none ${
                      isLightMode
                        ? 'bg-black/[0.03] border-black/[0.1] text-neutral-800'
                        : 'bg-neutral-800 border-white/[0.1] text-neutral-200'
                    }`}
                  >
                    <option value="editor">Editorial Partner (Pacing &amp; Structure)</option>
                    <option value="visionary">Sensory Visionary (Imagery &amp; Texture)</option>
                    <option value="critic">Sharp Critic (Plot &amp; Stakes)</option>
                  </select>
                </div>
              </div>
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

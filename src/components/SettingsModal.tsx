import React, { useState } from 'react';
import type { EditorSettings, FontFamily, ReadingWidth, BaseAtmosphere } from '../types';
import { X, Sliders, Download, Sparkles, Check, Pipette } from 'lucide-react';
import {
  THEMES,
  VALID_THEMES,
  VALID_BASE_ATMOSPHERES,
  ATMOSPHERES,
  ACCENT_PALETTE,
  getEffectiveTheme,
} from '../services/themes';

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
  const currentTheme = getEffectiveTheme(settings);
  const activeBase = (settings.baseAtmosphere || settings.theme || 'charcoal') as BaseAtmosphere;
  const activeAccent = settings.accentColor || currentTheme.tokens.accentColor;
  const activeWidth = settings.readingWidth || 'comfortable';
  const [customHex, setCustomHex] = useState(activeAccent);

  const update = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  const applyRecipe = (themeId: typeof settings.theme) => {
    const preset = THEMES[themeId];
    onUpdateSettings({
      ...settings,
      theme: themeId,
      baseAtmosphere: themeId,
      accentColor: preset.accentColor,
    });
    setCustomHex(preset.accentColor);
  };

  const applyBaseAtmosphere = (base: BaseAtmosphere) => {
    onUpdateSettings({
      ...settings,
      baseAtmosphere: base,
      theme: (base === 'oled' ? 'charcoal' : base),
    });
  };

  const applyAccentColor = (color: string) => {
    onUpdateSettings({
      ...settings,
      accentColor: color,
    });
    setCustomHex(color);
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
          {/* Section 1: Visual Studio (Mix & Match) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wider opacity-60 block font-semibold">
                Visual Studio: Mix &amp; Match
              </label>
              <span className="text-[10px] opacity-60">Custom Atmosphere</span>
            </div>

            {/* Live Atmosphere Preview Card */}
            <div
              className="p-3.5 rounded-lg border transition shadow-inner flex items-center justify-between gap-3 overflow-hidden"
              style={{
                backgroundColor: currentTheme.tokens.appBg,
                borderColor: currentTheme.tokens.borderColor,
                color: currentTheme.tokens.textColor,
              }}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className="font-serif font-bold text-2xl leading-none select-none"
                  style={{ color: activeAccent }}
                >
                  T
                </span>
                <div className="text-[11px] leading-tight">
                  <div className="font-medium tracking-tight">
                    {currentTheme.name}
                  </div>
                  <div className="opacity-60 text-[10px] mt-0.5">
                    he monoliths crawl beneath me.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-semibold shadow-xs"
                  style={{
                    backgroundColor: activeAccent,
                    color: currentTheme.tokens.accentContrast,
                  }}
                >
                  Active Ink
                </span>
              </div>
            </div>

            {/* 1. Base Canvas Atmosphere */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium opacity-70 block">
                1. Canvas Atmosphere (Background Base)
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {VALID_BASE_ATMOSPHERES.map((atmId) => {
                  const atm = ATMOSPHERES[atmId];
                  const isSelected = activeBase === atmId;
                  return (
                    <button
                      key={atmId}
                      type="button"
                      onClick={() => applyBaseAtmosphere(atmId)}
                      className={`p-2 rounded-md border text-left transition flex items-center justify-between gap-1.5 ${
                        isSelected ? selectedOutline : unselectedOutline
                      }`}
                      style={{
                        backgroundColor: atm.appBg,
                        color: atm.textColor,
                      }}
                      title={`${atm.name} — ${atm.sub}`}
                    >
                      <span className="text-[11px] font-medium truncate">{atm.name}</span>
                      {isSelected && (
                        <Check className="h-3 w-3 shrink-0" style={{ color: activeAccent }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Accent Ink Palette */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium opacity-70 block">
                  2. Accent Ink (Illuminated Drop Caps, Badges &amp; Focus)
                </span>
                <div className="flex items-center gap-1 text-[10px] opacity-60 font-mono">
                  <span>HEX:</span>
                  <span className="uppercase">{activeAccent}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border transition bg-black/[0.02] dark:bg-white/[0.02]">
                {ACCENT_PALETTE.map((acc) => {
                  const isSelected = activeAccent.toLowerCase() === acc.color.toLowerCase();
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => applyAccentColor(acc.color)}
                      className={`h-6 w-6 rounded-full transition relative flex items-center justify-center shadow-xs hover:scale-110 active:scale-95 ${
                        isSelected ? 'ring-2 ring-offset-2 ring-stone-400' : ''
                      }`}
                      style={{ backgroundColor: acc.color }}
                      title={`${acc.name} (${acc.color})`}
                    >
                      {isSelected && (
                        <span className="h-1.5 w-1.5 rounded-full bg-black/60 dark:bg-white/90" />
                      )}
                    </button>
                  );
                })}

                {/* Custom Color Picker input */}
                <label
                  className="flex items-center gap-1.5 ml-auto px-2 py-1 rounded border text-[10px] cursor-pointer transition hover:opacity-100 opacity-75"
                  title="Pick custom hex accent"
                >
                  <Pipette className="h-3 w-3" />
                  <span>Custom</span>
                  <input
                    type="color"
                    value={customHex.startsWith('#') ? customHex : '#f59e0b'}
                    onChange={(e) => applyAccentColor(e.target.value)}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {/* Curated 1-Click Recipes */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-medium opacity-70 block">
                Curated 1-Click Recipes (Instant Atmosphere + Matching Ink)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {VALID_THEMES.map((themeId) => {
                  const th = THEMES[themeId];
                  const isSelected =
                    settings.theme === th.id &&
                    (!settings.baseAtmosphere || settings.baseAtmosphere === th.id) &&
                    (!settings.accentColor || settings.accentColor.toLowerCase() === th.accentColor.toLowerCase());

                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => applyRecipe(th.id)}
                      className={`px-2.5 py-1 rounded-md border text-[10px] font-medium transition flex items-center gap-1.5 ${
                        isSelected ? selectedOutline : unselectedOutline
                      }`}
                      style={{
                        backgroundColor: th.tokens.appBg,
                        color: th.tokens.textColor,
                      }}
                      title={`Load ${th.name} preset`}
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: th.accentColor }}
                      />
                      <span>{th.name.replace('Marrow ', '')}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Layout & Typography */}
          <div className={`space-y-4 pt-4 border-t ${border}`}>
            <label className="text-[11px] uppercase tracking-wider opacity-60 block font-semibold">
              Editorial Canvas &amp; Type
            </label>

            {/* Reading Column Width */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium opacity-70 block">
                  Reading Column Width
                </span>
                <span className="text-[10px] opacity-60 capitalize">
                  {activeWidth === 'narrow'
                    ? '56ch (~580px) · Poetry / Focus'
                    : activeWidth === 'wide'
                    ? '88ch (~880px) · Manuscript'
                    : activeWidth === 'full'
                    ? 'Expansive · Edge to Edge'
                    : '72ch (~720px) · Classical Prose'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'narrow', name: 'Narrow', sub: '56ch' },
                  { id: 'comfortable', name: 'Standard', sub: '72ch' },
                  { id: 'wide', name: 'Wide', sub: '88ch' },
                  { id: 'full', name: 'Full', sub: 'Expansive' },
                ].map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => update('readingWidth', w.id as ReadingWidth)}
                    className={`py-1.5 px-2 rounded-md border text-center transition ${cardBg} ${
                      activeWidth === w.id ? selectedOutline : unselectedOutline
                    }`}
                  >
                    <div className="text-[11px] font-medium">{w.name}</div>
                    <div className="text-[9px] opacity-60">{w.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Typeface Selection */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-medium opacity-70 block">
                Editorial Typeface
              </span>
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
          </div>

          {/* Section 3: Ergonomic Toggles */}
          <div className={`space-y-3 pt-2 border-t ${border}`}>
            <label className="text-[11px] uppercase tracking-wider opacity-60 block font-semibold">
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
                  <div className="font-medium">Typewriter Audio Acoustics</div>
                  <div className="text-[11px] opacity-60">
                    Tactile mechanical key clicks, spacebar clacks, and carriage returns.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEffects ?? false}
                  onChange={(e) => update('soundEffects', e.target.checked)}
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
                    Styles opening letters of chapters and scene breaks with illuminated initials.
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

          {/* Section 4: AI Editorial Assistant (Gemini) */}
          <div className={`space-y-3 pt-2 border-t ${border}`}>
            <div className="flex items-center justify-between">
              <label className="text-[11px] uppercase tracking-wider opacity-60 flex items-center gap-1.5 font-semibold">
                <Sparkles className="h-3 w-3" style={{ color: activeAccent }} />
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

          {/* Section 5: Export */}
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
              backgroundColor: activeAccent,
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

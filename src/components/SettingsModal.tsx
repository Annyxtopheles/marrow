import React, { useState } from 'react';
import type { EditorSettings, FontFamily, ReadingWidth, BaseAtmosphere } from '../types';
import { X, Sliders, Download, Sparkles, Check, Pipette, Palette } from 'lucide-react';
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
  initialTab?: 'appearance' | 'editor';
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
  onExportVault,
  isLightMode,
  initialTab = 'appearance',
}) => {
  const [activeTab, setActiveTab] = useState<'appearance' | 'editor'>(initialTab);
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

  const border = isLightMode ? 'border-black/[0.06]' : 'border-white/[0.06]';
  const modalBg = isLightMode ? 'bg-[#f7f5f0] text-[#2c2a27]' : 'bg-[#18191c] text-[#dedad4]';
  const cardBg = isLightMode
    ? 'bg-black/[0.03] hover:bg-black/[0.05]'
    : 'bg-white/[0.03] hover:bg-white/[0.05]';
  const itemHover = isLightMode ? 'hover:bg-black/[0.04]' : 'hover:bg-white/[0.04]';

  const isCustomAccentSelected = !ACCENT_PALETTE.some(
    (a) => a.color.toLowerCase() === activeAccent.toLowerCase()
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex flex-col w-full max-w-lg rounded-2xl border ${border} ${modalBg} shadow-2xl overflow-hidden`}
      >
        {/* Header with Clean Tabs (zero harsh strokes) */}
        <div className={`flex items-center justify-between border-b ${border} px-5 py-3.5`}>
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.04]">
            <button
              type="button"
              onClick={() => setActiveTab('appearance')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'appearance'
                  ? `${isLightMode ? 'bg-white text-black shadow-xs' : 'bg-white/[0.12] text-white shadow-xs'}`
                  : 'opacity-50 hover:opacity-100'
              }`}
            >
              <Palette className="h-3.5 w-3.5" />
              <span>Appearance</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'editor'
                  ? `${isLightMode ? 'bg-white text-black shadow-xs' : 'bg-white/[0.12] text-white shadow-xs'}`
                  : 'opacity-50 hover:opacity-100'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Editor &amp; Writing</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className={`rounded-md p-1.5 transition ${itemHover} opacity-60 hover:opacity-100`}
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto max-h-[75vh] text-xs">
          {activeTab === 'appearance' ? (
            <div className="space-y-4">
              {/* Atmospheres */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50 block">
                  Atmosphere
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
                        className={`p-2 rounded-lg text-left transition flex items-center justify-between gap-1.5 ${
                          isSelected ? 'shadow-sm opacity-100' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: atm.appBg,
                          color: atm.textColor,
                          boxShadow: isSelected ? `inset 0 0 0 1px ${activeAccent}60` : undefined,
                        }}
                        title={atm.name}
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

              {/* Accent (Clean frameless line, no enclosing box or outlines) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50 block">
                  Accent
                </span>
                <div className="flex items-center justify-between gap-1.5 py-1 px-0.5 overflow-x-auto">
                  {ACCENT_PALETTE.map((acc) => {
                    const isSelected = activeAccent.toLowerCase() === acc.color.toLowerCase();
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => applyAccentColor(acc.color)}
                        className={`h-6 w-6 rounded-full transition shrink-0 relative flex items-center justify-center shadow-xs hover:scale-110 active:scale-95 ${
                          isSelected ? 'scale-105' : 'opacity-85 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: acc.color }}
                        title={acc.name}
                      >
                        {isSelected && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white shadow-xs" />
                        )}
                      </button>
                    );
                  })}

                  {/* Custom Eyedropper Button (minimal circular, no stroke) */}
                  <label
                    className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center cursor-pointer transition hover:scale-110 active:scale-95 ${
                      isCustomAccentSelected
                        ? 'scale-105 shadow-xs'
                        : 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-neutral-400 hover:text-white'
                    }`}
                    style={{
                      backgroundColor: isCustomAccentSelected ? activeAccent : undefined,
                      color: isCustomAccentSelected ? currentTheme.tokens.accentContrast : undefined,
                    }}
                    title="Custom Hex Color (Eyedropper)"
                  >
                    <Pipette className="h-3 w-3" />
                    <input
                      type="color"
                      value={customHex.startsWith('#') ? customHex : '#10b981'}
                      onChange={(e) => applyAccentColor(e.target.value)}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              {/* Presets (Full fill grid, frameless, no stroke) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50 block">
                  Presets
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {VALID_THEMES.map((themeId) => {
                    const th = THEMES[themeId];
                    const isSelected =
                      settings.theme === th.id &&
                      (!settings.baseAtmosphere || settings.baseAtmosphere === th.id) &&
                      (!settings.accentColor ||
                        settings.accentColor.toLowerCase() === th.accentColor.toLowerCase());

                    return (
                      <button
                        key={th.id}
                        type="button"
                        onClick={() => applyRecipe(th.id)}
                        className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1.5 ${
                          isSelected ? 'shadow-sm opacity-100' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: th.tokens.appBg,
                          color: th.tokens.textColor,
                          boxShadow: isSelected ? `inset 0 0 0 1px ${th.accentColor}60` : undefined,
                        }}
                        title={th.name}
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: th.accentColor }}
                        />
                        <span className="truncate">{th.name.replace('Marrow ', '')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Reading Column Width (Narrow, Standard, Full) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50 block">
                  Column Width
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'narrow', name: 'Narrow', sub: '56ch' },
                    { id: 'comfortable', name: 'Standard', sub: '72ch' },
                    { id: 'full', name: 'Full', sub: 'Expansive' },
                  ].map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => update('readingWidth', w.id as ReadingWidth)}
                      className={`py-1.5 px-2 rounded-lg text-center transition ${
                        activeWidth === w.id
                          ? `${isLightMode ? 'bg-black/[0.08] text-black' : 'bg-white/[0.12] text-white'} font-medium shadow-xs`
                          : 'opacity-65 hover:opacity-100 bg-black/[0.02] dark:bg-white/[0.02]'
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
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50 block">
                  Font
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
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
                      className={`py-1.5 px-2 rounded-lg text-center transition ${
                        settings.fontFamily === f.id
                          ? `${isLightMode ? 'bg-black/[0.08] text-black' : 'bg-white/[0.12] text-white'} font-medium shadow-xs`
                          : 'opacity-65 hover:opacity-100 bg-black/[0.02] dark:bg-white/[0.02]'
                      }`}
                    >
                      <div className="text-[11px] font-medium" style={{ fontFamily: f.font }}>
                        {f.name}
                      </div>
                      <div className="text-[9px] opacity-60">{f.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Typography Sliders */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
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

                <div className="space-y-1.5">
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

              {/* Writing Ergonomics */}
              <div className={`space-y-2 pt-3 border-t ${border}`}>
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50 block">
                  Ergonomics
                </span>

                <div className="space-y-1.5">
                  <label className={`flex items-center justify-between p-2 rounded-lg ${cardBg} cursor-pointer transition`}>
                    <div>
                      <div className="font-medium text-[11px]">Soft Breathing Cursor</div>
                      <div className="text-[10px] opacity-60">Gentle pulsing cursor animation.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.breathingCursor}
                      onChange={(e) => update('breathingCursor', e.target.checked)}
                      className="accent-stone-400 h-3.5 w-3.5 cursor-pointer"
                    />
                  </label>

                  <label className={`flex items-center justify-between p-2 rounded-lg ${cardBg} cursor-pointer transition`}>
                    <div>
                      <div className="font-medium text-[11px]">Typewriter Mode</div>
                      <div className="text-[10px] opacity-60">Centers current line vertically.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.typewriterMode}
                      onChange={(e) => update('typewriterMode', e.target.checked)}
                      className="accent-stone-400 h-3.5 w-3.5 cursor-pointer"
                    />
                  </label>

                  <label className={`flex items-center justify-between p-2 rounded-lg ${cardBg} cursor-pointer transition`}>
                    <div>
                      <div className="font-medium text-[11px]">Typewriter Audio Acoustics</div>
                      <div className="text-[10px] opacity-60">Mechanical key clicks, spacebar thump, and bell.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.soundEffects ?? false}
                      onChange={(e) => update('soundEffects', e.target.checked)}
                      className="accent-stone-400 h-3.5 w-3.5 cursor-pointer"
                    />
                  </label>

                  <label className={`flex items-center justify-between p-2 rounded-lg ${cardBg} cursor-pointer transition`}>
                    <div>
                      <div className="font-medium text-[11px]">Active Typing Fade</div>
                      <div className="text-[10px] opacity-60">Fades chrome and toolbars while typing.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.activeTypingFade ?? true}
                      onChange={(e) => update('activeTypingFade', e.target.checked)}
                      className="accent-stone-400 h-3.5 w-3.5 cursor-pointer"
                    />
                  </label>

                  <label className={`flex items-center justify-between p-2 rounded-lg ${cardBg} cursor-pointer transition`}>
                    <div>
                      <div className="font-medium text-[11px]">Chapter Drop Caps</div>
                      <div className="text-[10px] opacity-60">Illuminated capital letters on opening lines.</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.dropCap ?? false}
                      onChange={(e) => update('dropCap', e.target.checked)}
                      className="accent-stone-400 h-3.5 w-3.5 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* AI & Vault Export */}
              <div className={`space-y-2 pt-3 border-t ${border}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" style={{ color: activeAccent }} />
                    <span>Lumen Partner (Gemini)</span>
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={settings.geminiApiKey || ''}
                      onChange={(e) => update('geminiApiKey', e.target.value.trim())}
                      placeholder="Paste Gemini API key..."
                      className={`w-full rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none pr-14 ${
                        isLightMode
                          ? 'bg-black/[0.04] text-neutral-800'
                          : 'bg-white/[0.05] text-neutral-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-60 hover:opacity-100 px-1 py-0.5 rounded"
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onExportVault}
                    className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg transition ${cardBg}`}
                  >
                    <Download className="h-3.5 w-3.5 opacity-70" />
                    <span>Export Complete Vault (JSON)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`border-t ${border} px-5 py-3 flex justify-end`}>
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

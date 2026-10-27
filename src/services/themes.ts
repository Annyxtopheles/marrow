import type { ThemeMode } from '../types';

export interface ThemeTokens {
  appBg: string;
  editorBg: string;
  sidebarBg: string;
  headerBg: string;
  borderColor: string;
  textColor: string;
  textMuted: string;
  accentColor: string;
  accentContrast: string;
  accentHover: string;
  accentBg: string;
  activeItemBg: string;
  itemHoverBg: string;
  caretColor: string;
  selectionBg: string;
}

export interface ThemeDefinition {
  id: ThemeMode;
  name: string;
  sub: string;
  category: 'dark' | 'light';
  accentName: string;
  accentColor: string;
  swatchBg: string;
  swatchText: string;
  tokens: ThemeTokens;
}

export const VALID_THEMES: ThemeMode[] = [
  'charcoal',
  'canvas',
  'nordic',
  'sakura',
  'sepia',
  'evergreen',
  'dreamscape',
  'grunge',
];

export const THEMES: Record<ThemeMode, ThemeDefinition> = {
  charcoal: {
    id: 'charcoal',
    name: 'Marrow Charcoal',
    sub: 'Obsidian Dark',
    category: 'dark',
    accentName: 'Bone Ivory',
    accentColor: '#f4f1ea',
    swatchBg: 'bg-[#121315]',
    swatchText: 'text-[#dedad4]',
    tokens: {
      appBg: '#121315',
      editorBg: '#121315',
      sidebarBg: '#16171a',
      headerBg: '#16171a',
      borderColor: 'rgba(255, 255, 255, 0.07)',
      textColor: '#dedad4',
      textMuted: '#8a867f',
      accentColor: '#f4f1ea',
      accentContrast: '#151618',
      accentHover: '#e5e0d4',
      accentBg: 'rgba(244, 241, 234, 0.1)',
      activeItemBg: 'rgba(255, 255, 255, 0.08)',
      itemHoverBg: 'rgba(255, 255, 255, 0.05)',
      caretColor: '#c4b9a8',
      selectionBg: 'rgba(244, 241, 234, 0.18)',
    },
  },
  canvas: {
    id: 'canvas',
    name: 'Canvas Linen',
    sub: 'Warm Linen',
    category: 'light',
    accentName: 'Deep Ink',
    accentColor: '#151618',
    swatchBg: 'bg-[#f7f5f0]',
    swatchText: 'text-[#2c2a27]',
    tokens: {
      appBg: '#f7f5f0',
      editorBg: '#fffefb',
      sidebarBg: '#f7f5f0',
      headerBg: '#f7f5f0',
      borderColor: '#e4e0d7',
      textColor: '#2c2a27',
      textMuted: '#706c64',
      accentColor: '#151618',
      accentContrast: '#f4f1ea',
      accentHover: '#26272b',
      accentBg: 'rgba(21, 22, 24, 0.06)',
      activeItemBg: 'rgba(0, 0, 0, 0.07)',
      itemHoverBg: 'rgba(0, 0, 0, 0.04)',
      caretColor: '#2c2a27',
      selectionBg: 'rgba(44, 42, 39, 0.14)',
    },
  },
  nordic: {
    id: 'nordic',
    name: 'Modern Studio',
    sub: 'Slate & Electric Blue',
    category: 'dark',
    accentName: 'Electric Blue',
    accentColor: '#38bdf8',
    swatchBg: 'bg-[#0c1017]',
    swatchText: 'text-[#e2e8f0]',
    tokens: {
      appBg: '#0c1017',
      editorBg: '#0f141d',
      sidebarBg: '#111722',
      headerBg: '#111722',
      borderColor: 'rgba(56, 189, 248, 0.14)',
      textColor: '#e2e8f0',
      textMuted: '#78899f',
      accentColor: '#38bdf8',
      accentContrast: '#08121e',
      accentHover: '#0ea5e9',
      accentBg: 'rgba(56, 189, 248, 0.12)',
      activeItemBg: 'rgba(56, 189, 248, 0.12)',
      itemHoverBg: 'rgba(56, 189, 248, 0.06)',
      caretColor: '#38bdf8',
      selectionBg: 'rgba(56, 189, 248, 0.22)',
    },
  },
  sakura: {
    id: 'sakura',
    name: 'Pure Paper',
    sub: 'Bright White & Pink',
    category: 'light',
    accentName: 'Sakura Blush',
    accentColor: '#f43f5e',
    swatchBg: 'bg-[#ffffff]',
    swatchText: 'text-[#18181b]',
    tokens: {
      appBg: '#ffffff',
      editorBg: '#ffffff',
      sidebarBg: '#fafafc',
      headerBg: '#fafafc',
      borderColor: '#e5e7eb',
      textColor: '#18181b',
      textMuted: '#6b7280',
      accentColor: '#f43f5e',
      accentContrast: '#ffffff',
      accentHover: '#e11d48',
      accentBg: 'rgba(244, 63, 94, 0.08)',
      activeItemBg: 'rgba(244, 63, 94, 0.08)',
      itemHoverBg: 'rgba(0, 0, 0, 0.03)',
      caretColor: '#f43f5e',
      selectionBg: 'rgba(244, 63, 94, 0.16)',
    },
  },
  sepia: {
    id: 'sepia',
    name: 'Vintage Sepia',
    sub: 'Parchment & Amber',
    category: 'light',
    accentName: 'Warm Amber',
    accentColor: '#d97706',
    swatchBg: 'bg-[#fbf7ee]',
    swatchText: 'text-[#362b21]',
    tokens: {
      appBg: '#fbf7ee',
      editorBg: '#fbf7ee',
      sidebarBg: '#f5eedd',
      headerBg: '#f5eedd',
      borderColor: '#e7ddce',
      textColor: '#362b21',
      textMuted: '#7c6d5e',
      accentColor: '#d97706',
      accentContrast: '#ffffff',
      accentHover: '#b45309',
      accentBg: 'rgba(217, 119, 6, 0.1)',
      activeItemBg: 'rgba(217, 119, 6, 0.1)',
      itemHoverBg: 'rgba(0, 0, 0, 0.04)',
      caretColor: '#d97706',
      selectionBg: 'rgba(217, 119, 6, 0.18)',
    },
  },
  evergreen: {
    id: 'evergreen',
    name: 'Nordic Pine',
    sub: 'Deep Forest & Sage',
    category: 'dark',
    accentName: 'Sage Mint',
    accentColor: '#34d399',
    swatchBg: 'bg-[#09110d]',
    swatchText: 'text-[#dff0e6]',
    tokens: {
      appBg: '#09110d',
      editorBg: '#0c1510',
      sidebarBg: '#0f1a14',
      headerBg: '#0f1a14',
      borderColor: 'rgba(52, 211, 153, 0.14)',
      textColor: '#dff0e6',
      textMuted: '#6f8b7b',
      accentColor: '#34d399',
      accentContrast: '#06130b',
      accentHover: '#10b981',
      accentBg: 'rgba(52, 211, 153, 0.12)',
      activeItemBg: 'rgba(52, 211, 153, 0.12)',
      itemHoverBg: 'rgba(52, 211, 153, 0.06)',
      caretColor: '#34d399',
      selectionBg: 'rgba(52, 211, 153, 0.22)',
    },
  },
  dreamscape: {
    id: 'dreamscape',
    name: 'Dreamscape',
    sub: 'Pastel Aurora Canvas',
    category: 'light',
    accentName: 'Orchid Fuchsia',
    accentColor: '#d946ef',
    swatchBg: 'bg-gradient-to-tr from-pink-200 via-purple-200 to-sky-200',
    swatchText: 'text-[#1e1b4b]',
    tokens: {
      appBg: '#faf7fc',
      editorBg: '#ffffff',
      sidebarBg: '#f5f0f9',
      headerBg: '#f5f0f9',
      borderColor: '#e8ddf0',
      textColor: '#1e1b4b',
      textMuted: '#645f78',
      accentColor: '#d946ef',
      accentContrast: '#ffffff',
      accentHover: '#c026d3',
      accentBg: 'rgba(217, 70, 239, 0.1)',
      activeItemBg: 'rgba(217, 70, 239, 0.1)',
      itemHoverBg: 'rgba(0, 0, 0, 0.03)',
      caretColor: '#d946ef',
      selectionBg: 'rgba(217, 70, 239, 0.22)',
    },
  },
  grunge: {
    id: 'grunge',
    name: 'Brutalist Grunge',
    sub: 'Raw Solid Asphalt',
    category: 'dark',
    accentName: 'Industrial Amber',
    accentColor: '#facc15',
    swatchBg: 'bg-[#121214]',
    swatchText: 'text-[#f4f4f0]',
    tokens: {
      appBg: '#121214',
      editorBg: '#121214',
      sidebarBg: '#0d0d0f',
      headerBg: '#0d0d0f',
      borderColor: 'rgba(255, 255, 255, 0.12)',
      textColor: '#f4f4f0',
      textMuted: '#8b8a85',
      accentColor: '#facc15',
      accentContrast: '#0d0d0f',
      accentHover: '#eab308',
      accentBg: 'rgba(250, 204, 21, 0.12)',
      activeItemBg: 'rgba(250, 204, 21, 0.12)',
      itemHoverBg: 'rgba(255, 255, 255, 0.05)',
      caretColor: '#facc15',
      selectionBg: 'rgba(250, 204, 21, 0.25)',
    },
  },
};

export const isThemeLight = (theme: ThemeMode): boolean => {
  return THEMES[theme]?.category === 'light';
};

export const applyThemeToDocument = (theme: ThemeMode): void => {
  if (typeof document === 'undefined') return;
  const def = THEMES[theme] || THEMES.charcoal;
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.setProperty('--theme-accent', def.tokens.accentColor);
  document.documentElement.style.setProperty('--theme-accent-contrast', def.tokens.accentContrast);
  document.documentElement.style.setProperty('--theme-accent-hover', def.tokens.accentHover);
  document.documentElement.style.setProperty('--theme-caret', def.tokens.caretColor);
  document.documentElement.style.setProperty('--theme-selection', def.tokens.selectionBg);
  document.documentElement.style.setProperty('--theme-border', def.tokens.borderColor);
  document.documentElement.style.setProperty('--theme-bg', def.tokens.appBg);
  document.documentElement.style.setProperty('--theme-text', def.tokens.textColor);
};

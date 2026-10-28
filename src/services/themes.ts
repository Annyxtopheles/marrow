import type { ThemeMode, BaseAtmosphere } from '../types';

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

export interface AtmosphereOption {
  id: BaseAtmosphere;
  name: string;
  sub: string;
  category: 'dark' | 'light';
  appBg: string;
  editorBg: string;
  sidebarBg: string;
  headerBg: string;
  borderColor: string;
  textColor: string;
  textMuted: string;
}

export interface AccentOption {
  id: string;
  name: string;
  color: string;
}

export const VALID_BASE_ATMOSPHERES: BaseAtmosphere[] = [
  'charcoal',
  'oled',
  'nordic',
  'evergreen',
  'grunge',
  'canvas',
  'sepia',
  'sakura',
  'dreamscape',
];

export const ATMOSPHERES: Record<BaseAtmosphere, AtmosphereOption> = {
  charcoal: {
    id: 'charcoal',
    name: 'Marrow Charcoal',
    sub: 'Deep Matte Graphite',
    category: 'dark',
    appBg: '#121315',
    editorBg: '#121315',
    sidebarBg: '#16171a',
    headerBg: '#16171a',
    borderColor: 'rgba(255, 255, 255, 0.07)',
    textColor: '#dedad4',
    textMuted: '#8a867f',
  },
  oled: {
    id: 'oled',
    name: 'Pitch OLED',
    sub: 'True Absolute Black',
    category: 'dark',
    appBg: '#000000',
    editorBg: '#000000',
    sidebarBg: '#080808',
    headerBg: '#080808',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    textColor: '#eae6df',
    textMuted: '#807c75',
  },
  nordic: {
    id: 'nordic',
    name: 'Nordic Slate',
    sub: 'Midnight Subarctic Navy',
    category: 'dark',
    appBg: '#0f141c',
    editorBg: '#0f141c',
    sidebarBg: '#141b26',
    headerBg: '#141b26',
    borderColor: 'rgba(56, 189, 248, 0.12)',
    textColor: '#e2e8f0',
    textMuted: '#94a3b8',
  },
  evergreen: {
    id: 'evergreen',
    name: 'Pine Evergreen',
    sub: 'Dense Mountain Forest',
    category: 'dark',
    appBg: '#0d1612',
    editorBg: '#0d1612',
    sidebarBg: '#121f19',
    headerBg: '#121f19',
    borderColor: 'rgba(16, 185, 129, 0.12)',
    textColor: '#e1ede6',
    textMuted: '#84a993',
  },
  grunge: {
    id: 'grunge',
    name: 'Brutalist Grunge',
    sub: 'Raw Asphalt Charcoal',
    category: 'dark',
    appBg: '#121214',
    editorBg: '#121214',
    sidebarBg: '#0d0d0f',
    headerBg: '#0d0d0f',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    textColor: '#f4f4f0',
    textMuted: '#8b8a85',
  },
  canvas: {
    id: 'canvas',
    name: 'Canvas Linen',
    sub: 'Natural Warm Linen',
    category: 'light',
    appBg: '#f7f5f0',
    editorBg: '#fffefb',
    sidebarBg: '#f7f5f0',
    headerBg: '#f7f5f0',
    borderColor: '#e4e0d7',
    textColor: '#2c2a27',
    textMuted: '#706c64',
  },
  sepia: {
    id: 'sepia',
    name: 'Antique Sepia',
    sub: 'Nostalgic Book Parchment',
    category: 'light',
    appBg: '#f5eedd',
    editorBg: '#faf5ea',
    sidebarBg: '#f0e6d2',
    headerBg: '#f0e6d2',
    borderColor: '#e2d3be',
    textColor: '#3d3228',
    textMuted: '#7c6d5e',
  },
  sakura: {
    id: 'sakura',
    name: 'Sakura Blush',
    sub: 'Porcelain White & Petal',
    category: 'light',
    appBg: '#fafafc',
    editorBg: '#ffffff',
    sidebarBg: '#f4f4f7',
    headerBg: '#f4f4f7',
    borderColor: '#e5e5ea',
    textColor: '#27272a',
    textMuted: '#71717a',
  },
  dreamscape: {
    id: 'dreamscape',
    name: 'Dreamscape Vapor',
    sub: 'Soft Violet Horizon',
    category: 'light',
    appBg: '#faf7fd',
    editorBg: '#ffffff',
    sidebarBg: '#f5f0f9',
    headerBg: '#f5f0f9',
    borderColor: '#e8ddf0',
    textColor: '#1e1b4b',
    textMuted: '#645f78',
  },
};

export const ACCENT_PALETTE: AccentOption[] = [
  { id: 'amber', name: 'Sunset Amber', color: '#f59e0b' },
  { id: 'gold', name: 'Industrial Gold', color: '#facc15' },
  { id: 'cyan', name: 'Electric Cyan', color: '#38bdf8' },
  { id: 'emerald', name: 'Emerald Pine', color: '#10b981' },
  { id: 'mint', name: 'Mint Frost', color: '#2dd4bf' },
  { id: 'rose', name: 'Rose Velvet', color: '#fb7185' },
  { id: 'violet', name: 'Royal Violet', color: '#d946ef' },
  { id: 'terracotta', name: 'Terracotta Rust', color: '#ea580c' },
  { id: 'crimson', name: 'Crimson Scarlet', color: '#ef4444' },
  { id: 'indigo', name: 'Twilight Indigo', color: '#818cf8' },
  { id: 'ivory', name: 'Bone Ivory', color: '#f4f1ea' },
  { id: 'silver', name: 'Monolith Silver', color: '#cbd5e1' },
];

export const hexToRgba = (hex: string, alpha: number): string => {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(245, 158, 11, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getContrastColor = (hex: string): string => {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return '#151618';
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? '#151618' : '#ffffff';
};

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
    sub: 'Deep Graphite',
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

export const getEffectiveTheme = (settings: {
  theme?: ThemeMode;
  accentColor?: string;
  baseAtmosphere?: BaseAtmosphere;
}): ThemeDefinition => {
  const baseKey = settings.baseAtmosphere || settings.theme || 'charcoal';
  const atm = ATMOSPHERES[baseKey] || ATMOSPHERES.charcoal;
  const defaultThemeDef = THEMES[settings.theme || 'charcoal'] || THEMES.charcoal;

  const accentColor = settings.accentColor || defaultThemeDef.accentColor;
  const accentContrast = getContrastColor(accentColor);
  const accentHover = accentColor;
  const accentBg = hexToRgba(accentColor, 0.12);
  const selectionBg = hexToRgba(accentColor, 0.22);
  const caretColor = accentColor;

  return {
    id: (settings.theme || 'charcoal') as ThemeMode,
    name: atm.name,
    sub: atm.sub,
    category: atm.category,
    accentName: 'Custom Ink',
    accentColor,
    swatchBg: `bg-[${atm.appBg}]`,
    swatchText: `text-[${atm.textColor}]`,
    tokens: {
      appBg: atm.appBg,
      editorBg: atm.editorBg,
      sidebarBg: atm.sidebarBg,
      headerBg: atm.headerBg,
      borderColor: atm.borderColor,
      textColor: atm.textColor,
      textMuted: atm.textMuted,
      accentColor,
      accentContrast,
      accentHover,
      accentBg,
      activeItemBg: hexToRgba(accentColor, 0.14),
      itemHoverBg: atm.category === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
      caretColor,
      selectionBg,
    },
  };
};

export const isThemeLight = (
  themeOrSettings: ThemeMode | { theme?: ThemeMode; baseAtmosphere?: BaseAtmosphere }
): boolean => {
  if (typeof themeOrSettings === 'string') {
    return THEMES[themeOrSettings]?.category === 'light';
  }
  const baseKey = themeOrSettings.baseAtmosphere || themeOrSettings.theme || 'charcoal';
  return ATMOSPHERES[baseKey]?.category === 'light';
};

export const applyThemeToDocument = (
  themeOrSettings: ThemeMode | { theme?: ThemeMode; accentColor?: string; baseAtmosphere?: BaseAtmosphere }
): void => {
  if (typeof document === 'undefined') return;
  const settingsObj =
    typeof themeOrSettings === 'string'
      ? { theme: themeOrSettings }
      : themeOrSettings;

  const def = getEffectiveTheme(settingsObj);
  const activeThemeId = settingsObj.baseAtmosphere || settingsObj.theme || 'charcoal';

  document.documentElement.setAttribute('data-theme', activeThemeId);
  document.documentElement.style.setProperty('--theme-accent', def.tokens.accentColor);
  document.documentElement.style.setProperty('--theme-accent-contrast', def.tokens.accentContrast);
  document.documentElement.style.setProperty('--theme-accent-hover', def.tokens.accentHover);
  document.documentElement.style.setProperty('--theme-accent-bg', def.tokens.accentBg);
  document.documentElement.style.setProperty('--theme-caret', def.tokens.caretColor);
  document.documentElement.style.setProperty('--theme-selection', def.tokens.selectionBg);
  document.documentElement.style.setProperty('--theme-border', def.tokens.borderColor);
  document.documentElement.style.setProperty('--theme-bg', def.tokens.appBg);
  document.documentElement.style.setProperty('--theme-text', def.tokens.textColor);
  document.documentElement.style.setProperty('--theme-sidebar-bg', def.tokens.sidebarBg);
  document.documentElement.style.setProperty('--theme-editor-bg', def.tokens.editorBg);
};

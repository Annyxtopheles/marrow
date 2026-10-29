import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Note, Folder, EditorSettings, ThemeMode } from '../types';
import {
  Search,
  FileText,
  Plus,
  Maximize2,
  Minimize2,
  Printer,
  Sparkles,
  Sliders,
  Flame,
  Volume2,
  VolumeX,
  CaseUpper,
  BookOpen,
} from 'lucide-react';
import { THEMES, getEffectiveTheme } from '../services/themes';

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: Note[];
  folders: Folder[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  settings: EditorSettings;
  onUpdateSettings: (newSettings: EditorSettings) => void;
  onToggleFocus: () => void;
  onOpenSettings: () => void;
  onOpenCompiler: () => void;
  onOpenSprint: () => void;
  isLightMode: boolean;
}

interface PaletteAction {
  id: string;
  category: 'Notes' | 'Actions' | 'Themes';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  run: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  notes,
  folders,
  activeNoteId: _activeNoteId,
  onSelectNote,
  onCreateNote,
  settings,
  onUpdateSettings,
  onToggleFocus,
  onOpenSettings,
  onOpenCompiler,
  onOpenSprint,
  isLightMode,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const currentTheme = getEffectiveTheme(settings);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  const folderMap = useMemo(() => {
    const map = new Map<string, string>();
    folders.forEach((f) => map.set(f.id, f.name));
    return map;
  }, [folders]);

  const items: PaletteAction[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: PaletteAction[] = [];

    // 1. Matched notes
    const activeNotes = notes;
    const matchedNotes = activeNotes
      .filter((n) => {
        if (!q) return true;
        const inTitle = (n.title || 'Untitled').toLowerCase().includes(q);
        const inTags = n.tags?.some((t) => t.toLowerCase().includes(q)) ?? false;
        return inTitle || inTags;
      })
      .slice(0, 10);

    matchedNotes.forEach((n) => {
      const folderName = n.folderId ? folderMap.get(n.folderId) : undefined;
      result.push({
        id: `note-${n.id}`,
        category: 'Notes',
        title: n.title || 'Untitled note',
        subtitle: `${folderName ? folderName + ' · ' : ''}${n.wordCount || 0} words`,
        icon: <FileText className="h-4 w-4 shrink-0 opacity-70" />,
        run: () => {
          onSelectNote(n.id);
          onClose();
        },
      });
    });

    // 2. Actions
    const actions: PaletteAction[] = [
      {
        id: 'action-new-note',
        category: 'Actions',
        title: 'Create New Note',
        subtitle: 'Start a blank writing canvas',
        icon: <Plus className="h-4 w-4 shrink-0 opacity-70" />,
        run: () => {
          onCreateNote();
          onClose();
        },
      },
      {
        id: 'action-sprint',
        category: 'Actions',
        title: 'Start Writing Sprint',
        subtitle: 'Timeboxed focus timer with cadence tracking',
        icon: <Flame className="h-4 w-4 shrink-0 text-amber-500" />,
        run: () => {
          onOpenSprint();
          onClose();
        },
      },
      {
        id: 'action-zen',
        category: 'Actions',
        title: settings.focusMode ? 'Exit Zen Mode' : 'Enter Zen Focus Mode',
        subtitle: 'Distraction-free full-screen writing canvas',
        icon: settings.focusMode ? (
          <Minimize2 className="h-4 w-4 shrink-0 opacity-70" />
        ) : (
          <Maximize2 className="h-4 w-4 shrink-0 opacity-70" />
        ),
        run: () => {
          onToggleFocus();
          onClose();
        },
      },
      {
        id: 'action-print',
        category: 'Actions',
        title: 'Print / Export to Clean PDF',
        subtitle: 'Publication book layout without UI chrome',
        icon: <Printer className="h-4 w-4 shrink-0 opacity-70" />,
        run: () => {
          onClose();
          setTimeout(() => window.print(), 100);
        },
      },
      {
        id: 'action-compiler',
        category: 'Actions',
        title: 'Compile Manuscript',
        subtitle: 'Assemble chapters and export manuscript',
        icon: <BookOpen className="h-4 w-4 shrink-0 opacity-70" />,
        run: () => {
          onOpenCompiler();
          onClose();
        },
      },
      {
        id: 'action-dropcap',
        category: 'Actions',
        title: settings.dropCap ? 'Disable Chapter Drop Caps' : 'Enable Chapter Drop Caps',
        subtitle: 'Illuminated opening initial letters',
        icon: <CaseUpper className="h-4 w-4 shrink-0 opacity-70" />,
        run: () => {
          onUpdateSettings({ ...settings, dropCap: !settings.dropCap });
          onClose();
        },
      },
      {
        id: 'action-audio',
        category: 'Actions',
        title: settings.soundEffects ? 'Mute Typewriter Acoustics' : 'Enable Typewriter Acoustics',
        subtitle: 'Mechanical keystroke clicks and carriage return',
        icon: settings.soundEffects ? (
          <VolumeX className="h-4 w-4 shrink-0 opacity-70" />
        ) : (
          <Volume2 className="h-4 w-4 shrink-0 opacity-70" />
        ),
        run: () => {
          onUpdateSettings({ ...settings, soundEffects: !settings.soundEffects });
          onClose();
        },
      },
      {
        id: 'action-settings',
        category: 'Actions',
        title: 'Open Settings & Visual Studio',
        subtitle: 'Typeface, atmosphere backgrounds & accent ink',
        icon: <Sliders className="h-4 w-4 shrink-0 opacity-70" />,
        run: () => {
          onOpenSettings();
          onClose();
        },
      },
    ];

    const matchedActions = actions.filter((a) => {
      if (!q) return true;
      return a.title.toLowerCase().includes(q) || (a.subtitle && a.subtitle.toLowerCase().includes(q));
    });
    result.push(...matchedActions);

    // 3. Theme Presets
    const themePresets: { id: ThemeMode; name: string }[] = [
      { id: 'charcoal', name: 'Marrow Charcoal (Dark)' },
      { id: 'canvas', name: 'Canvas Linen (Light)' },
      { id: 'sepia', name: 'Antique Sepia (Parchment)' },
      { id: 'nordic', name: 'Nordic Slate (Navy)' },
      { id: 'evergreen', name: 'Pine Evergreen (Forest)' },
      { id: 'sakura', name: 'Sakura Blush (Porcelain)' },
      { id: 'grunge', name: 'Brutalist Grunge (Asphalt)' },
    ];

    const matchedThemes = themePresets.filter((t) => {
      if (!q) return false; // only show on search
      return t.name.toLowerCase().includes(q) || 'theme'.includes(q);
    });

    matchedThemes.forEach((t) => {
      const def = THEMES[t.id];
      result.push({
        id: `theme-${t.id}`,
        category: 'Themes',
        title: `Switch Theme: ${t.name}`,
        subtitle: def.sub,
        icon: <Sparkles className="h-4 w-4 shrink-0" style={{ color: def.accentColor }} />,
        run: () => {
          onUpdateSettings({
            ...settings,
            theme: t.id,
            baseAtmosphere: t.id,
            accentColor: def.accentColor,
          });
          onClose();
        },
      });
    });

    return result;
  }, [
    query,
    notes,
    folderMap,
    onSelectNote,
    onCreateNote,
    onToggleFocus,
    onOpenSettings,
    onOpenCompiler,
    onOpenSprint,
    onUpdateSettings,
    settings,
    onClose,
  ]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (items.length > 0 ? (prev - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].run();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  const border = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.08]';
  const modalBg = isLightMode ? 'bg-[#f7f5f0] text-[#2c2a27]' : 'bg-[#18191c] text-[#dedad4]';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/55 backdrop-blur-sm animate-in fade-in duration-100"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex flex-col w-full max-w-xl rounded-xl border ${border} ${modalBg} shadow-2xl overflow-hidden`}
      >
        {/* Search Input Bar */}
        <div className={`flex items-center gap-3 px-4 py-3 border-b ${border}`}>
          <Search className="h-4 w-4 opacity-50 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a note name or command... (↑↓ to select, Esc to close)"
            className="w-full bg-transparent text-sm focus:outline-none placeholder:opacity-40"
          />
          <span className="text-[10px] opacity-40 px-1.5 py-0.5 rounded border border-current font-mono">
            ESC
          </span>
        </div>

        {/* Action List */}
        <div
          ref={listRef}
          className="max-h-[380px] overflow-y-auto p-2 space-y-0.5 text-xs select-none"
        >
          {items.length === 0 ? (
            <div className="py-8 text-center opacity-50">No matching notes or commands found.</div>
          ) : (
            items.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.run()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition ${
                    isSelected
                      ? isLightMode
                        ? 'bg-black/[0.07] font-medium'
                        : 'bg-white/[0.09] font-medium'
                      : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.icon}
                    <div className="min-w-0 truncate">
                      <div className="truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-[10px] opacity-55 truncate">{item.subtitle}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider opacity-40 shrink-0 ml-2">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className={`px-4 py-2 border-t ${border} text-[10px] opacity-45 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span style={{ color: currentTheme.tokens.accentColor }} className="font-semibold">
            Marrow Command Center
          </span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import type { Note, Folder, ThemeMode } from '../types';
import { THEMES, type ThemeDefinition } from '../services/themes';
import {
  Folder as FolderIcon,
  FolderPlus,
  FilePlus,
  Search,
  Pin,
  PinOff,
  ChevronRight,
  ChevronDown,
  Trash2,
  Settings,
  BookOpen,
  Pencil,
  FolderInput,
  Copy,
  Download,
  Plus,
  Columns2,
  Target,
} from 'lucide-react';
import { ContextMenu, type ContextMenuItem, type ContextMenuSubItem } from './ContextMenu';

const downloadNoteAsMarkdown = (note: Note) => {
  const md = note.content
    .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n\n')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .trim();

  const safeTitle = (note.title || 'Untitled').trim().replace(/[/\\?%*:|"<>]/g, '-');
  const fullContent = `# ${note.title || 'Untitled'}\n\n${md}`;
  const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeTitle}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface SidebarProps {
  notes: Note[];
  folders: Folder[];
  activeNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onCreateNote: (folderId?: string | null) => void;
  onCreateFolder: (name: string, parentId?: string | null) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  onDeleteNote: (noteId: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onTogglePin: (noteId: string) => void;
  onRenameNote?: (noteId: string, newTitle: string) => void;
  onMoveNote?: (noteId: string, targetFolderId: string | null) => void;
  onDuplicateNote?: (note: Note) => void;
  onOpenSettings: () => void;
  onOpenCompile?: (folderId?: string | null) => void;
  isLightMode: boolean;
  theme?: ThemeMode;
  currentTheme?: ThemeDefinition;
  vaultName?: string | null;
  onPickVault?: () => void;
  onDisconnectVault?: () => void;
  onOpenReferenceSplit?: (noteId: string) => void;
  onSetTargetWordCount?: (noteId: string, target: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  folders,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onCreateFolder,
  onRenameFolder,
  onDeleteNote,
  onDeleteFolder,
  onTogglePin,
  onRenameNote,
  onMoveNote,
  onDuplicateNote,
  onOpenSettings,
  onOpenCompile,
  isLightMode,
  theme,
  currentTheme: propTheme,
  vaultName,
  onPickVault,
  onDisconnectVault,
  onOpenReferenceSplit,
  onSetTargetWordCount,
}) => {
  const currentTheme = propTheme || THEMES[theme || 'charcoal'] || THEMES.charcoal;
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Inline rename state
  const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  // Drag and drop state
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isDragOverRoot, setIsDragOverRoot] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const startRenameNote = (note: Note) => {
    setRenamingNoteId(note.id);
    setEditingTitle(note.title);
  };

  const handleFinishRenameNote = (noteId: string) => {
    if (onRenameNote && editingTitle.trim()) {
      onRenameNote(noteId, editingTitle.trim());
    }
    setRenamingNoteId(null);
  };

  const startRenameFolder = (folder: Folder) => {
    setRenamingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const handleFinishRenameFolder = (folderId: string) => {
    if (onRenameFolder && editingFolderName.trim()) {
      onRenameFolder(folderId, editingFolderName.trim());
    }
    setRenamingFolderId(null);
  };

  const filteredNotes = notes.filter((n) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const cleanTag = q.replace(/^#/, '');
    return (
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      (n.tags || []).some((t) => t.toLowerCase().includes(cleanTag))
    );
  });

  // Sort notes with pinned first, then by updated timestamp
  const sortNotes = (items: Note[]) => {
    return [...items].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  };

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setShowFolderModal(false);
  };

  const handleNoteContextMenu = (e: React.MouseEvent, note: Note) => {
    e.preventDefault();
    e.stopPropagation();

    // Destination folders for moving
    const folderSubmenu: ContextMenuSubItem[] = [
      {
        label: 'General (Root)',
        icon: <FolderIcon className="h-3 w-3" />,
        active: note.folderId === null,
        onClick: () => onMoveNote && onMoveNote(note.id, null),
      },
      ...folders.map((f) => ({
        label: f.name,
        icon: <FolderIcon className="h-3 w-3" />,
        active: note.folderId === f.id,
        onClick: () => onMoveNote && onMoveNote(note.id, f.id),
      })),
    ];

    const items: ContextMenuItem[] = [
      {
        label: 'Rename',
        icon: <Pencil className="h-3 w-3" />,
        onClick: () => startRenameNote(note),
      },
      {
        label: 'Open in Reference Split',
        icon: <Columns2 className="h-3 w-3" />,
        onClick: () => onOpenReferenceSplit && onOpenReferenceSplit(note.id),
      },
      {
        label: 'Set Chapter Target...',
        icon: <Target className="h-3 w-3" />,
        onClick: () => {
          if (onSetTargetWordCount) {
            const input = window.prompt(
              `Target word count for "${note.title || 'Untitled'}":`,
              String(note.targetWordCount || 2000)
            );
            if (input !== null) {
              const val = parseInt(input.trim(), 10);
              onSetTargetWordCount(note.id, isNaN(val) || val <= 0 ? 0 : val);
            }
          }
        },
      },
      {
        label: note.pinned ? 'Unpin Note' : 'Pin Note',
        icon: note.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />,
        onClick: () => onTogglePin(note.id),
      },
      {
        label: 'Move to Folder',
        icon: <FolderInput className="h-3 w-3" />,
        submenu: folderSubmenu,
      },
      {
        label: 'Duplicate',
        icon: <Copy className="h-3 w-3" />,
        onClick: () => onDuplicateNote && onDuplicateNote(note),
      },
      {
        label: 'Download .md',
        icon: <Download className="h-3 w-3" />,
        onClick: () => downloadNoteAsMarkdown(note),
      },
      {
        label: 'sep-note',
        separator: true,
      },
      {
        label: 'Delete Note',
        icon: <Trash2 className="h-3 w-3" />,
        danger: true,
        onClick: () => onDeleteNote(note.id),
      },
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleFolderContextMenu = (e: React.MouseEvent, folder: Folder) => {
    e.preventDefault();
    e.stopPropagation();

    const items: ContextMenuItem[] = [
      {
        label: 'New Note Inside',
        icon: <FilePlus className="h-3 w-3" />,
        onClick: () => {
          setCollapsedFolders((prev) => ({ ...prev, [folder.id]: false }));
          onCreateNote(folder.id);
        },
      },
      {
        label: 'Rename Folder',
        icon: <Pencil className="h-3 w-3" />,
        onClick: () => startRenameFolder(folder),
      },
      {
        label: 'Compile Manuscript...',
        icon: <BookOpen className="h-3 w-3" />,
        onClick: () => onOpenCompile && onOpenCompile(folder.id),
      },
      {
        label: 'sep-folder',
        separator: true,
      },
      {
        label: 'Delete Folder',
        icon: <Trash2 className="h-3 w-3" />,
        danger: true,
        onClick: () => onDeleteFolder && onDeleteFolder(folder.id),
      },
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const handleEmptySpaceContextMenu = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.group, button, input')) return;
    e.preventDefault();

    const items: ContextMenuItem[] = [
      {
        label: 'New Document',
        icon: <FilePlus className="h-3 w-3" />,
        onClick: () => onCreateNote(null),
      },
      {
        label: 'New Folder',
        icon: <FolderPlus className="h-3 w-3" />,
        onClick: () => setShowFolderModal(true),
      },
      {
        label: 'Compile Entire Vault...',
        icon: <BookOpen className="h-3 w-3" />,
        onClick: () => onOpenCompile && onOpenCompile(null),
      },
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const borderColor = theme === 'sakura'
    ? 'border-[#e5e7eb]'
    : theme === 'sepia'
    ? 'border-[#e7ddce]'
    : theme === 'dreamscape'
    ? 'border-black/[0.06]'
    : theme === 'nordic'
    ? 'border-sky-500/15'
    : theme === 'evergreen'
    ? 'border-emerald-500/15'
    : theme === 'grunge'
    ? 'border-white/[0.12]'
    : isLightMode
    ? 'border-[#e4e0d7]'
    : 'border-white/[0.08]';

  const sidebarBg = theme === 'sakura'
    ? 'bg-[#fafafc]'
    : theme === 'sepia'
    ? 'bg-[#f5eedd]'
    : theme === 'dreamscape'
    ? 'bg-white/45 backdrop-blur-xl'
    : theme === 'nordic'
    ? 'bg-[#111722]'
    : theme === 'evergreen'
    ? 'bg-[#0f1a14]'
    : theme === 'grunge'
    ? 'bg-[#0d0d0f]'
    : isLightMode
    ? 'bg-[#f4f1ea]'
    : 'bg-[#131416]';

  const itemHover = isLightMode ? 'hover:bg-black/[0.04]' : 'hover:bg-white/[0.05]';
  const activeItem = isLightMode
    ? 'bg-black/[0.06] text-[#1c1a17] font-semibold'
    : 'bg-white/[0.08] text-[#f5f2eb] font-semibold';
  const baseTextColor = isLightMode ? 'text-[#383531]' : 'text-[#c5c1ba]';
  const headerText = isLightMode ? 'text-[#1c1a17]' : 'text-[#f0ece4]';
  const mutedText = isLightMode ? 'text-[#706c64]' : 'text-neutral-400';
  const inactiveNoteText = isLightMode
    ? 'text-[#3c3935] hover:text-[#1c1a17]'
    : 'text-[#c5c1ba] hover:text-[#f5f2eb]';
  const folderText = isLightMode ? 'text-[#252320]' : 'text-[#dedad4]';

  return (
    <aside
      className={`w-64 h-full flex flex-col ${sidebarBg} border-r ${borderColor} select-none text-xs ${baseTextColor}`}
      onContextMenu={handleEmptySpaceContextMenu}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3.5 py-3 border-b ${borderColor}`}>
        <div className="flex items-center gap-2">
          <BookOpen className={`h-4 w-4 ${isLightMode ? 'text-[#504c45]' : 'text-neutral-300'}`} />
          <span className={`font-semibold tracking-tight text-sm ${headerText}`}>
            Vault Library
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onCreateNote(null)}
            className={`p-1.5 rounded-md ${itemHover} text-inherit transition`}
            title="New Document (Ctrl+N)"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowFolderModal(true)}
            className={`p-1.5 rounded-md ${itemHover} text-inherit transition`}
            title="New Folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Local Disk Vault Status */}
      <div className={`px-2.5 py-2 border-b ${borderColor} flex items-center justify-between text-[11px]`}>
        {vaultName ? (
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1.5 truncate text-emerald-400 font-medium" title={`Connected to local directory: ${vaultName}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">{vaultName}</span>
            </span>
            {onDisconnectVault && (
              <button
                type="button"
                onClick={onDisconnectVault}
                className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${itemHover} ${mutedText}`}
                title="Disconnect local disk folder"
              >
                Disconnect
              </button>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onPickVault}
            className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md border border-dashed ${borderColor} ${itemHover} ${headerText} transition-colors`}
            title="Open real folder from File Explorer (auto-saves real .md files)"
          >
            <FolderInput className="w-3.5 h-3.5 opacity-70 shrink-0" />
            <span className="font-medium truncate">Link Folder on Disk</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className={`p-2.5 border-b ${borderColor}`}>
        <div className="relative flex items-center">
          <Search className={`absolute left-2.5 h-3.5 w-3.5 ${mutedText}`} />
          <input
            type="text"
            placeholder="Search documents or #tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-zoho-ignore="true"
            data-lpignore="true"
            data-1p-ignore="true"
            data-bwignore="true"
            data-form-type="other"
            name="marrow-doc-search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className={`w-full rounded-md pl-8 pr-3 py-1.5 text-xs placeholder:text-neutral-400/70 focus:outline-none transition border ${
              isLightMode
                ? 'bg-black/[0.02] border-black/[0.07] text-[#2c2a27]'
                : 'bg-white/[0.02] border-white/[0.07] text-[#dedad4]'
            }`}
          />
        </div>
      </div>

      {/* Documents & Folders Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {folders.map((folder) => {
          const isCollapsed = collapsedFolders[folder.id];
          const folderNotes = sortNotes(filteredNotes.filter((n) => n.folderId === folder.id));

          return (
            <div key={folder.id} className="space-y-0.5">
              <div
                onClick={() => toggleFolder(folder.id)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setRenamingFolderId(folder.id);
                  setEditingFolderName(folder.name);
                }}
                onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverFolderId !== folder.id) {
                    setDragOverFolderId(folder.id);
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverFolderId(folder.id);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverFolderId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const noteId = e.dataTransfer.getData('text/plain') || draggedNoteId;
                  if (noteId && onMoveNote) {
                    onMoveNote(noteId, folder.id);
                    if (collapsedFolders[folder.id]) {
                      setCollapsedFolders((prev) => ({ ...prev, [folder.id]: false }));
                    }
                  }
                  setDragOverFolderId(null);
                  setDraggedNoteId(null);
                }}
                className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer group transition ${
                  dragOverFolderId === folder.id
                    ? isLightMode
                      ? 'bg-black/[0.08] ring-1 ring-inset ring-black/25'
                      : 'bg-white/[0.12] ring-1 ring-inset ring-white/30'
                    : itemHover
                }`}
                style={
                  dragOverFolderId === folder.id
                    ? {
                        backgroundColor: currentTheme.tokens.accentBg,
                        boxShadow: `inset 0 0 0 1.5px ${currentTheme.tokens.accentColor}`,
                      }
                    : undefined
                }
              >
                <div className="flex items-center gap-1.5 truncate flex-1 mr-2">
                  {isCollapsed ? (
                    <ChevronRight className={`h-3 w-3 shrink-0 ${mutedText} group-hover:text-inherit`} />
                  ) : (
                    <ChevronDown className={`h-3 w-3 shrink-0 ${mutedText} group-hover:text-inherit`} />
                  )}
                  <FolderIcon className={`h-3.5 w-3.5 shrink-0 ${isLightMode ? 'text-[#504c45]' : 'text-neutral-300'}`} />
                  {renamingFolderId === folder.id ? (
                    <input
                      type="text"
                      value={editingFolderName}
                      onChange={(e) => setEditingFolderName(e.target.value)}
                      onBlur={() => handleFinishRenameFolder(folder.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishRenameFolder(folder.id);
                        if (e.key === 'Escape') setRenamingFolderId(null);
                      }}
                      onFocus={(e) => e.currentTarget.select()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className={`w-full rounded px-1.5 py-0.5 text-xs outline-none border ${
                        isLightMode
                          ? 'bg-white border-black/20 text-[#2c2a27]'
                          : 'bg-black/40 border-white/20 text-[#dedad4]'
                      }`}
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenamingFolderId(folder.id);
                        setEditingFolderName(folder.name);
                      }}
                      className={`truncate font-medium ${folderText}`}
                      title="Double-click to rename"
                    >
                      {folder.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <span className={`text-[10px] font-medium ${mutedText} group-hover:hidden transition`}>
                    {folderNotes.length}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateNote(folder.id);
                      if (collapsedFolders[folder.id]) {
                        setCollapsedFolders((prev) => ({ ...prev, [folder.id]: false }));
                      }
                    }}
                    className={`p-1 rounded opacity-0 group-hover:opacity-100 ${
                      isLightMode ? 'hover:text-[#111] hover:bg-black/[0.06]' : 'hover:text-white hover:bg-white/[0.08]'
                    } transition`}
                    title="New note in this folder"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  {onDeleteFolder && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFolder(folder.id);
                      }}
                      className={`p-1 rounded opacity-0 group-hover:opacity-100 ${
                        isLightMode ? 'hover:text-[#111] hover:bg-black/[0.06]' : 'hover:text-white hover:bg-white/[0.08]'
                      } transition`}
                      title="Delete folder"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              </div>

              {!isCollapsed && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverFolderId !== folder.id) {
                      setDragOverFolderId(folder.id);
                    }
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDragOverFolderId(folder.id);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverFolderId(null);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const noteId = e.dataTransfer.getData('text/plain') || draggedNoteId;
                    if (noteId && onMoveNote) {
                      onMoveNote(noteId, folder.id);
                    }
                    setDragOverFolderId(null);
                    setDraggedNoteId(null);
                  }}
                  className={`pl-4 border-l ${borderColor} ml-2 space-y-0.5 rounded-r transition-colors ${
                    dragOverFolderId === folder.id ? 'bg-black/[0.03] dark:bg-white/[0.03]' : ''
                  }`}
                >
                  {folderNotes.length === 0 && (
                    <div
                      className={`py-1.5 px-2 text-[11px] italic transition ${
                        dragOverFolderId === folder.id ? 'opacity-80 font-medium' : 'opacity-40'
                      }`}
                    >
                      Empty folder — drop files here
                    </div>
                  )}
                  {folderNotes.map((note) => {
                    const isActive = note.id === activeNoteId;
                    const isDraggingThis = draggedNoteId === note.id;
                    return (
                      <div
                        key={note.id}
                        draggable={renamingNoteId !== note.id}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData('text/plain', note.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggedNoteId(note.id);
                        }}
                        onDragEnd={() => {
                          setDraggedNoteId(null);
                          setDragOverFolderId(null);
                          setIsDragOverRoot(false);
                        }}
                        onClick={() => renamingNoteId !== note.id && onSelectNote(note)}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenamingNoteId(note.id);
                          setEditingTitle(note.title || 'Untitled');
                        }}
                        onContextMenu={(e) => handleNoteContextMenu(e, note)}
                        className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition select-none ${
                          isActive ? activeItem : itemHover
                        } ${isDraggingThis ? 'opacity-40 scale-[0.98]' : ''}`}
                      >
                        <div className="truncate flex-1 mr-2">
                          {renamingNoteId === note.id ? (
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={() => handleFinishRenameNote(note.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleFinishRenameNote(note.id);
                                if (e.key === 'Escape') setRenamingNoteId(null);
                              }}
                              onFocus={(e) => e.currentTarget.select()}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className={`w-full rounded px-1.5 py-0.5 text-xs outline-none border ${
                                isLightMode
                                  ? 'bg-white border-black/20 text-[#2c2a27]'
                                  : 'bg-black/40 border-white/20 text-[#dedad4]'
                              }`}
                            />
                          ) : (
                            <span
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setRenamingNoteId(note.id);
                                setEditingTitle(note.title || 'Untitled');
                              }}
                              className={`truncate ${isActive ? 'font-semibold' : inactiveNoteText}`}
                              title="Double-click to rename"
                            >
                              {note.title || 'Untitled'}
                            </span>
                          )}
                          {note.targetWordCount && note.targetWordCount > 0 ? (
                            <span
                              className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-mono tracking-tighter shrink-0 border ${
                                note.wordCount >= note.targetWordCount
                                  ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10 font-semibold'
                                  : 'border-amber-500/25 text-amber-500/80 bg-amber-500/5'
                              }`}
                              title={`Target: ${note.wordCount}/${note.targetWordCount} words (${Math.min(100, Math.round((note.wordCount / note.targetWordCount) * 100))}%)`}
                            >
                              {Math.min(100, Math.round((note.wordCount / note.targetWordCount) * 100))}%
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Pin button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePin(note.id);
                            }}
                            className={`p-1.5 rounded-md transition-all ${
                              note.pinned
                                ? isLightMode
                                  ? 'text-black opacity-100 hover:opacity-75'
                                  : 'text-white opacity-100 hover:opacity-75'
                                : 'opacity-30 hover:opacity-100'
                            }`}
                            title={note.pinned ? 'Unpin note' : 'Pin note'}
                          >
                            <Pin
                              className="h-3.5 w-3.5 transition-transform active:scale-90"
                              fill={note.pinned ? 'currentColor' : 'none'}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteNote(note.id);
                            }}
                            className={`p-1.5 rounded-md opacity-0 group-hover:opacity-60 hover:!opacity-100 ${
                              isLightMode ? 'hover:text-[#111]' : 'hover:text-white'
                            } transition`}
                            title="Delete note"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Loose Root Notes */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (!isDragOverRoot) setIsDragOverRoot(true);
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setIsDragOverRoot(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsDragOverRoot(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            const noteId = e.dataTransfer.getData('text/plain') || draggedNoteId;
            if (noteId && onMoveNote) {
              onMoveNote(noteId, null);
            }
            setIsDragOverRoot(false);
            setDraggedNoteId(null);
          }}
          className={`pt-2 pb-6 rounded-lg transition-all ${
            isDragOverRoot
              ? isLightMode
                ? 'bg-black/[0.04] ring-1 ring-inset ring-black/20'
                : 'bg-white/[0.06] ring-1 ring-inset ring-white/20'
              : ''
          }`}
          style={
            isDragOverRoot
              ? {
                  backgroundColor: currentTheme.tokens.accentBg,
                  boxShadow: `inset 0 0 0 1.5px ${currentTheme.tokens.accentColor}`,
                }
              : undefined
          }
        >
          <div className={`text-[10px] uppercase tracking-wider font-medium px-2 pb-1 flex items-center justify-between ${mutedText}`}>
            <span>General</span>
            {isDragOverRoot && (
              <span className="text-[9px] font-normal" style={{ color: currentTheme.tokens.accentColor }}>
                Drop to move to General
              </span>
            )}
          </div>
          {sortNotes(filteredNotes.filter((n) => !n.folderId)).map((note) => {
            const isActive = note.id === activeNoteId;
            const isDraggingThis = draggedNoteId === note.id;
            return (
              <div
                key={note.id}
                draggable={renamingNoteId !== note.id}
                onDragStart={(e) => {
                  e.stopPropagation();
                  e.dataTransfer.setData('text/plain', note.id);
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggedNoteId(note.id);
                }}
                onDragEnd={() => {
                  setDraggedNoteId(null);
                  setDragOverFolderId(null);
                  setIsDragOverRoot(false);
                }}
                onClick={() => renamingNoteId !== note.id && onSelectNote(note)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setRenamingNoteId(note.id);
                  setEditingTitle(note.title || 'Untitled');
                }}
                onContextMenu={(e) => handleNoteContextMenu(e, note)}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition select-none ${
                  isActive ? activeItem : itemHover
                } ${isDraggingThis ? 'opacity-40 scale-[0.98]' : ''}`}
              >
                <div className="truncate flex-1 mr-2">
                  {renamingNoteId === note.id ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={() => handleFinishRenameNote(note.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishRenameNote(note.id);
                        if (e.key === 'Escape') setRenamingNoteId(null);
                      }}
                      onFocus={(e) => e.currentTarget.select()}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className={`w-full rounded px-1.5 py-0.5 text-xs outline-none border ${
                        isLightMode
                          ? 'bg-white border-black/20 text-[#2c2a27]'
                          : 'bg-black/40 border-white/20 text-[#dedad4]'
                      }`}
                    />
                  ) : (
                    <span
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setRenamingNoteId(note.id);
                        setEditingTitle(note.title || 'Untitled');
                      }}
                      className={`truncate ${isActive ? 'font-semibold' : inactiveNoteText}`}
                      title="Double-click to rename"
                    >
                      {note.title || 'Untitled'}
                    </span>
                  )}
                  {note.targetWordCount && note.targetWordCount > 0 ? (
                    <span
                      className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-mono tracking-tighter shrink-0 border ${
                        note.wordCount >= note.targetWordCount
                          ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/10 font-semibold'
                          : 'border-amber-500/25 text-amber-500/80 bg-amber-500/5'
                      }`}
                      title={`Target: ${note.wordCount}/${note.targetWordCount} words (${Math.min(100, Math.round((note.wordCount / note.targetWordCount) * 100))}%)`}
                    >
                      {Math.min(100, Math.round((note.wordCount / note.targetWordCount) * 100))}%
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Pin button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(note.id);
                    }}
                    className={`p-1.5 rounded-md transition-all ${
                      note.pinned
                        ? isLightMode
                          ? 'text-black opacity-100 hover:opacity-75'
                          : 'text-white opacity-100 hover:opacity-75'
                        : 'opacity-30 hover:opacity-100'
                    }`}
                    title={note.pinned ? 'Unpin note' : 'Pin note'}
                  >
                    <Pin
                      className="h-3.5 w-3.5 transition-transform active:scale-90"
                      fill={note.pinned ? 'currentColor' : 'none'}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteNote(note.id);
                    }}
                    className={`p-1.5 rounded-md opacity-0 group-hover:opacity-60 hover:!opacity-100 ${
                      isLightMode ? 'hover:text-[#111]' : 'hover:text-white'
                    } transition`}
                    title="Delete note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className={`border-t ${borderColor} px-3 py-2 flex items-center justify-between text-[11px]`}>
        <div className={`flex items-center gap-1.5 ${mutedText}`}>
          <BookOpen className="h-3.5 w-3.5" />
          <span>{notes.length} {notes.length === 1 ? 'document' : 'documents'}</span>
        </div>

        <button
          type="button"
          onClick={onOpenSettings}
          className={`p-1 rounded-md ${itemHover} transition ${mutedText} hover:text-inherit`}
          title="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* New Folder Modal */}
      {showFolderModal && (
        <div
          onClick={() => setShowFolderModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-xl border p-5 shadow-xl ${
              isLightMode ? 'bg-[#f7f5f0] border-[#e4e0d7]' : 'bg-[#18191c] border-white/[0.08]'
            }`}
          >
            <h3 className="text-sm font-medium mb-3">Create Folder</h3>
            <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Folder title (e.g. Act II, Lore)..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                className={`w-full rounded-md px-3 py-2 text-xs focus:outline-none border ${
                  isLightMode
                    ? 'bg-black/[0.02] border-black/[0.08] text-[#2c2a27]'
                    : 'bg-white/[0.02] border-white/[0.08] text-[#dedad4]'
                }`}
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className={`px-3 py-1.5 text-xs rounded-md ${itemHover}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs rounded-md font-semibold transition shadow-sm hover:opacity-90 active:scale-95"
                  style={{
                    backgroundColor: currentTheme.tokens.accentColor,
                    color: currentTheme.tokens.accentContrast,
                  }}
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
          isLightMode={isLightMode}
        />
      )}
    </aside>
  );
};

import React, { useState } from 'react';
import type { Note, Folder } from '../types';
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
  Tag,
  Settings,
  BookOpen,
  Pencil,
  FolderInput,
  Copy,
  Download,
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
  isLightMode: boolean;
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
  isLightMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Inline rename state
  const [renamingNoteId, setRenamingNoteId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

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

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || [])));

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag ? (n.tags || []).includes(selectedTag) : true;
    return matchesSearch && matchesTag;
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
    ];

    setContextMenu({ x: e.clientX, y: e.clientY, items });
  };

  const borderColor = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.08]';
  const sidebarBg = isLightMode ? 'bg-[#f4f1ea]' : 'bg-[#131416]';
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

      {/* Search Bar */}
      <div className={`p-2.5 border-b ${borderColor}`}>
        <div className="relative flex items-center">
          <Search className={`absolute left-2.5 h-3.5 w-3.5 ${mutedText}`} />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-md pl-8 pr-3 py-1.5 text-xs placeholder:text-neutral-400/70 focus:outline-none transition border ${
              isLightMode
                ? 'bg-black/[0.02] border-black/[0.07] text-[#2c2a27]'
                : 'bg-white/[0.02] border-white/[0.07] text-[#dedad4]'
            }`}
          />
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none mt-2 pt-0.5">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={`px-2 py-0.5 rounded-md text-[10px] transition shrink-0 ${
                selectedTag === null ? activeItem : `${itemHover} ${mutedText} hover:text-inherit`
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-0.5 rounded-md text-[10px] transition shrink-0 flex items-center gap-1 border ${
                  selectedTag === tag
                    ? activeItem
                    : isLightMode
                    ? 'border-black/[0.08] bg-black/[0.03] text-[#555] hover:text-[#1c1a17]'
                    : 'border-white/[0.08] bg-white/[0.04] text-neutral-300 hover:text-[#f0ece4]'
                }`}
              >
                <Tag className="h-2.5 w-2.5 opacity-60" />
                #{tag}
              </button>
            ))}
          </div>
        )}
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
                onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer group transition ${itemHover}`}
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
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className={`w-full rounded px-1.5 py-0.5 text-xs outline-none border ${
                        isLightMode
                          ? 'bg-white border-black/20 text-[#2c2a27]'
                          : 'bg-black/40 border-white/20 text-[#dedad4]'
                      }`}
                    />
                  ) : (
                    <span className={`truncate font-medium ${folderText}`}>{folder.name}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[10px] font-medium ${mutedText} group-hover:opacity-0 transition`}>{folderNotes.length}</span>
                  {onDeleteFolder && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteFolder(folder.id);
                      }}
                      className={`p-1 opacity-0 group-hover:opacity-100 ${
                        isLightMode ? 'hover:text-[#111]' : 'hover:text-white'
                      } transition`}
                      title="Delete folder"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              </div>

              {!isCollapsed && (
                <div className={`pl-4 border-l ${borderColor} ml-2 space-y-0.5`}>
                  {folderNotes.map((note) => {
                    const isActive = note.id === activeNoteId;
                    return (
                      <div
                        key={note.id}
                        onClick={() => renamingNoteId !== note.id && onSelectNote(note)}
                        onContextMenu={(e) => handleNoteContextMenu(e, note)}
                        className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition ${
                          isActive ? activeItem : itemHover
                        }`}
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
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className={`w-full rounded px-1.5 py-0.5 text-xs outline-none border ${
                                isLightMode
                                  ? 'bg-white border-black/20 text-[#2c2a27]'
                                  : 'bg-black/40 border-white/20 text-[#dedad4]'
                              }`}
                            />
                          ) : (
                            <span className={`truncate ${isActive ? 'font-semibold' : inactiveNoteText}`}>{note.title || 'Untitled'}</span>
                          )}
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
        <div className="pt-2">
          <div className={`text-[10px] uppercase tracking-wider font-medium px-2 pb-1 ${mutedText}`}>
            General
          </div>
          {sortNotes(filteredNotes.filter((n) => !n.folderId)).map((note) => {
            const isActive = note.id === activeNoteId;
            return (
              <div
                key={note.id}
                onClick={() => renamingNoteId !== note.id && onSelectNote(note)}
                onContextMenu={(e) => handleNoteContextMenu(e, note)}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                  isActive ? activeItem : itemHover
                }`}
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
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      className={`w-full rounded px-1.5 py-0.5 text-xs outline-none border ${
                        isLightMode
                          ? 'bg-white border-black/20 text-[#2c2a27]'
                          : 'bg-black/40 border-white/20 text-[#dedad4]'
                      }`}
                    />
                  ) : (
                    <span className={`truncate ${isActive ? 'font-semibold' : inactiveNoteText}`}>{note.title || 'Untitled'}</span>
                  )}
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
                  className={`px-3 py-1.5 text-xs rounded-md font-medium transition ${
                    isLightMode
                      ? 'bg-black text-white hover:bg-neutral-800'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
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

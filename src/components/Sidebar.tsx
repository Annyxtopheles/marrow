import React, { useState } from 'react';
import type { Note, Folder } from '../types';
import {
  Folder as FolderIcon,
  FolderPlus,
  FilePlus,
  Search,
  Pin,
  ChevronRight,
  ChevronDown,
  Trash2,
  Tag,
  Clock,
  Link2,
  Settings,
  BookOpen,
} from 'lucide-react';

interface SidebarProps {
  notes: Note[];
  folders: Folder[];
  activeNoteId: string | null;
  onSelectNote: (note: Note) => void;
  onCreateNote: (folderId?: string | null) => void;
  onCreateFolder: (name: string, parentId?: string | null) => void;
  onDeleteNote: (noteId: string) => void;
  onTogglePin: (noteId: string) => void;
  onOpenSettings: () => void;
  onToggleTimeJot: () => void;
  isTimeJotOpen: boolean;
  onToggleBacklinks: () => void;
  isBacklinksOpen: boolean;
  isLightMode: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  folders,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onCreateFolder,
  onDeleteNote,
  onTogglePin,
  onOpenSettings,
  onToggleTimeJot,
  isTimeJotOpen,
  onToggleBacklinks,
  isBacklinksOpen,
  isLightMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || [])));

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag ? (n.tags || []).includes(selectedTag) : true;
    return matchesSearch && matchesTag;
  });

  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setShowFolderModal(false);
  };

  const borderColor = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.06]';
  const sidebarBg = isLightMode ? 'bg-[#f4f1ea]' : 'bg-[#131416]';
  const itemHover = isLightMode ? 'hover:bg-black/[0.04]' : 'hover:bg-white/[0.04]';
  const activeItem = isLightMode
    ? 'bg-black/[0.06] text-[#1c1a17] font-medium'
    : 'bg-white/[0.06] text-[#dedad4] font-medium';
  const subtextColor = isLightMode ? 'text-[#847f78]' : 'text-[#85827e]';

  return (
    <aside
      className={`w-64 h-full flex flex-col ${sidebarBg} border-r ${borderColor} select-none text-xs ${subtextColor}`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-3.5 py-3 border-b ${borderColor}`}>
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 opacity-70" />
          <span className="font-serif font-medium tracking-tight text-sm text-inherit">
            Vault Library
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onCreateNote(null)}
            className={`p-1.5 rounded-md ${itemHover} text-inherit transition`}
            title="New Document (Ctrl+N)"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
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
          <Search className="absolute left-2.5 h-3.5 w-3.5 opacity-40" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-md pl-8 pr-3 py-1.5 text-xs placeholder-neutral-500/50 focus:outline-none transition border ${
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
              onClick={() => setSelectedTag(null)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition shrink-0 ${
                selectedTag === null ? activeItem : `${itemHover} opacity-70`
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition shrink-0 flex items-center gap-1 border ${
                  selectedTag === tag
                    ? activeItem
                    : isLightMode
                    ? 'border-black/[0.06] bg-black/[0.02] opacity-70'
                    : 'border-white/[0.06] bg-white/[0.02] opacity-70'
                }`}
              >
                <Tag className="h-2.5 w-2.5 opacity-50" />
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
          const folderNotes = filteredNotes.filter((n) => n.folderId === folder.id);

          return (
            <div key={folder.id} className="space-y-0.5">
              <div
                onClick={() => toggleFolder(folder.id)}
                className={`flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer group transition ${itemHover}`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3 opacity-40" />
                  ) : (
                    <ChevronDown className="h-3 w-3 opacity-40" />
                  )}
                  <FolderIcon className="h-3.5 w-3.5 opacity-60" />
                  <span className="truncate">{folder.name}</span>
                </div>
                <span className="text-[10px] font-mono opacity-50">{folderNotes.length}</span>
              </div>

              {!isCollapsed && (
                <div className={`pl-4 border-l ${borderColor} ml-2 space-y-0.5`}>
                  {folderNotes.map((note) => {
                    const isActive = note.id === activeNoteId;
                    return (
                      <div
                        key={note.id}
                        onClick={() => onSelectNote(note)}
                        className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition ${
                          isActive ? activeItem : itemHover
                        }`}
                      >
                        <span className="truncate">{note.title || 'Untitled'}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePin(note.id);
                            }}
                            className={`p-1 ${note.pinned ? 'text-amber-500 opacity-100' : 'opacity-50 hover:opacity-100'}`}
                            title="Pin note"
                          >
                            <Pin className="h-2.5 w-2.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteNote(note.id);
                            }}
                            className="p-1 opacity-50 hover:opacity-100 hover:text-rose-400"
                            title="Delete note"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
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
          <div className="text-[10px] font-mono uppercase tracking-wider opacity-40 px-2 pb-1">
            General
          </div>
          {filteredNotes
            .filter((n) => !n.folderId)
            .map((note) => {
              const isActive = note.id === activeNoteId;
              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition ${
                    isActive ? activeItem : itemHover
                  }`}
                >
                  <span className="truncate">{note.title || 'Untitled'}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(note.id);
                      }}
                      className={`p-1 ${note.pinned ? 'text-amber-500 opacity-100' : 'opacity-50 hover:opacity-100'}`}
                    >
                      <Pin className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNote(note.id);
                      }}
                      className="p-1 opacity-50 hover:opacity-100 hover:text-rose-400"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className={`border-t ${borderColor} p-2 flex items-center justify-between`}>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleTimeJot}
            className={`p-1.5 rounded-md transition flex items-center gap-1.5 ${
              isTimeJotOpen ? activeItem : itemHover
            }`}
            title="Toggle TimeJot"
          >
            <Clock className="h-3.5 w-3.5 opacity-70" />
            <span className="text-[11px] font-mono">TimeJot</span>
          </button>

          <button
            onClick={onToggleBacklinks}
            className={`p-1.5 rounded-md transition flex items-center gap-1.5 ${
              isBacklinksOpen ? activeItem : itemHover
            }`}
            title="Toggle Graph"
          >
            <Link2 className="h-3.5 w-3.5 opacity-70" />
            <span className="text-[11px] font-mono">Graph</span>
          </button>
        </div>

        <button
          onClick={onOpenSettings}
          className={`p-1.5 rounded-md ${itemHover} transition`}
          title="Settings"
        >
          <Settings className="h-4 w-4 opacity-70" />
        </button>
      </div>

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div
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
                  className="px-3.5 py-1.5 rounded-md bg-stone-700 hover:bg-stone-600 text-stone-100 font-medium text-xs transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

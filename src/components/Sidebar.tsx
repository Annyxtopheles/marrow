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

  return (
    <aside className="w-72 h-full flex flex-col bg-neutral-950 border-r border-neutral-900 select-none text-xs text-neutral-400">
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-neutral-900 bg-neutral-950">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-white" />
          <span className="font-semibold text-white tracking-wide text-sm font-serif">
            PureJot Vault
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onCreateNote(null)}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition"
            title="New Note (Ctrl+N)"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowFolderModal(true)}
            className="p-1.5 rounded hover:bg-neutral-800 text-neutral-300 hover:text-white transition"
            title="New Folder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="p-2.5 border-b border-neutral-900/80">
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search notes or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900/60 border border-neutral-800/80 rounded-md pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-700 transition"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none mt-2 pt-1">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition shrink-0 ${
                selectedTag === null ? 'bg-neutral-200 text-black font-semibold' : 'hover:bg-neutral-900 text-neutral-500'
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition shrink-0 flex items-center gap-1 ${
                  selectedTag === tag ? 'bg-white text-black font-semibold' : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400'
                }`}
              >
                <Tag className="h-2.5 w-2.5" />
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {folders.map((folder) => {
          const isCollapsed = collapsedFolders[folder.id];
          const folderNotes = filteredNotes.filter((n) => n.folderId === folder.id);

          return (
            <div key={folder.id} className="space-y-0.5">
              <div
                onClick={() => toggleFolder(folder.id)}
                className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-neutral-900/60 cursor-pointer text-neutral-300 group transition"
              >
                <div className="flex items-center gap-1.5 truncate font-medium">
                  {isCollapsed ? (
                    <ChevronRight className="h-3 w-3 text-neutral-500" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-neutral-500" />
                  )}
                  <FolderIcon className="h-3.5 w-3.5 text-neutral-400 group-hover:text-white transition" />
                  <span className="truncate">{folder.name}</span>
                </div>
                <span className="text-[10px] font-mono text-neutral-600 group-hover:text-neutral-400">
                  {folderNotes.length}
                </span>
              </div>

              {!isCollapsed && (
                <div className="pl-4 border-l border-neutral-900 ml-2 space-y-0.5">
                  {folderNotes.map((note) => {
                    const isActive = note.id === activeNoteId;
                    return (
                      <div
                        key={note.id}
                        onClick={() => onSelectNote(note)}
                        className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition ${
                          isActive
                            ? 'bg-neutral-900 text-white font-medium border-l-2 border-white'
                            : 'hover:bg-neutral-900/40 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        <span className="truncate">{note.title || 'Untitled'}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePin(note.id);
                            }}
                            className={`p-1 hover:text-white ${note.pinned ? 'text-amber-400 opacity-100' : 'text-neutral-500'}`}
                            title="Pin note"
                          >
                            <Pin className="h-2.5 w-2.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteNote(note.id);
                            }}
                            className="p-1 text-neutral-500 hover:text-rose-400"
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

        <div className="pt-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-600 px-2 pb-1">
            Root Notes
          </div>
          {filteredNotes
            .filter((n) => !n.folderId)
            .map((note) => {
              const isActive = note.id === activeNoteId;
              return (
                <div
                  key={note.id}
                  onClick={() => onSelectNote(note)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition ${
                    isActive
                      ? 'bg-neutral-900 text-white font-medium border-l-2 border-white'
                      : 'hover:bg-neutral-900/40 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span className="truncate">{note.title || 'Untitled'}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(note.id);
                      }}
                      className={`p-1 hover:text-white ${note.pinned ? 'text-amber-400 opacity-100' : 'text-neutral-500'}`}
                    >
                      <Pin className="h-2.5 w-2.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNote(note.id);
                      }}
                      className="p-1 text-neutral-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      <div className="border-t border-neutral-900 p-2 bg-neutral-950 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleTimeJot}
            className={`p-2 rounded transition flex items-center gap-1.5 ${
              isTimeJotOpen
                ? 'bg-neutral-800 text-white font-semibold'
                : 'hover:bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
            title="Toggle TimeJot Engine"
          >
            <Clock className="h-3.5 w-3.5" />
            <span className="text-[11px] font-mono">TimeJot</span>
          </button>

          <button
            onClick={onToggleBacklinks}
            className={`p-2 rounded transition flex items-center gap-1.5 ${
              isBacklinksOpen
                ? 'bg-neutral-800 text-white font-semibold'
                : 'hover:bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
            title="Toggle Obsidian Backlinks & Graph"
          >
            <Link2 className="h-3.5 w-3.5" />
            <span className="text-[11px] font-mono">Graph</span>
          </button>
        </div>

        <button
          onClick={onOpenSettings}
          className="p-2 rounded hover:bg-neutral-900 text-neutral-400 hover:text-white transition"
          title="App & Typography Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl">
            <h3 className="text-sm font-semibold text-white mb-3">Create New Folder</h3>
            <form onSubmit={handleCreateFolderSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Folder name (e.g. Act II, Worldbuilding)..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-white text-black font-semibold text-xs hover:bg-neutral-200"
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

import React, { useState } from 'react';
import type { Note, EditorSettings } from '../types';
import {
  X,
  ArrowLeftRight,
  ChevronDown,
  BookOpen,
  Edit3,
  Eye,
  FileText,
} from 'lucide-react';

interface ReferencePaneProps {
  note: Note;
  allNotes: Note[];
  onClose: () => void;
  onSwapWithMain: () => void;
  onSelectReferenceNote: (note: Note) => void;
  onUpdateNote: (note: Note) => void;
  isLightMode: boolean;
  theme?: string;
  settings: EditorSettings;
}

export const ReferencePane: React.FC<ReferencePaneProps> = ({
  note,
  allNotes,
  onClose,
  onSwapWithMain,
  onSelectReferenceNote,
  onUpdateNote,
  isLightMode,
  settings,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditable, setIsEditable] = useState(false);

  const containerBg = isLightMode ? 'bg-[#fcfbf9]' : 'bg-[#141517]';
  const headerBg = isLightMode ? 'bg-[#f5f2eb]/90' : 'bg-[#18191c]/90';
  const borderColor = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.08]';
  const textColor = isLightMode ? 'text-[#1c1a17]' : 'text-[#dedad4]';
  const mutedText = isLightMode ? 'text-[#706c64]' : 'text-neutral-400';
  const hoverBtn = isLightMode ? 'hover:bg-black/[0.05]' : 'hover:bg-white/[0.08]';

  const fontClass =
    settings.fontFamily === 'serif'
      ? 'font-serif'
      : settings.fontFamily === 'mono'
      ? 'font-mono'
      : settings.fontFamily === 'brutalist'
      ? 'font-brutalist'
      : 'font-sans';

  // Quick plain-text editor sync
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const words = newText.trim() ? newText.trim().split(/\s+/).length : 0;
    // Simple paragraph wrapping
    const html = newText
      .split(/\n\n+/)
      .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');

    onUpdateNote({
      ...note,
      content: html,
      wordCount: words,
      updatedAt: Date.now(),
    });
  };

  // Plain text extraction for editable mode
  const getPlainText = (html: string) => {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p><p[^>]*>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  };

  return (
    <div className={`h-full flex flex-col ${containerBg} border-l ${borderColor} select-text overflow-hidden`}>
      {/* Reference Pane Header */}
      <div className={`px-4 py-2.5 ${headerBg} border-b ${borderColor} flex items-center justify-between backdrop-blur-md shrink-0 z-10`}>
        <div className="flex items-center gap-2 min-w-0 relative">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/25 shrink-0">
            <BookOpen className="w-3 h-3" />
            <span>Ref Split</span>
          </div>

          {/* Quick Note Selector Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`flex items-center gap-1 font-semibold text-xs ${textColor} ${hoverBtn} px-2 py-1 rounded transition max-w-[180px] sm:max-w-[240px] truncate`}
              title="Switch reference document"
            >
              <span className="truncate">{note.title || 'Untitled Document'}</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-60" />
            </button>

            {isDropdownOpen && (
              <div
                className={`absolute left-0 mt-1 w-64 max-h-72 overflow-y-auto rounded-lg border shadow-xl p-1 z-50 text-xs backdrop-blur-xl ${
                  isLightMode
                    ? 'bg-white/98 border-black/10 text-[#1e1b4b] shadow-black/10'
                    : 'bg-[#1c1d21]/98 border-white/10 text-[#dedad4] shadow-black/40'
                }`}
              >
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider opacity-50 font-medium">
                  Vault Documents
                </div>
                {allNotes.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      onSelectReferenceNote(n);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left transition ${
                      n.id === note.id
                        ? isLightMode
                          ? 'bg-black/[0.08] font-semibold text-black'
                          : 'bg-white/[0.12] font-semibold text-white'
                        : hoverBtn
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 opacity-60 shrink-0" />
                    <span className="truncate">{n.title || 'Untitled'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsEditable(!isEditable)}
            className={`p-1.5 rounded-md ${hoverBtn} ${isEditable ? 'text-amber-500 font-bold' : mutedText} transition`}
            title={isEditable ? 'Switch to Formatted Reader' : 'Quick Edit Reference Note'}
          >
            {isEditable ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={onSwapWithMain}
            className={`p-1.5 rounded-md ${hoverBtn} ${mutedText} transition`}
            title="Swap with Primary Editor"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-md ${hoverBtn} ${mutedText} hover:text-red-400 transition`}
            title="Close Split Screen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Reference Pane Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {isEditable ? (
          <textarea
            value={getPlainText(note.content)}
            onChange={handleContentChange}
            placeholder="Type reference notes here..."
            className={`w-full h-full bg-transparent resize-none outline-none text-sm leading-relaxed ${fontClass} ${textColor}`}
          />
        ) : (
          <div className={`prose dark:prose-invert max-w-none ${fontClass} ${textColor}`}>
            <h1 className="text-xl font-bold mb-4 tracking-tight pb-2 border-b border-inherit/10">
              {note.title || 'Untitled Document'}
            </h1>
            <div
              className="text-sm leading-relaxed space-y-3"
              dangerouslySetInnerHTML={{ __html: note.content || '<p class="opacity-50 italic">Empty reference note</p>' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

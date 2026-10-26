import React from 'react';
import {
  Bold,
  Italic,
  Heading2,
  Quote,
  List,
  Clock,
  Undo2,
  Redo2,
  Link2,
  Crosshair,
  Maximize2,
  Minimize2,
  History,
} from 'lucide-react';
import { Editor } from '@tiptap/react';

interface AccessoryBarProps {
  editor: Editor | null;
  onOpenHistory: () => void;
  typewriterMode: boolean;
  onToggleTypewriter: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  onInsertTimestamp: () => void;
  saveStatus: 'saved' | 'saving';
}

export const AccessoryBar: React.FC<AccessoryBarProps> = ({
  editor,
  onOpenHistory,
  typewriterMode,
  onToggleTypewriter,
  focusMode,
  onToggleFocus,
  onInsertTimestamp,
  saveStatus,
}) => {
  if (!editor) return null;

  const insertPair = (open: string, close: string) => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, `${open}${selectedText}${close}`)
      .setTextSelection(from + open.length + selectedText.length)
      .run();
  };

  const insertWikilink = () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to) || 'Note Title';
    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, `[[${selectedText}]]`)
      .run();
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-neutral-800/60 bg-neutral-950/85 backdrop-blur-md px-3 py-1.5 text-xs text-neutral-400 select-none transition-all">
      {/* Quick punctuation & pairing (PureWriter style) */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
        <button
          type="button"
          onClick={() => insertPair('“', '”')}
          className="rounded px-2 py-1 font-serif text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
          title="Smart double quotes"
        >
          “”
        </button>
        <button
          type="button"
          onClick={() => insertPair('‘', '’')}
          className="rounded px-2 py-1 font-serif text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
          title="Smart single quotes"
        >
          ‘’
        </button>
        <button
          type="button"
          onClick={() => insertPair('(', ')')}
          className="rounded px-2 py-1 font-mono text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
          title="Parentheses"
        >
          ( )
        </button>
        <button
          type="button"
          onClick={() => insertPair('[', ']')}
          className="rounded px-2 py-1 font-mono text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
          title="Brackets"
        >
          [ ]
        </button>
        <button
          type="button"
          onClick={() => insertPair('《', '》')}
          className="rounded px-2 py-1 font-serif text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
          title="Book title brackets"
        >
          《》
        </button>
        <button
          type="button"
          onClick={() => insertPair('— ', ' ')}
          className="rounded px-2 py-1 font-serif text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
          title="Em dash"
        >
          —
        </button>

        <div className="mx-1 h-3.5 w-px bg-neutral-800" />

        {/* Formatting quick actions */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded p-1.5 hover:bg-neutral-800 transition ${
            editor.isActive('bold') ? 'bg-neutral-800 text-white' : 'text-neutral-400'
          }`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded p-1.5 hover:bg-neutral-800 transition ${
            editor.isActive('italic') ? 'bg-neutral-800 text-white' : 'text-neutral-400'
          }`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded p-1.5 hover:bg-neutral-800 transition ${
            editor.isActive('heading', { level: 2 }) ? 'bg-neutral-800 text-white' : 'text-neutral-400'
          }`}
          title="Heading"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`rounded p-1.5 hover:bg-neutral-800 transition ${
            editor.isActive('blockquote') ? 'bg-neutral-800 text-white' : 'text-neutral-400'
          }`}
          title="Blockquote"
        >
          <Quote className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded p-1.5 hover:bg-neutral-800 transition ${
            editor.isActive('bulletList') ? 'bg-neutral-800 text-white' : 'text-neutral-400'
          }`}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={insertWikilink}
          className="rounded p-1.5 hover:bg-neutral-800 text-neutral-300 transition"
          title="Obsidian Wikilink [[Note]]"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onInsertTimestamp}
          className="rounded p-1.5 hover:bg-neutral-800 text-neutral-300 transition"
          title="TimeJot Timestamp Stamp"
        >
          <Clock className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editor Controls & PureWriter Safety indicator */}
      <div className="flex items-center gap-1.5 pl-2 shrink-0">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="rounded p-1.5 hover:bg-neutral-800 disabled:opacity-30 transition"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="rounded p-1.5 hover:bg-neutral-800 disabled:opacity-30 transition"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <div className="mx-1 h-3.5 w-px bg-neutral-800" />

        {/* Typewriter mode toggle */}
        <button
          type="button"
          onClick={onToggleTypewriter}
          className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono transition ${
            typewriterMode
              ? 'bg-neutral-200 text-black font-semibold'
              : 'hover:bg-neutral-800 text-neutral-400'
          }`}
          title="Typewriter Mode (keep typing line in vertical center)"
        >
          <Crosshair className="h-3 w-3" />
          <span className="hidden sm:inline">Typewriter</span>
        </button>

        {/* History time machine scrubber */}
        <button
          type="button"
          onClick={onOpenHistory}
          className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-mono text-neutral-300 hover:bg-neutral-800 transition"
          title="PureWriter History Machine"
        >
          <History className="h-3 w-3" />
          <span className="hidden sm:inline">History</span>
        </button>

        {/* Focus / Distraction-free */}
        <button
          type="button"
          onClick={onToggleFocus}
          className="rounded p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
          title={focusMode ? 'Exit Zen Mode' : 'Zen Focus Mode (Hide UI)'}
        >
          {focusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>

        {/* Fail-safe live indicator */}
        <div
          className="flex items-center gap-1.5 pl-1.5"
          title="Keystroke Fail-Safe Engine: continuous local persistence"
        >
          <span
            className={`h-2 w-2 rounded-full transition-colors duration-300 ${
              saveStatus === 'saved' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 hidden md:inline">
            {saveStatus === 'saved' ? 'Saved' : 'Saving...'}
          </span>
        </div>
      </div>
    </div>
  );
};

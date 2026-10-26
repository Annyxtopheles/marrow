import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { Note, EditorSettings } from '../types';
import { AccessoryBar } from './AccessoryBar';
import { HistorySliderModal } from './HistorySliderModal';
import { Code } from 'lucide-react';

interface EditorProps {
  note: Note;
  settings: EditorSettings;
  onUpdateNote: (updated: Note) => void;
  onNavigateToTitle: (title: string) => void;
  saveStatus: 'saved' | 'saving';
  onToggleTypewriter: () => void;
  onToggleFocus: () => void;
  isLightMode: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  note,
  settings,
  onUpdateNote,
  onNavigateToTitle,
  saveStatus,
  onToggleTypewriter,
  onToggleFocus,
  isLightMode,
}) => {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [rawMarkdownMode, setRawMarkdownMode] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Begin your prose... Every stroke is protected.',
      }),
    ],
    content: note.content,
    editorProps: {
      attributes: {
        class: `prose max-w-none focus:outline-none min-h-[60vh] transition-all ${
          settings.breathingCursor ? 'breathing-cursor' : ''
        }`,
      },
      handleClick: (view, pos, event) => {
        const $pos = view.state.doc.resolve(pos);
        const parent = $pos.parent;
        if (!parent.isTextblock) return false;

        const text = parent.textContent;
        const offset = $pos.parentOffset;

        const regex = /\[\[(.*?)\]\]/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
          const start = match.index;
          const end = start + match[0].length;
          if (offset >= start && offset <= end) {
            event.preventDefault();
            onNavigateToTitle(match[1]);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;

      onUpdateNote({
        ...note,
        content: html,
        wordCount: words,
        characterCount: chars,
        updatedAt: Date.now(),
      });
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content, { emitUpdate: false });
    }
    setMarkdownContent(
      note.content
        .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n\n')
        .replace(/<em>(.*?)<\/em>/gi, '*$1*')
        .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<br\s*\/?>/gi, '\n')
    );
  }, [note.id]);

  // PureWriter Typewriter scrolling: center active line on selection change
  useEffect(() => {
    if (!editor || !settings.typewriterMode) return;

    const handleSelectionUpdate = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const container = editorContainerRef.current;

      if (container && rect.top > 0) {
        const targetY = rect.top - container.getBoundingClientRect().top - container.clientHeight / 2;
        container.scrollBy({ top: targetY, behavior: 'smooth' });
      }
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, settings.typewriterMode]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateNote({
      ...note,
      title: e.target.value,
      updatedAt: Date.now(),
    });
  };

  const handleInsertTimestamp = () => {
    if (!editor) return;
    const now = new Date();
    const stamp = ` [${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now
      .getDate()
      .toString()
      .padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}] `;
    editor.chain().focus().insertContent(stamp).run();
  };

  const handleRestoreSnapshot = (restoredContent: string, restoredTitle: string) => {
    if (editor) {
      editor.commands.setContent(restoredContent);
    }
    const text = restoredContent.replace(/<[^>]+>/g, ' ');
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    onUpdateNote({
      ...note,
      title: restoredTitle,
      content: restoredContent,
      wordCount: words,
      characterCount: text.length,
      updatedAt: Date.now(),
    });
  };

  const fontClass =
    settings.fontFamily === 'serif'
      ? 'font-serif'
      : settings.fontFamily === 'mono'
      ? 'font-mono'
      : 'font-sans';

  const subBarBorder = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.06]';
  const tagBg = isLightMode
    ? 'bg-black/[0.03] border-black/[0.06] text-neutral-600'
    : 'bg-white/[0.04] border-white/[0.06] text-neutral-400';
  const btnHover = isLightMode ? 'hover:bg-black/[0.05]' : 'hover:bg-white/[0.06]';

  return (
    <div className="flex-1 flex flex-col h-full bg-inherit relative overflow-hidden">
      {/* Top Details & Markdown Toggle Bar */}
      <div
        className={`flex items-center justify-between px-6 py-2 border-b ${subBarBorder} bg-inherit select-none text-xs`}
      >
        <div className="flex items-center gap-2 text-neutral-400 font-mono text-[11px]">
          <span className="opacity-75">Live Preview</span>
          {note.tags.length > 0 && (
            <div className="flex items-center gap-1.5 ml-2">
              {note.tags.map((t) => (
                <span
                  key={t}
                  className={`px-1.5 py-0.5 rounded-md border text-[10px] ${tagBg}`}
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setRawMarkdownMode(!rawMarkdownMode)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono transition text-neutral-400 ${btnHover} ${
            rawMarkdownMode
              ? isLightMode
                ? 'bg-black/[0.08] text-[#111]'
                : 'bg-white/[0.08] text-[#f2efe9]'
              : ''
          }`}
          title="Toggle Raw Markdown Split View"
        >
          <Code className="h-3 w-3" />
          <span>Markdown Source</span>
        </button>
      </div>

      {/* Editor Scroll Container */}
      <div
        ref={editorContainerRef}
        className={`flex-1 overflow-y-auto px-6 md:px-16 lg:px-24 py-10 transition-all ${
          settings.typewriterMode ? 'typewriter-mode' : ''
        }`}
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
        }}
      >
        <div className="max-w-[72ch] mx-auto space-y-7">
          {/* Note Title */}
          <input
            ref={titleInputRef}
            type="text"
            placeholder="Untitled Document..."
            value={note.title}
            onChange={handleTitleChange}
            className={`w-full bg-transparent font-medium tracking-tight placeholder-neutral-500/50 focus:outline-none transition-all ${
              settings.fontFamily === 'serif' ? 'font-serif text-3xl md:text-4xl' : 'font-sans text-2xl md:text-3xl'
            }`}
          />

          {rawMarkdownMode ? (
            <div
              className={`grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t ${subBarBorder} font-mono text-sm`}
            >
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-mono tracking-wider opacity-60">
                  Raw Markdown
                </div>
                <textarea
                  value={markdownContent}
                  onChange={(e) => {
                    setMarkdownContent(e.target.value);
                    const html = e.target.value
                      .split('\n\n')
                      .map((p) => `<p>${p}</p>`)
                      .join('');
                    if (editor) editor.commands.setContent(html);
                  }}
                  className={`w-full h-[60vh] rounded-lg p-4 text-xs font-mono resize-none focus:outline-none border ${
                    isLightMode
                      ? 'bg-black/[0.02] border-black/[0.08] text-[#2c2a27]'
                      : 'bg-white/[0.02] border-white/[0.08] text-[#dedad4]'
                  }`}
                />
              </div>
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-mono tracking-wider opacity-60">
                  Formatted
                </div>
                <div
                  className={`${fontClass} p-4 rounded-lg border h-[60vh] overflow-y-auto ${
                    isLightMode
                      ? 'bg-black/[0.01] border-black/[0.06]'
                      : 'bg-white/[0.02] border-white/[0.06]'
                  }`}
                >
                  <EditorContent editor={editor} />
                </div>
              </div>
            </div>
          ) : (
            <div className={fontClass}>
              <EditorContent editor={editor} />
            </div>
          )}
        </div>
      </div>

      {/* Accessory Bar */}
      <AccessoryBar
        editor={editor}
        onOpenHistory={() => setShowHistoryModal(true)}
        typewriterMode={settings.typewriterMode}
        onToggleTypewriter={onToggleTypewriter}
        focusMode={settings.focusMode}
        onToggleFocus={onToggleFocus}
        onInsertTimestamp={handleInsertTimestamp}
        saveStatus={saveStatus}
        isLightMode={isLightMode}
      />

      {/* History Time Machine Modal */}
      {showHistoryModal && (
        <HistorySliderModal
          noteId={note.id}
          noteTitle={note.title}
          onRestore={handleRestoreSnapshot}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </div>
  );
};

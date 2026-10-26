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
}

export const Editor: React.FC<EditorProps> = ({
  note,
  settings,
  onUpdateNote,
  onNavigateToTitle,
  saveStatus,
  onToggleTypewriter,
  onToggleFocus,
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
        placeholder: 'Begin your prose... Every keystroke is protected.',
      }),
    ],
    content: note.content,
    editorProps: {
      attributes: {
        class: `prose prose-invert max-w-none focus:outline-none min-h-[60vh] text-neutral-200 transition-all ${
          settings.breathingCursor ? 'breathing-cursor' : ''
        }`,
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

  // Keep editor content in sync when active note changes
  useEffect(() => {
    if (editor && editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content, { emitUpdate: false });
    }
    // Also sync raw markdown preview
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

  // Obsidian-style click interceptor for [[Wikilinks]]
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const text = target.textContent || '';
    const match = text.match(/\[\[(.*?)\]\]/);
    if (match && match[1]) {
      onNavigateToTitle(match[1]);
    }
  };

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

  return (
    <div className="flex-1 flex flex-col h-full bg-inherit relative overflow-hidden">
      {/* Top Bar for Note Details & Mode Toggle */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-neutral-900/60 bg-inherit select-none text-xs">
        <div className="flex items-center gap-2 text-neutral-500 font-mono text-[11px]">
          <span>Obsidian Live Preview</span>
          {note.tags.length > 0 && (
            <div className="flex items-center gap-1.5 ml-2">
              {note.tags.map((t) => (
                <span
                  key={t}
                  className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRawMarkdownMode(!rawMarkdownMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono transition ${
              rawMarkdownMode
                ? 'bg-neutral-800 text-white font-semibold'
                : 'hover:bg-neutral-900 text-neutral-400 hover:text-neutral-200'
            }`}
            title="Toggle Raw Markdown Split View"
          >
            <Code className="h-3 w-3" />
            <span>Markdown View</span>
          </button>
        </div>
      </div>

      {/* Editor Scroll Container */}
      <div
        ref={editorContainerRef}
        onClick={handleEditorClick}
        className={`flex-1 overflow-y-auto px-6 md:px-16 lg:px-24 py-8 transition-all ${
          settings.typewriterMode ? 'typewriter-mode' : ''
        }`}
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
        }}
      >
        <div className="max-w-3xl mx-auto space-y-6">
          <input
            ref={titleInputRef}
            type="text"
            placeholder="Untitled Note..."
            value={note.title}
            onChange={handleTitleChange}
            className={`w-full bg-transparent font-bold tracking-tight text-white placeholder-neutral-700 focus:outline-none transition-all ${
              settings.fontFamily === 'serif' ? 'font-serif text-3xl md:text-4xl' : 'font-sans text-2xl md:text-3xl'
            }`}
          />

          {rawMarkdownMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-900 font-mono text-sm">
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-mono text-neutral-500">
                  Raw Markdown Source
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
                  className="w-full h-[60vh] bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-xs font-mono text-neutral-300 resize-none focus:outline-none focus:border-neutral-700"
                />
              </div>
              <div className="space-y-2">
                <div className="text-[10px] uppercase font-mono text-neutral-500">
                  Live Formatted Output
                </div>
                <div className={`${fontClass} p-4 bg-neutral-950/40 rounded-lg border border-neutral-900 h-[60vh] overflow-y-auto`}>
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

      {/* PureWriter Signature Accessory Bar */}
      <AccessoryBar
        editor={editor}
        onOpenHistory={() => setShowHistoryModal(true)}
        typewriterMode={settings.typewriterMode}
        onToggleTypewriter={onToggleTypewriter}
        focusMode={settings.focusMode}
        onToggleFocus={onToggleFocus}
        onInsertTimestamp={handleInsertTimestamp}
        saveStatus={saveStatus}
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

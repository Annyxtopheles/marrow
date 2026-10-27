import React, { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { Note, EditorSettings } from '../types';
import { AccessoryBar } from './AccessoryBar';
import { HistorySliderModal } from './HistorySliderModal';
import { Code, Eye, Download } from 'lucide-react';

const htmlToMarkdown = (html: string): string => {
  return html
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
};

const formatInline = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
};

const markdownToHtml = (markdown: string): string => {
  const blocks = markdown.split(/\n\s*\n/);
  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('### ')) {
        return `<h3>${formatInline(trimmed.slice(4))}</h3>`;
      }
      if (trimmed.startsWith('## ')) {
        return `<h2>${formatInline(trimmed.slice(3))}</h2>`;
      }
      if (trimmed.startsWith('# ')) {
        return `<h1>${formatInline(trimmed.slice(2))}</h1>`;
      }
      if (trimmed.startsWith('> ')) {
        return `<blockquote><p>${formatInline(trimmed.slice(2))}</p></blockquote>`;
      }
      return `<p>${formatInline(trimmed.replace(/\n/g, '<br>'))}</p>`;
    })
    .join('');
};

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
        // Require Ctrl (Windows/Linux) or Cmd (Mac) to follow wikilinks like in Obsidian.
        // Normal clicks in the editor are strictly for placing the cursor, selecting, and typing.
        if (!event.ctrlKey && !event.metaKey) return false;

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

  const [prevNoteId, setPrevNoteId] = useState(note.id);
  if (prevNoteId !== note.id) {
    setPrevNoteId(note.id);
    if (rawMarkdownMode) {
      setMarkdownContent(htmlToMarkdown(note.content));
    }
  }

  useEffect(() => {
    if (editor && editor.getHTML() !== note.content) {
      editor.commands.setContent(note.content, { emitUpdate: false });
    }
  }, [editor, note.content, note.id]);

  const toggleMarkdownMode = () => {
    if (!rawMarkdownMode && editor) {
      setMarkdownContent(htmlToMarkdown(editor.getHTML()));
      setRawMarkdownMode(true);
    } else {
      if (editor) {
        editor.commands.setContent(markdownToHtml(markdownContent));
      }
      setRawMarkdownMode(false);
    }
  };

  const handleMarkdownChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setMarkdownContent(val);
    const html = markdownToHtml(val);
    if (editor) {
      editor.commands.setContent(html);
    }
  };

  const handleDownloadMarkdown = () => {
    const md = rawMarkdownMode
      ? markdownContent
      : htmlToMarkdown(editor ? editor.getHTML() : note.content);
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

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editor || rawMarkdownMode) return;

    const target = e.target as HTMLElement;

    // Do nothing if clicking on inputs, textareas, or buttons
    if (target === titleInputRef.current || target.closest('input, button, textarea')) {
      return;
    }

    // If clicking directly on a text block, let ProseMirror place the cursor naturally
    if (target.closest('p, h1, h2, h3, blockquote, ul, ol, li')) {
      return;
    }

    // Clicking anywhere in the blank space beneath or around the text focuses at the end of the note
    editor.commands.focus('end');
  };

  const fontClass =
    settings.fontFamily === 'serif'
      ? 'font-serif'
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
        <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
          <span className="opacity-75">{rawMarkdownMode ? 'Markdown Source' : 'Live Preview'}</span>
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

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition text-neutral-400 ${btnHover}`}
            title="Download note as a Markdown (.md) file"
          >
            <Download className="h-3 w-3" />
            <span>Download .md</span>
          </button>

          <button
            type="button"
            onClick={toggleMarkdownMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition ${
              rawMarkdownMode
                ? isLightMode
                  ? 'bg-black/[0.08] text-[#111] font-medium'
                  : 'bg-white/[0.08] text-[#f2efe9] font-medium'
                : `text-neutral-400 ${btnHover}`
            }`}
            title={rawMarkdownMode ? 'Switch to Formatted Live Preview' : 'Switch to Raw Markdown Source'}
          >
            {rawMarkdownMode ? <Eye className="h-3 w-3" /> : <Code className="h-3 w-3" />}
            <span>{rawMarkdownMode ? 'Live Preview' : 'Markdown Source'}</span>
          </button>
        </div>
      </div>

      {/* Editor Scroll Container */}
      <div
        ref={editorContainerRef}
        onClick={handleContainerClick}
        className={`flex-1 overflow-y-auto px-6 md:px-16 lg:px-24 py-10 transition-all cursor-text ${
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
            <div className="space-y-2 pt-2">
              <textarea
                value={markdownContent}
                onChange={handleMarkdownChange}
                placeholder="Type markdown directly (# Header, **bold**, *italic*, > quote)..."
                className={`w-full min-h-[60vh] rounded-lg p-5 text-sm font-sans leading-relaxed resize-y focus:outline-none border transition-colors ${
                  isLightMode
                    ? 'bg-black/[0.02] border-black/[0.08] text-[#2c2a27] focus:border-black/20'
                    : 'bg-white/[0.02] border-white/[0.08] text-[#dedad4] focus:border-white/20'
                }`}
              />
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

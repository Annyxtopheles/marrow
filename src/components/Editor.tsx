import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import type { Note, EditorSettings } from '../types';
import { AccessoryBar } from './AccessoryBar';
import { HistorySliderModal } from './HistorySliderModal';
import { analyzeProseCadence } from '../services/cadence';
import { THEMES } from '../services/themes';
import {
  Code,
  Eye,
  Download,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  Link2,
  Tag,
  X,
  Mic,
  Volume2,
  Clock,
  Crosshair,
  History,
  Activity,
  Sparkles,
} from 'lucide-react';
import { DictationService, ReadAloudService, isSpeechRecognitionSupported, isSpeechSynthesisSupported } from '../services/speech';

const htmlToMarkdown = (html: string): string => {
  const inlineToMd = (str: string): string =>
    str
      .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
      .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
      .replace(/<em>([\s\S]*?)<\/em>/gi, '*$1*')
      .replace(/<i>([\s\S]*?)<\/i>/gi, '*$1*')
      .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"');

  return html
    .replace(/<hr\s*\/?>/gi, '---\n\n')
    .replace(/<h1>([\s\S]*?)<\/h1>/gi, (_, inner) => `# ${inlineToMd(inner).trim()}\n\n`)
    .replace(/<h2>([\s\S]*?)<\/h2>/gi, (_, inner) => `## ${inlineToMd(inner).trim()}\n\n`)
    .replace(/<h3>([\s\S]*?)<\/h3>/gi, (_, inner) => `### ${inlineToMd(inner).trim()}\n\n`)
    .replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, (_, inner: string) => {
      const paragraphs = inner
        .replace(/<p>([\s\S]*?)<\/p>/gi, '$1\n')
        .trim()
        .split('\n')
        .map((line) => `> ${inlineToMd(line).trim()}`)
        .join('\n');
      return `${paragraphs}\n\n`;
    })
    .replace(/<ol>([\s\S]*?)<\/ol>/gi, (_, inner: string) => {
      let idx = 1;
      const items = inner.replace(/<li>([\s\S]*?)<\/li>/gi, (__, item: string) => {
        const cleanItem = inlineToMd(item.replace(/<\/?p>/gi, '').trim());
        return `${idx++}. ${cleanItem}\n`;
      });
      return `${items.trim()}\n\n`;
    })
    .replace(/<ul>([\s\S]*?)<\/ul>/gi, (_, inner: string) => {
      const items = inner.replace(/<li>([\s\S]*?)<\/li>/gi, (__, item: string) => {
        const cleanItem = inlineToMd(item.replace(/<\/?p>/gi, '').trim());
        return `- ${cleanItem}\n`;
      });
      return `${items.trim()}\n\n`;
    })
    .replace(/<p>([\s\S]*?)<\/p>/gi, (_, inner) => `${inlineToMd(inner)}\n\n`)
    .replace(/\n{3,}/g, '\n\n')
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
      if (/^[-*_]{3,}$/.test(trimmed)) {
        return '<hr>';
      }
      if (trimmed.startsWith('### ')) {
        return `<h3>${formatInline(trimmed.slice(4))}</h3>`;
      }
      if (trimmed.startsWith('## ')) {
        return `<h2>${formatInline(trimmed.slice(3))}</h2>`;
      }
      if (trimmed.startsWith('# ')) {
        return `<h1>${formatInline(trimmed.slice(2))}</h1>`;
      }
      const lines = trimmed.split('\n');
      if (lines.every((l) => l.trim().startsWith('>'))) {
        const quoteParagraphs = lines
          .map((l) => `<p>${formatInline(l.trim().replace(/^>\s?/, ''))}</p>`)
          .join('');
        return `<blockquote>${quoteParagraphs}</blockquote>`;
      }
      if (lines.every((l) => /^[-*•]\s+/.test(l.trim()))) {
        const listItems = lines
          .map((l) => `<li><p>${formatInline(l.trim().replace(/^[-*•]\s+/, ''))}</p></li>`)
          .join('');
        return `<ul>${listItems}</ul>`;
      }
      if (lines.every((l) => /^\d+[.)]\s+/.test(l.trim()))) {
        const listItems = lines
          .map((l) => `<li><p>${formatInline(l.trim().replace(/^\d+[.)]\s+/, ''))}</p></li>`)
          .join('');
        return `<ol>${listItems}</ol>`;
      }
      return `<p>${formatInline(trimmed.replace(/\n/g, '<br>'))}</p>`;
    })
    .join('');
};

interface EditorProps {
  note: Note;
  settings: EditorSettings;
  onUpdateNote: (updated: Note) => void;
  onUpdateSettings?: (newSettings: EditorSettings) => void;
  dailyWordsWritten?: number;
  onResetDailyWords?: () => void;
  onUpdateTags?: (noteId: string, newTags: string[]) => void;
  onNavigateToTitle: (title: string) => void;
  saveStatus: 'saved' | 'saving';
  onToggleTypewriter: () => void;
  onToggleFocus: () => void;
  onAskLumen?: (selectedText: string) => void;
  isLightMode: boolean;
}

export const Editor: React.FC<EditorProps> = ({
  note,
  settings,
  onUpdateNote,
  onUpdateSettings,
  dailyWordsWritten = 0,
  onResetDailyWords,
  onUpdateTags,
  onNavigateToTitle,
  saveStatus,
  onToggleTypewriter,
  onToggleFocus,
  onAskLumen,
  isLightMode,
}) => {
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showCadenceLens, setShowCadenceLens] = useState(false);
  const [selectionToolbar, setSelectionToolbar] = useState<{
    top: number;
    left: number;
    text: string;
  } | null>(null);
  const [rawMarkdownMode, setRawMarkdownMode] = useState(false);
  const [markdownContent, setMarkdownContent] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const dictationRef = useRef<DictationService | null>(null);
  const titleHeadingRef = useRef<HTMLHeadingElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMouseMoveRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleUserTyping = useCallback(() => {
    if (!(settings.activeTypingFade ?? true)) return;
    setIsTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1400);
  }, [settings.activeTypingFade]);

  const handleEditorMouseMove = (e: React.MouseEvent) => {
    if (
      Math.abs(e.clientX - lastMouseMoveRef.current.x) > 6 ||
      Math.abs(e.clientY - lastMouseMoveRef.current.y) > 6
    ) {
      lastMouseMoveRef.current = { x: e.clientX, y: e.clientY };
      if (isTyping) {
        setIsTyping(false);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    }
  };

  useEffect(() => {
    return () => {
      dictationRef.current?.stop();
      ReadAloudService.stop();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const toggleDictation = () => {
    if (isListening) {
      dictationRef.current?.stop();
      setIsListening(false);
    } else {
      if (!isSpeechRecognitionSupported()) {
        alert('Speech recognition is not supported in this browser. Try Chrome, Edge, or Safari.');
        return;
      }
      dictationRef.current = new DictationService({
        onResult: (transcript, isFinal) => {
          if (isFinal && editor) {
            editor.chain().focus().insertContent(`${transcript} `).run();
          }
        },
        onError: (err) => {
          console.error('Dictation error:', err);
          setIsListening(false);
        },
        onEnd: () => {
          setIsListening(false);
        },
      });
      dictationRef.current.start();
      setIsListening(true);
    }
  };

  const toggleReadAloud = () => {
    if (isSpeaking) {
      ReadAloudService.stop();
      setIsSpeaking(false);
    } else {
      if (!isSpeechSynthesisSupported()) {
        alert('Text-to-speech is not supported in this browser.');
        return;
      }
      const selected = editor
        ? editor.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to,
            ' '
          )
        : '';
      const textToSpeak = selected.trim()
        ? selected
        : (editor ? editor.getText() : note.content.replace(/<[^>]+>/g, ' '));
      if (!textToSpeak.trim()) return;

      setIsSpeaking(true);
      ReadAloudService.speak(
        textToSpeak,
        undefined,
        () => setIsSpeaking(false)
      );
    }
  };

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
        // Require Ctrl (Windows/Linux) or Cmd (Mac) to follow wikilinks.
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
      handleUserTyping();
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
    handleUserTyping();
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

  const insertPair = (open: string, close: string) => {
    if (!editor) return;
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
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to) || 'Note Title';
    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, `[[${selectedText}]]`)
      .run();
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

  // Whisper-quiet inline selection bar tracking
  useEffect(() => {
    if (!editor || rawMarkdownMode) {
      return;
    }

    const updateSelectionBar = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || to - from < 2) {
        setSelectionToolbar(null);
        return;
      }
      const selectedText = editor.state.doc.textBetween(from, to, ' ').trim();
      if (!selectedText) {
        setSelectionToolbar(null);
        return;
      }

      const domSelection = window.getSelection();
      if (!domSelection || domSelection.rangeCount === 0) {
        setSelectionToolbar(null);
        return;
      }

      const range = domSelection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setSelectionToolbar(null);
        return;
      }

      const clampedLeft = Math.max(140, Math.min(window.innerWidth - 140, rect.left + rect.width / 2));
      const clampedTop = Math.max(52, rect.top - 10);

      setSelectionToolbar({
        top: clampedTop,
        left: clampedLeft,
        text: selectedText,
      });
    };

    const handleScroll = () => setSelectionToolbar(null);
    const containerEl = editorContainerRef.current;

    editor.on('selectionUpdate', updateSelectionBar);
    containerEl?.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      editor.off('selectionUpdate', updateSelectionBar);
      containerEl?.removeEventListener('scroll', handleScroll);
    };
  }, [editor, rawMarkdownMode]);

  const currentTheme = THEMES[settings.theme] || THEMES.charcoal;
  const cadenceMetrics = useMemo(
    () => (showCadenceLens ? analyzeProseCadence(note.content) : null),
    [showCadenceLens, note.content]
  );

  useEffect(() => {
    if (titleHeadingRef.current && titleHeadingRef.current.innerText !== (note.title || '')) {
      titleHeadingRef.current.innerText = note.title || '';
    }
  }, [note.id, note.title]);

  const handleTitleInput = (e: React.FormEvent<HTMLHeadingElement>) => {
    handleUserTyping();
    const rawText = e.currentTarget.innerText || '';
    const cleanTitle = rawText.replace(/\r?\n/g, ' ');
    onUpdateNote({
      ...note,
      title: cleanTitle,
      updatedAt: Date.now(),
    });
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLHeadingElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      editor?.commands.focus('start');
    }
  };

  const handleTitlePaste = (e: React.ClipboardEvent<HTMLHeadingElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain').replace(/\r?\n/g, ' ');
    document.execCommand('insertText', false, text);
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
    if (titleHeadingRef.current) {
      titleHeadingRef.current.innerText = restoredTitle;
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

    // Do nothing if clicking on inputs, textareas, buttons, or the title heading
    if (target === titleHeadingRef.current || target.closest('input, button, textarea, h1')) {
      return;
    }

    // If clicking directly on a text block, let ProseMirror place the cursor naturally
    if (target.closest('p, h1, h2, h3, blockquote, ul, ol, li')) {
      return;
    }

    // Clicking anywhere in the blank space beneath or around the text focuses at the end of the note
    editor.commands.focus('end');
  };

  const handleAddTagSubmit = () => {
    const clean = newTagInput.trim().toLowerCase().replace(/^#/, '');
    if (clean && !note.tags.includes(clean)) {
      const nextTags = [...note.tags, clean];
      if (onUpdateTags) {
        onUpdateTags(note.id, nextTags);
      } else {
        onUpdateNote({
          ...note,
          tags: nextTags,
          updatedAt: Date.now(),
        });
      }
    }
    setNewTagInput('');
    setIsAddingTag(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = note.tags.filter((t) => t !== tagToRemove);
    if (onUpdateTags) {
      onUpdateTags(note.id, nextTags);
    } else {
      onUpdateNote({
        ...note,
        tags: nextTags,
        updatedAt: Date.now(),
      });
    }
  };

  const fontClass =
    settings.fontFamily === 'serif'
      ? 'font-serif'
      : settings.fontFamily === 'mono'
      ? 'font-mono'
      : settings.fontFamily === 'brutalist'
      ? 'font-brutalist'
      : 'font-sans';

  const shouldFadeChrome = isTyping && (settings.activeTypingFade ?? true);

  const subBarBorder = isLightMode
    ? settings.theme === 'sakura'
      ? 'border-[#e5e7eb]'
      : settings.theme === 'sepia'
      ? 'border-[#e7ddce]'
      : settings.theme === 'dreamscape'
      ? 'border-black/[0.06]'
      : 'border-[#e4e0d7]'
    : settings.theme === 'nordic'
    ? 'border-sky-500/15'
    : settings.theme === 'evergreen'
    ? 'border-emerald-500/15'
    : settings.theme === 'grunge'
    ? 'border-white/[0.12]'
    : 'border-white/[0.06]';
  const btnHover = isLightMode ? 'hover:bg-black/[0.05] hover:text-[#111]' : 'hover:bg-white/[0.06] hover:text-[#fff]';
  const activeBtn = isLightMode ? 'bg-black/[0.08] text-[#111]' : 'bg-white/[0.08] text-[#f2efe9]';
  const divider = isLightMode
    ? settings.theme === 'sakura'
      ? 'bg-[#e5e7eb]'
      : settings.theme === 'sepia'
      ? 'bg-[#e7ddce]'
      : settings.theme === 'dreamscape'
      ? 'bg-black/[0.08]'
      : 'bg-[#e4e0d7]'
    : settings.theme === 'nordic'
    ? 'bg-sky-500/20'
    : settings.theme === 'evergreen'
    ? 'bg-emerald-500/20'
    : settings.theme === 'grunge'
    ? 'bg-white/[0.12]'
    : 'bg-white/[0.07]';

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent relative overflow-hidden">
      {/* Top Formatting & View Mode Sub-Bar */}
      <div
        className={`flex items-center justify-between px-4 md:px-6 py-1.5 border-b ${subBarBorder} ${
          settings.theme === 'dreamscape' ? 'bg-white/40 backdrop-blur-xl' : 'bg-inherit'
        } select-none text-xs transition-all duration-300 ease-in-out ${
          shouldFadeChrome
            ? 'opacity-0 pointer-events-none -translate-y-1.5'
            : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Left Side: Formatting Toolbar in Live Preview, or Clean Label in Raw Mode */}
        {!rawMarkdownMode ? (
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5 text-neutral-400">
            {/* Quick Punctuation */}
            <button
              type="button"
              onClick={() => insertPair('“', '”')}
              className={`rounded-md px-1.5 py-0.5 text-xs transition ${btnHover}`}
              title="Smart double quotes"
            >
              “”
            </button>
            <button
              type="button"
              onClick={() => insertPair('‘', '’')}
              className={`rounded-md px-1.5 py-0.5 text-xs transition ${btnHover}`}
              title="Smart single quotes"
            >
              ‘’
            </button>
            <button
              type="button"
              onClick={() => insertPair('— ', ' ')}
              className={`rounded-md px-1.5 py-0.5 text-xs transition ${btnHover}`}
              title="Em dash"
            >
              —
            </button>
            <button
              type="button"
              onClick={() => insertPair('(', ')')}
              className={`rounded-md px-1.5 py-0.5 text-[11px] transition ${btnHover}`}
              title="Parentheses"
            >
              ( )
            </button>
            <button
              type="button"
              onClick={() => insertPair('[', ']')}
              className={`rounded-md px-1.5 py-0.5 text-[11px] transition ${btnHover}`}
              title="Brackets"
            >
              [ ]
            </button>

            <div className={`mx-1.5 h-3.5 w-px ${divider}`} />

            {/* Headings */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`rounded-md p-1.5 transition ${
                editor?.isActive('heading', { level: 1 }) ? activeBtn : btnHover
              }`}
              title="Heading 1"
            >
              <Heading1 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`rounded-md p-1.5 transition ${
                editor?.isActive('heading', { level: 2 }) ? activeBtn : btnHover
              }`}
              title="Heading 2"
            >
              <Heading2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`rounded-md p-1.5 transition ${
                editor?.isActive('heading', { level: 3 }) ? activeBtn : btnHover
              }`}
              title="Heading 3"
            >
              <Heading3 className="h-3.5 w-3.5" />
            </button>

            <div className={`mx-1.5 h-3.5 w-px ${divider}`} />

            {/* Basic Styling */}
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`rounded-md p-1.5 transition ${editor?.isActive('bold') ? activeBtn : btnHover}`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`rounded-md p-1.5 transition ${editor?.isActive('italic') ? activeBtn : btnHover}`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              className={`rounded-md p-1.5 transition ${
                editor?.isActive('blockquote') ? activeBtn : btnHover
              }`}
              title="Blockquote"
            >
              <Quote className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`rounded-md p-1.5 transition ${
                editor?.isActive('bulletList') ? activeBtn : btnHover
              }`}
              title="Bullet List"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={insertWikilink}
              className={`rounded-md p-1.5 transition ${btnHover}`}
              title="Wikilink [[Note]]"
            >
              <Link2 className="h-3.5 w-3.5" />
            </button>

            <div className={`mx-1.5 h-3.5 w-px ${divider}`} />

            {/* Writing Action Tools */}
            <button
              type="button"
              onClick={toggleDictation}
              className={`rounded-md p-1.5 transition ${
                isListening
                  ? isLightMode
                    ? 'bg-[#151618] text-[#f4f1ea] shadow-sm'
                    : 'bg-[#f4f1ea] text-[#151618] shadow-sm'
                  : btnHover
              }`}
              title={isListening ? 'Stop Voice Dictation' : 'Dictate (Voice-to-Text)'}
            >
              <Mic className={`h-3.5 w-3.5 ${isListening ? 'animate-pulse' : ''}`} />
            </button>

            <button
              type="button"
              onClick={toggleReadAloud}
              className={`rounded-md p-1.5 transition ${
                isSpeaking
                  ? isLightMode
                    ? 'bg-[#151618] text-[#f4f1ea] shadow-sm'
                    : 'bg-[#f4f1ea] text-[#151618] shadow-sm'
                  : btnHover
              }`}
              title={isSpeaking ? 'Stop Reading' : 'Listen / Read Aloud (Text-to-Speech)'}
            >
              <Volume2 className={`h-3.5 w-3.5 ${isSpeaking ? 'animate-pulse' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleInsertTimestamp}
              className={`rounded-md p-1.5 transition ${btnHover}`}
              title="Insert Timestamp"
            >
              <Clock className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={onToggleTypewriter}
              className={`rounded-md p-1.5 transition ${
                settings.typewriterMode ? activeBtn : btnHover
              }`}
              title="Typewriter Mode (keep active line centered)"
            >
              <Crosshair className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className={`rounded-md p-1.5 transition ${btnHover}`}
              title="Version History Machine"
            >
              <History className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsAddingTag(!isAddingTag)}
              className={`rounded-md p-1.5 transition ${
                isAddingTag || (note.tags && note.tags.length > 0)
                  ? activeBtn
                  : `${btnHover} text-neutral-400`
              }`}
              title={
                note.tags && note.tags.length > 0
                  ? `Tags: ${note.tags.map((t) => '#' + t).join(', ')} (click to manage)`
                  : 'Document Metadata & Tags'
              }
            >
              <Tag className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setShowCadenceLens(!showCadenceLens)}
              className={`rounded-md p-1.5 transition flex items-center gap-1 ${
                showCadenceLens ? activeBtn : `${btnHover} text-neutral-400`
              }`}
              title="Prose Cadence & Rhythm Lens (100% Offline Craft Diagnostics)"
            >
              <Activity className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-neutral-400 text-[11px]">
            <Code className="h-3.5 w-3.5 opacity-60" />
            <span className="opacity-75 font-sans">Raw Markdown Editor</span>
          </div>
        )}

        {/* Right Side: Download .md (Only in Raw Markdown mode) & Mode Toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          {rawMarkdownMode && (
            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] transition text-neutral-400 ${btnHover}`}
              title="Download note as a Markdown (.md) file"
            >
              <Download className="h-3 w-3" />
              <span>Download .md</span>
            </button>
          )}

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

      {/* Offline Prose Cadence & Rhythm Lens */}
      {showCadenceLens && cadenceMetrics && (
        <div
          className={`px-4 md:px-6 py-2.5 border-b ${subBarBorder} ${
            isLightMode ? 'bg-black/[0.015]' : 'bg-white/[0.015]'
          } text-xs select-none transition-all duration-300 ease-in-out ${
            shouldFadeChrome
              ? 'opacity-0 pointer-events-none -translate-y-1.5'
              : 'opacity-100 translate-y-0 animate-in fade-in duration-150'
          }`}
        >
          <div className="max-w-[72ch] mx-auto flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Activity
                  className="h-3.5 w-3.5 opacity-80"
                  style={{ color: currentTheme.tokens.accentColor }}
                />
                <span className="font-semibold tracking-tight">Prose Cadence &amp; Rhythm</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                    isLightMode
                      ? 'bg-black/[0.03] border-black/[0.08] text-[#383531]'
                      : 'bg-white/[0.04] border-white/[0.08] text-[#c5c1ba]'
                  }`}
                >
                  {cadenceMetrics.pacingLabel}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-[11px] tabular-nums opacity-85">
                <div>
                  <span className="opacity-55 mr-1">Avg Sentence:</span>
                  <span className="font-semibold">{cadenceMetrics.avgSentenceWords}w</span>
                  <span className="opacity-45 ml-1">({cadenceMetrics.sentenceCount} sentences)</span>
                </div>
                <div>
                  <span className="opacity-55 mr-1">Rhythm:</span>
                  <span title="Short sentences (≤8 words)">
                    {cadenceMetrics.rhythmDistribution.short} short
                  </span>
                  <span className="opacity-35 mx-1">·</span>
                  <span title="Medium sentences (9–20 words)">
                    {cadenceMetrics.rhythmDistribution.medium} med
                  </span>
                  <span className="opacity-35 mx-1">·</span>
                  <span title="Long sentences (≥21 words)">
                    {cadenceMetrics.rhythmDistribution.long} long
                  </span>
                </div>
                <div>
                  <span className="opacity-55 mr-1">Dialogue:</span>
                  <span className="font-semibold">{cadenceMetrics.dialogueRatio}%</span>
                </div>
                <div>
                  <span className="opacity-55 mr-1">Adverbs (-ly):</span>
                  <span className="font-semibold">{cadenceMetrics.adverbCount}</span>
                </div>
              </div>
            </div>

            {/* Sentence-Length Rhythm Sparkbar & Proximity Word Echoes */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
              {cadenceMetrics.sentenceLengths.length > 0 && (
                <div
                  className="flex items-end gap-[3px] h-4"
                  title="Sentence-by-sentence length rhythm across recent sentences"
                >
                  {cadenceMetrics.sentenceLengths.map((len, i) => {
                    const heightPct = Math.max(18, Math.min(100, Math.round((len / 32) * 100)));
                    return (
                      <span
                        key={i}
                        className="w-1 rounded-xs transition-all"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor:
                            len >= 22
                              ? currentTheme.tokens.accentColor
                              : isLightMode
                              ? 'rgba(0,0,0,0.28)'
                              : 'rgba(255,255,255,0.28)',
                        }}
                      />
                    );
                  })}
                </div>
              )}

              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="opacity-50">Proximity Echoes:</span>
                {cadenceMetrics.wordEchoes.length === 0 ? (
                  <span className="opacity-65 italic">None detected within 45 words</span>
                ) : (
                  cadenceMetrics.wordEchoes.map((echo) => (
                    <span
                      key={echo.word}
                      className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums border ${
                        isLightMode
                          ? 'bg-black/[0.03] border-black/[0.08] text-[#383531]'
                          : 'bg-white/[0.04] border-white/[0.08] text-[#c5c1ba]'
                      }`}
                    >
                      {echo.word} <span className="opacity-55">×{echo.count}</span>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Editor Scroll Container */}
      <div
        ref={editorContainerRef}
        onClick={handleContainerClick}
        onMouseMove={handleEditorMouseMove}
        className={`flex-1 overflow-y-auto px-6 md:px-16 lg:px-24 py-10 transition-all cursor-text ${
          settings.typewriterMode ? 'typewriter-mode' : ''
        }`}
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
        }}
      >
        <div className="max-w-[72ch] mx-auto space-y-5">
          {/* Note Title (ContentEditable heading - immune to password manager injections like Zoho Vault) */}
          <div className="relative">
            <h1
              ref={titleHeadingRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label="Document Title"
              onInput={handleTitleInput}
              onKeyDown={handleTitleKeyDown}
              onPaste={handleTitlePaste}
              className={`w-full bg-transparent font-medium tracking-tight focus:outline-none transition-all cursor-text min-h-[1.25em] ${
                settings.fontFamily === 'serif'
                  ? 'font-serif text-3xl md:text-4xl'
                  : settings.fontFamily === 'mono'
                  ? 'font-mono text-2xl md:text-3xl tracking-tight'
                  : settings.fontFamily === 'brutalist'
                  ? 'font-brutalist text-3xl md:text-4xl tracking-tight'
                  : 'font-sans text-2xl md:text-3xl'
              }`}
            />
            {(!note.title || note.title.trim() === '') && (
              <div
                onClick={() => titleHeadingRef.current?.focus()}
                className={`absolute left-0 top-0 pointer-events-none opacity-40 select-none font-medium tracking-tight ${
                  settings.fontFamily === 'serif'
                    ? 'font-serif text-3xl md:text-4xl'
                    : settings.fontFamily === 'mono'
                    ? 'font-mono text-2xl md:text-3xl tracking-tight'
                    : settings.fontFamily === 'brutalist'
                    ? 'font-brutalist text-3xl md:text-4xl tracking-tight'
                    : 'font-sans text-2xl md:text-3xl'
                }`}
              >
                Untitled Document...
              </div>
            )}
          </div>

          {/* Optional Document Metadata & Tags (Only displayed when toggled via Tag icon) */}
          {isAddingTag && (
            <div className="flex items-center gap-1.5 flex-wrap -mt-2 pb-2 select-none animate-in fade-in duration-150">
              {note.tags.map((tag) => (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition ${
                    isLightMode
                      ? 'bg-black/[0.03] border-black/[0.07] text-[#555]'
                      : 'bg-white/[0.04] border-white/[0.07] text-[#aaa]'
                  }`}
                >
                  <Tag className="h-2.5 w-2.5 opacity-40" />
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="opacity-40 hover:opacity-100 p-0.5 ml-0.5 rounded transition"
                    title={`Remove #${tag}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}

              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onBlur={handleAddTagSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTagSubmit();
                  if (e.key === 'Escape') setIsAddingTag(false);
                }}
                placeholder="add tag... (Enter)"
                data-zoho-ignore="true"
                data-lpignore="true"
                data-1p-ignore="true"
                autoFocus
                className={`rounded px-2 py-0.5 text-[11px] outline-none border ${
                  isLightMode
                    ? 'bg-white border-black/20 text-[#2c2a27]'
                    : 'bg-black/40 border-white/20 text-[#dedad4]'
                }`}
              />

              <button
                type="button"
                onClick={() => setIsAddingTag(false)}
                className="text-[10px] opacity-40 hover:opacity-80 px-1 py-0.5 ml-1 transition"
              >
                Done
              </button>
            </div>
          )}

          {rawMarkdownMode ? (
            <div className="space-y-2 pt-2">
              <textarea
                value={markdownContent}
                onChange={handleMarkdownChange}
                placeholder="Type markdown directly (# Header, **bold**, *italic*, > quote)..."
                className={`w-full min-h-[60vh] rounded-lg p-5 text-sm font-sans leading-relaxed resize-y focus:outline-none border transition-colors ${
                  settings.theme === 'dreamscape'
                    ? 'bg-white/50 backdrop-blur-sm border-[#e8ddf0] text-[#1e1b4b] focus:border-[#d946ef]/40'
                    : isLightMode
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

      {/* Unified Bottom Accessory & Status Bar */}
      <AccessoryBar
        note={note}
        settings={settings}
        dailyWordsWritten={dailyWordsWritten}
        onUpdateNote={onUpdateNote}
        onUpdateSettings={onUpdateSettings || (() => {})}
        onResetDailyWords={onResetDailyWords || (() => {})}
        focusMode={settings.focusMode}
        onToggleFocus={onToggleFocus}
        saveStatus={saveStatus}
        isTyping={isTyping}
        isLightMode={isLightMode}
      />

      {/* History Time Machine Modal */}
      {showHistoryModal && (
        <HistorySliderModal
          noteId={note.id}
          noteTitle={note.title}
          onRestore={handleRestoreSnapshot}
          onClose={() => setShowHistoryModal(false)}
          isLightMode={isLightMode}
          theme={settings.theme}
        />
      )}

      {/* Whisper-Quiet Floating Selection Action Bar (Portal to body to avoid containing-block clipping) */}
      {selectionToolbar &&
        !rawMarkdownMode &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: `${selectionToolbar.top}px`,
              left: `${selectionToolbar.left}px`,
              transform: 'translate(-50%, -100%)',
            }}
            onMouseDown={(e) => {
              // Prevent losing editor text selection when clicking toolbar buttons
              e.preventDefault();
            }}
            className={`z-50 flex items-center gap-0.5 px-1.5 py-1 rounded-lg border shadow-lg backdrop-blur-md text-xs select-none animate-in fade-in duration-100 ${
              isLightMode
                ? 'bg-[#ffffff]/95 border-black/[0.1] text-[#1c1a17] shadow-black/10'
                : 'bg-[#18191c]/95 border-white/[0.12] text-[#f0ece4] shadow-black/50'
            }`}
          >
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded transition ${
                editor?.isActive('bold')
                  ? isLightMode
                    ? 'bg-black/10 font-semibold'
                    : 'bg-white/15 font-semibold'
                  : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-80 hover:opacity-100'
              }`}
              title="Bold"
            >
              <Bold className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded transition ${
                editor?.isActive('italic')
                  ? isLightMode
                    ? 'bg-black/10 font-semibold'
                    : 'bg-white/15 font-semibold'
                  : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-80 hover:opacity-100'
              }`}
              title="Italic"
            >
              <Italic className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded transition ${
                editor?.isActive('blockquote')
                  ? isLightMode
                    ? 'bg-black/10 font-semibold'
                    : 'bg-white/15 font-semibold'
                  : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-80 hover:opacity-100'
              }`}
              title="Blockquote"
            >
              <Quote className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                insertWikilink();
                setSelectionToolbar(null);
              }}
              className="p-1.5 rounded transition hover:bg-black/5 dark:hover:bg-white/10 opacity-80 hover:opacity-100"
              title="Wrap as [[Wikilink]]"
            >
              <Link2 className="h-3.5 w-3.5" />
            </button>

            {onAskLumen && (
              <>
                <div
                  className={`mx-1 h-3.5 w-px ${
                    isLightMode ? 'bg-black/10' : 'bg-white/10'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    onAskLumen(selectionToolbar.text);
                    setSelectionToolbar(null);
                  }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition hover:bg-black/5 dark:hover:bg-white/10"
                  title="Send selected passage to Lumen Editorial Partner"
                >
                  <Sparkles
                    className="h-3 w-3 shrink-0"
                    style={{ color: currentTheme.tokens.accentColor }}
                  />
                  <span>Ask Lumen</span>
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};

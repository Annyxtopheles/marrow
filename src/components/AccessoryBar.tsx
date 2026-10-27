import React, { useState, useRef, useEffect } from 'react';
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
  Mic,
  Volume2,
} from 'lucide-react';
import { Editor } from '@tiptap/react';
import { DictationService, ReadAloudService, isSpeechRecognitionSupported, isSpeechSynthesisSupported } from '../services/speech';

interface AccessoryBarProps {
  editor: Editor | null;
  onOpenHistory: () => void;
  typewriterMode: boolean;
  onToggleTypewriter: () => void;
  focusMode: boolean;
  onToggleFocus: () => void;
  onInsertTimestamp: () => void;
  saveStatus: 'saved' | 'saving';
  isLightMode: boolean;
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
  isLightMode,
}) => {
  // Native Speech-to-Text & Text-to-Speech hooks must be unconditional
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const dictationRef = useRef<DictationService | null>(null);

  useEffect(() => {
    return () => {
      dictationRef.current?.stop();
      ReadAloudService.stop();
    };
  }, []);

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

  const barBg = isLightMode
    ? 'border-[#e4e0d7] bg-[#f7f5f0]/85 text-[#6c6760]'
    : 'border-white/[0.06] bg-[#16171a]/85 text-[#9a968f]';

  const btnHover = isLightMode ? 'hover:bg-black/[0.05] hover:text-[#222]' : 'hover:bg-white/[0.06] hover:text-[#eee]';
  const activeBtn = isLightMode ? 'bg-black/[0.08] text-[#111]' : 'bg-white/[0.08] text-[#f2efe9]';
  const divider = isLightMode ? 'bg-[#e4e0d7]' : 'bg-white/[0.07]';

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
        onError: () => {
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
      const selected = editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        ' '
      );
      const textToSpeak = selected.trim() ? selected : editor.getText();
      if (!textToSpeak.trim()) return;

      setIsSpeaking(true);
      ReadAloudService.speak(
        textToSpeak,
        undefined,
        () => setIsSpeaking(false)
      );
    }
  };

  return (
    <div
      className={`sticky bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t ${barBg} backdrop-blur-md px-3.5 py-1.5 text-xs select-none transition-colors duration-200`}
    >
      {/* Punctuation & Quick Formatting */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
        <button
          type="button"
          onClick={() => insertPair('“', '”')}
          className={`rounded-md px-2 py-0.5 font-serif text-sm transition ${btnHover}`}
          title="Smart double quotes"
        >
          “”
        </button>
        <button
          type="button"
          onClick={() => insertPair('‘', '’')}
          className={`rounded-md px-2 py-0.5 font-serif text-sm transition ${btnHover}`}
          title="Smart single quotes"
        >
          ‘’
        </button>
        <button
          type="button"
          onClick={() => insertPair('(', ')')}
          className={`rounded-md px-2 py-0.5 text-[11px] transition ${btnHover}`}
          title="Parentheses"
        >
          ( )
        </button>
        <button
          type="button"
          onClick={() => insertPair('[', ']')}
          className={`rounded-md px-2 py-0.5 text-[11px] transition ${btnHover}`}
          title="Brackets"
        >
          [ ]
        </button>
        <button
          type="button"
          onClick={() => insertPair('《', '》')}
          className={`rounded-md px-2 py-0.5 font-serif text-xs transition ${btnHover}`}
          title="Book title brackets"
        >
          《》
        </button>
        <button
          type="button"
          onClick={() => insertPair('— ', ' ')}
          className={`rounded-md px-2 py-0.5 font-serif text-xs transition ${btnHover}`}
          title="Em dash"
        >
          —
        </button>

        <div className={`mx-1.5 h-3.5 w-px ${divider}`} />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`rounded-md p-1.5 transition ${editor.isActive('bold') ? activeBtn : btnHover}`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`rounded-md p-1.5 transition ${editor.isActive('italic') ? activeBtn : btnHover}`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`rounded-md p-1.5 transition ${
            editor.isActive('heading', { level: 2 }) ? activeBtn : btnHover
          }`}
          title="Heading"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`rounded-md p-1.5 transition ${
            editor.isActive('blockquote') ? activeBtn : btnHover
          }`}
          title="Blockquote"
        >
          <Quote className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`rounded-md p-1.5 transition ${
            editor.isActive('bulletList') ? activeBtn : btnHover
          }`}
          title="Bullet List"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={insertWikilink}
          className={`rounded-md p-1.5 transition ${btnHover}`}
          title="Obsidian Wikilink [[Note]]"
        >
          <Link2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onInsertTimestamp}
          className={`rounded-md p-1.5 transition ${btnHover}`}
          title="TimeJot Timestamp Stamp"
        >
          <Clock className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Editor Controls & Fail-Safe Indicator */}
      <div className="flex items-center gap-1.5 pl-2 shrink-0">
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className={`rounded-md p-1.5 disabled:opacity-30 transition ${btnHover}`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className={`rounded-md p-1.5 disabled:opacity-30 transition ${btnHover}`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <div className={`mx-1.5 h-3.5 w-px ${divider}`} />

        <button
          type="button"
          onClick={toggleDictation}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition ${
            isListening ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : btnHover
          }`}
          title={isListening ? 'Stop Dictation' : 'Dictate (Voice-to-Text)'}
        >
          <Mic className={`h-3 w-3 ${isListening ? 'animate-pulse text-rose-400' : ''}`} />
          <span className="hidden md:inline">{isListening ? 'Listening...' : 'Dictate'}</span>
        </button>

        <button
          type="button"
          onClick={toggleReadAloud}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition ${
            isSpeaking ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : btnHover
          }`}
          title={isSpeaking ? 'Stop Reading' : 'Proofread Aloud (Text-to-Speech)'}
        >
          <Volume2 className={`h-3 w-3 ${isSpeaking ? 'animate-pulse text-amber-300' : ''}`} />
          <span className="hidden md:inline">{isSpeaking ? 'Reading...' : 'Listen'}</span>
        </button>

        <button
          type="button"
          onClick={onToggleTypewriter}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition ${
            typewriterMode ? activeBtn : btnHover
          }`}
          title="Typewriter Mode (keep active line centered)"
        >
          <Crosshair className="h-3 w-3" />
          <span className="hidden sm:inline">Typewriter</span>
        </button>

        <button
          type="button"
          onClick={onOpenHistory}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] transition ${btnHover}`}
          title="Marrow History Machine"
        >
          <History className="h-3 w-3" />
          <span className="hidden sm:inline">History</span>
        </button>

        <button
          type="button"
          onClick={onToggleFocus}
          className={`rounded-md p-1.5 transition ${btnHover}`}
          title={focusMode ? 'Exit Zen Mode' : 'Zen Focus Mode'}
        >
          {focusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>

        {/* Soft Save Status */}
        <div className="flex items-center gap-1.5 pl-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full transition-all duration-300 ${
              saveStatus === 'saved'
                ? 'bg-emerald-500/80'
                : 'bg-amber-400/80 animate-pulse'
            }`}
          />
          <span className="text-[10px] uppercase tracking-wider opacity-60 hidden md:inline">
            {saveStatus === 'saved' ? 'Saved' : 'Saving'}
          </span>
        </div>
      </div>
    </div>
  );
};

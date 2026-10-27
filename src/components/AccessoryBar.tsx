import React, { useState, useRef, useEffect } from 'react';
import {
  Undo2,
  Redo2,
  Clock,
  Crosshair,
  Maximize2,
  Minimize2,
  History,
  Mic,
  Volume2,
  ShieldCheck,
} from 'lucide-react';
import { Editor } from '@tiptap/react';
import type { Note } from '../types';
import { DictationService, ReadAloudService, isSpeechRecognitionSupported, isSpeechSynthesisSupported } from '../services/speech';

interface AccessoryBarProps {
  editor: Editor | null;
  note: Note;
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
  note,
  onOpenHistory,
  typewriterMode,
  onToggleTypewriter,
  focusMode,
  onToggleFocus,
  onInsertTimestamp,
  saveStatus,
  isLightMode,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const dictationRef = useRef<DictationService | null>(null);

  useEffect(() => {
    return () => {
      dictationRef.current?.stop();
      ReadAloudService.stop();
    };
  }, []);

  const barBg = isLightMode
    ? 'border-[#e4e0d7] bg-[#f7f5f0]/90 text-[#6c6760]'
    : 'border-white/[0.06] bg-[#16171a]/90 text-[#9a968f]';

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

  const words = note.wordCount || 0;
  const chars = note.characterCount || 0;
  const readingMinutes = Math.max(1, Math.ceil(words / 200));

  return (
    <div
      className={`sticky bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t ${barBg} backdrop-blur-md px-4 py-1.5 text-xs select-none transition-colors duration-200`}
    >
      {/* Workflow Controls: Undo/Redo, Speech, Timestamp, Focus */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        <button
          type="button"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={!editor?.can().undo()}
          className={`rounded-md p-1.5 disabled:opacity-30 transition ${btnHover}`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={!editor?.can().redo()}
          className={`rounded-md p-1.5 disabled:opacity-30 transition ${btnHover}`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>

        <div className={`mx-1.5 h-3.5 w-px ${divider}`} />

        <button
          type="button"
          onClick={toggleDictation}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition ${
            isListening ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : btnHover
          }`}
          title={isListening ? 'Stop Dictation' : 'Dictate (Voice-to-Text)'}
        >
          <Mic className={`h-3 w-3 ${isListening ? 'animate-pulse text-rose-400' : ''}`} />
          <span className="hidden sm:inline">{isListening ? 'Listening...' : 'Dictate'}</span>
        </button>

        <button
          type="button"
          onClick={toggleReadAloud}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition ${
            isSpeaking ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : btnHover
          }`}
          title={isSpeaking ? 'Stop Reading' : 'Proofread Aloud (Text-to-Speech)'}
        >
          <Volume2 className={`h-3 w-3 ${isSpeaking ? 'animate-pulse text-amber-300' : ''}`} />
          <span className="hidden sm:inline">{isSpeaking ? 'Reading...' : 'Listen'}</span>
        </button>

        <button
          type="button"
          onClick={onInsertTimestamp}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition ${btnHover}`}
          title="Insert timestamp stamp"
        >
          <Clock className="h-3 w-3 opacity-70" />
          <span className="hidden sm:inline">Timestamp</span>
        </button>

        <div className={`mx-1.5 h-3.5 w-px ${divider}`} />

        <button
          type="button"
          onClick={onToggleTypewriter}
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition ${
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
          className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] transition ${btnHover}`}
          title="Marrow Revision History Scrubber"
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
      </div>

      {/* Live Document Statistics & Protection Status */}
      <div className="flex items-center gap-3 pl-3 shrink-0 text-[11px] opacity-80">
        <span className="flex items-center gap-1.5">
          <span>{words.toLocaleString()} words</span>
        </span>
        <span className="hidden md:inline-block opacity-40">•</span>
        <span className="hidden md:inline">
          <span>{chars.toLocaleString()} chars</span>
        </span>
        <span className="hidden lg:inline-block opacity-40">•</span>
        <span className="hidden lg:inline">
          <span>~{readingMinutes} min read</span>
        </span>

        <span className="opacity-40">•</span>

        <span className="flex items-center gap-1.5" title="Fail-Safe Continuous Protection">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500/80" />
          <span className="text-[10px] uppercase tracking-wider opacity-75">
            {saveStatus === 'saved' ? 'Protected' : 'Syncing'}
          </span>
        </span>
      </div>
    </div>
  );
};

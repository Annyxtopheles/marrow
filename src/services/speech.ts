// Web Speech API Voice-to-Text and Text-to-Speech service for Marrow

export interface SpeechRecognitionHandlers {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

// Check browser support for Speech Recognition
export const isSpeechRecognitionSupported = (): boolean => {
  return typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
};

// Check browser support for Speech Synthesis
export const isSpeechSynthesisSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

// Create a SpeechRecognition instance with safe fallbacks
export class DictationService {
  private recognition: any = null;
  private isListening: boolean = false;

  constructor(handlers: SpeechRecognitionHandlers) {
    if (!isSpeechRecognitionSupported()) return;

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    this.recognition = new SpeechRec();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (final.trim()) {
        handlers.onResult(final.trim(), true);
      } else if (interim.trim()) {
        handlers.onResult(interim.trim(), false);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      handlers.onError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      handlers.onEnd();
    };
  }

  start(): void {
    if (!this.recognition || this.isListening) return;
    try {
      this.isListening = true;
      this.recognition.start();
    } catch (e) {
      console.warn('Recognition start failed', e);
      this.isListening = false;
    }
  }

  stop(): void {
    if (!this.recognition || !this.isListening) return;
    try {
      this.isListening = false;
      this.recognition.stop();
    } catch (e) {
      console.warn('Recognition stop failed', e);
    }
  }

  get active(): boolean {
    return this.isListening;
  }
}

// Text-to-Speech Proofreading Engine
export class ReadAloudService {
  private static utterance: SpeechSynthesisUtterance | null = null;

  static speak(
    text: string,
    onBoundary?: (charIndex: number) => void,
    onEnd?: () => void
  ): void {
    if (!isSpeechSynthesisSupported()) return;

    this.stop();

    // Strip HTML tags for clean spoken prose
    const cleanText = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.rate = 0.95; // Slightly measured pace for literary proofreading
    utter.pitch = 1.0;

    // Pick a natural sounding English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Enhanced') || v.name.includes('Google') || v.name.includes('Siri'))
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (naturalVoice) {
      utter.voice = naturalVoice;
    }

    if (onBoundary) {
      utter.onboundary = (e) => {
        if (e.name === 'word') {
          onBoundary(e.charIndex);
        }
      };
    }

    utter.onend = () => {
      this.utterance = null;
      if (onEnd) onEnd();
    };

    utter.onerror = (e) => {
      console.warn('Speech synthesis error', e);
      this.utterance = null;
      if (onEnd) onEnd();
    };

    this.utterance = utter;
    window.speechSynthesis.speak(utter);
  }

  static pause(): void {
    if (isSpeechSynthesisSupported() && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
    }
  }

  static resume(): void {
    if (isSpeechSynthesisSupported() && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  static stop(): void {
    if (isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
      this.utterance = null;
    }
  }

  static isSpeaking(): boolean {
    return isSpeechSynthesisSupported() && (window.speechSynthesis.speaking || this.utterance !== null);
  }

  static isPaused(): boolean {
    return isSpeechSynthesisSupported() && window.speechSynthesis.paused;
  }
}

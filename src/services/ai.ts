import type { AIMessage, SceneBeat } from '../types';

export type AIPersona = 'editor' | 'visionary' | 'critic';

export const PERSONA_CONFIGS: Record<
  AIPersona,
  { name: string; title: string; systemInstruction: string }
> = {
  editor: {
    name: 'Editorial Partner',
    title: 'Developmental & Line Editor',
    systemInstruction:
      'You are a distinguished literary editor and fiction consultant. Your objective is to help the writer elevate their storytelling, scene pacing, subtext, and character agency. Be concise, insightful, and practical. Do not take over or ghostwrite the prose—nudge, diagnose, suggest alternative angles, and respect the author\'s unique voice.',
  },
  visionary: {
    name: 'Sensory Visionary',
    title: 'Worldbuilder & Sensory Stylist',
    systemInstruction:
      'You are an evocative literary visionary and imaginative collaborator within the Lumen editorial suite. Your role is to help the author discover vivid sensory textures (sight, sound, scent, touch), atmospheric metaphors, unexpected story branches, and psychological depth. Inspire with rich imagery and provocative questions.',
  },
  critic: {
    name: 'Sharp Critic',
    title: 'Developmental Devil\'s Advocate',
    systemInstruction:
      'You are a sharp, honest developmental critic. Your goal is to rigorously stress-test the scene: point out pacing lulls, passive protagonists, melodramatic or on-the-nose dialogue, plot holes, and clichés. Be constructive, respectful, but relentlessly honest about narrative stakes.',
  },
};

export interface GenerateAIOptions {
  apiKey: string;
  model?: 'gemini-3.5-flash-lite' | 'gemini-3.8-flash';
  persona?: AIPersona;
  noteTitle: string;
  noteSynopsis?: string;
  noteContentHtml: string;
  selectedText?: string;
  userPrompt: string;
  history?: AIMessage[];
}

export const cleanHtmlToText = (html: string): string => {
  return html
    .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<blockquote>(.*?)<\/blockquote>/gi, '> $1\n\n')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<li>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
};

export const parseBeatsFromResponse = (text: string): SceneBeat[] => {
  const lines = text.split('\n');
  const beats: SceneBeat[] = [];
  let index = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    // Match numbered list: "1. text" or "1) text" or bullet "- text" or "* text"
    const match = trimmed.match(/^(?:(?:\d+[.)])|[-*•])\s*(.*)$/);
    if (match && match[1]) {
      const beatText = match[1]
        .replace(/^\[[ xX]\]\s*/, '') // remove checkbox markdown if present
        .replace(/^\*\*(.*?)\*\*:?\s*/, '$1: ') // clean leading bold header
        .trim();
      if (beatText.length > 2 && beatText.length < 250) {
        beats.push({
          id: `beat-ai-${Date.now()}-${index++}`,
          text: beatText,
          done: false,
        });
      }
    }
  }

  return beats;
};

export const AIService = {
  async generateEditorialResponse(options: GenerateAIOptions): Promise<string> {
    const {
      apiKey,
      model = 'gemini-3.5-flash-lite',
      persona = 'editor',
      noteTitle,
      noteSynopsis,
      noteContentHtml,
      selectedText,
      userPrompt,
      history = [],
    } = options;

    if (!apiKey || !apiKey.trim()) {
      throw new Error('Gemini API Key is missing. Please add your key in Settings.');
    }

    const cleanContent = cleanHtmlToText(noteContentHtml);
    const personaConfig = PERSONA_CONFIGS[persona] || PERSONA_CONFIGS.editor;

    // Context preamble
    let contextHeader = `=== CURRENT DOCUMENT CONTEXT ===\nTitle: "${noteTitle || 'Untitled'}"\n`;
    if (noteSynopsis && noteSynopsis.trim()) {
      contextHeader += `Chapter Synopsis / Objectives: ${noteSynopsis.trim()}\n`;
    }
    if (selectedText && selectedText.trim()) {
      contextHeader += `Highlighted Selection for Analysis:\n"${selectedText.trim()}"\n`;
    }
    if (cleanContent) {
      contextHeader += `Document Draft Text:\n"""\n${cleanContent.slice(0, 40000)}\n"""\n================================\n\n`;
    }

    // Build conversation contents
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // History turns (last 6 messages max to stay tight)
    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    }

    // Current turn with context header prepended
    contents.push({
      role: 'user',
      parts: [
        {
          text: `${contextHeader}Author Request: ${userPrompt}`,
        },
      ],
    });

    // Execution with automatic fallback if primary model is unavailable
    const tryCall = async (targetModel: string): Promise<string> => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey.trim()}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: personaConfig.systemInstruction }],
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${res.status}: ${res.statusText}`;
        throw new Error(message);
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const reply = candidate?.content?.parts?.[0]?.text;

      if (!reply) {
        throw new Error('No response returned from the Gemini model.');
      }

      return reply.trim();
    };

    try {
      return await tryCall(model);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // If primary model is unavailable (503 / high demand) and we used 3.8-flash, try 3.5-flash-lite fallback
      if (model === 'gemini-3.8-flash' && errMsg.includes('high demand')) {
        return await tryCall('gemini-3.5-flash-lite');
      }
      throw err;
    }
  },
};

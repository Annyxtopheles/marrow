import React, { useState, useMemo } from 'react';
import type { Note, Folder, ThemeMode } from '../types';
import { THEMES, type ThemeDefinition } from '../services/themes';
import {
  X,
  BookOpen,
  Download,
  Copy,
  Check,
} from 'lucide-react';

interface CompileModalProps {
  notes: Note[];
  folders: Folder[];
  initialFolderId?: string | null;
  onClose: () => void;
  isLightMode: boolean;
  theme?: ThemeMode;
  currentTheme?: ThemeDefinition;
}

const htmlToCleanText = (html: string): string => {
  return html
    .replace(/<h1>(.*?)<\/h1>/gi, '\n# $1\n\n')
    .replace(/<h2>(.*?)<\/h2>/gi, '\n## $1\n\n')
    .replace(/<h3>(.*?)<\/h3>/gi, '\n### $1\n\n')
    .replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, '\n> $1\n\n')
    .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
};

export const CompileModal: React.FC<CompileModalProps> = ({
  notes,
  folders,
  initialFolderId = null,
  onClose,
  isLightMode,
  theme,
  currentTheme: propTheme,
}) => {
  const currentTheme = propTheme || THEMES[theme || 'charcoal'] || THEMES.charcoal;

  const [selectedScope, setSelectedScope] = useState<string>(initialFolderId || 'all');
  const [manuscriptTitle, setManuscriptTitle] = useState('My Novel Manuscript');
  const [authorName, setAuthorName] = useState('');
  const [includeHeadings, setIncludeHeadings] = useState(true);
  const [includeDividers, setIncludeDividers] = useState(true);
  const [includeDates, setIncludeDates] = useState(false);
  const [outputFormat, setOutputFormat] = useState<'md' | 'txt'>('md');
  const [copied, setCopied] = useState(false);

  // Selected notes to compile
  const selectedNotes = useMemo(() => {
    let list: Note[] = [];
    if (selectedScope === 'all') {
      list = [...notes];
    } else if (selectedScope === 'root') {
      list = notes.filter((n) => !n.folderId);
    } else {
      list = notes.filter((n) => n.folderId === selectedScope);
    }

    // Sort: pinned first, then by creation date ascending (narrative chronological flow)
    return list.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return a.createdAt - b.createdAt;
    });
  }, [notes, selectedScope]);

  // Compiled manuscript text
  const compiledText = useMemo(() => {
    const parts: string[] = [];

    // Title Page / Header
    if (manuscriptTitle.trim()) {
      if (outputFormat === 'md') {
        parts.push(`# ${manuscriptTitle.trim()}\n`);
        if (authorName.trim()) {
          parts.push(`*by ${authorName.trim()}*\n`);
        }
      } else {
        parts.push(`${manuscriptTitle.trim().toUpperCase()}\n`);
        if (authorName.trim()) {
          parts.push(`By ${authorName.trim()}\n`);
        }
        parts.push('==============================\n');
      }
    }

    selectedNotes.forEach((note, index) => {
      const chapterParts: string[] = [];

      // Chapter Heading
      if (includeHeadings) {
        const title = note.title || `Chapter ${index + 1}`;
        if (outputFormat === 'md') {
          chapterParts.push(`## ${title}`);
        } else {
          chapterParts.push(`\n${title.toUpperCase()}\n`);
        }
      }

      // In-universe Date
      if (includeDates && note.inUniverseDate) {
        if (outputFormat === 'md') {
          chapterParts.push(`*${note.inUniverseDate}*\n`);
        } else {
          chapterParts.push(`[${note.inUniverseDate}]\n`);
        }
      }

      // Body text
      const cleanBody = htmlToCleanText(note.content);
      if (outputFormat === 'txt') {
        // Strip markdown asterisks and blockquotes for clean text
        const plainBody = cleanBody
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/^>\s*/gm, '');
        chapterParts.push(plainBody);
      } else {
        chapterParts.push(cleanBody);
      }

      parts.push(chapterParts.join('\n\n'));

      // Divider between chapters (if not last)
      if (includeDividers && index < selectedNotes.length - 1) {
        parts.push(outputFormat === 'md' ? '\n---\n' : '\n* * *\n');
      }
    });

    return parts.join('\n\n');
  }, [
    selectedNotes,
    manuscriptTitle,
    authorName,
    includeHeadings,
    includeDividers,
    includeDates,
    outputFormat,
  ]);

  const totalWords = useMemo(() => {
    return compiledText.trim() ? compiledText.trim().split(/\s+/).length : 0;
  }, [compiledText]);

  const readingMinutes = Math.max(1, Math.ceil(totalWords / 200));

  const handleCopy = () => {
    navigator.clipboard.writeText(compiledText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `${manuscriptTitle.trim().replace(/[/\\?%*:|"<>]/g, '-') || 'manuscript'}.${outputFormat}`;
    const blob = new Blob([compiledText], {
      type: outputFormat === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const border = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.08]';
  const modalBg = isLightMode
    ? 'bg-[#f7f5f0] text-[#2c2a27]'
    : 'bg-[#151618] text-[#dedad4]';
  const cardBg = isLightMode
    ? 'bg-white border-black/10'
    : 'bg-[#18191c] border-white/10';
  const previewBg = isLightMode ? 'bg-[#fffefb]' : 'bg-[#101113]';
  const inputBg = isLightMode
    ? 'bg-white border-black/15 text-[#111]'
    : 'bg-black/30 border-white/15 text-[#f0ece4]';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-4xl h-[88vh] rounded-2xl border ${border} ${modalBg} shadow-2xl flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-2.5">
            <div
              className="p-1.5 rounded-lg"
              style={{
                backgroundColor: currentTheme.tokens.accentBg,
                color: currentTheme.tokens.accentColor,
              }}
            >
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Compile & Export Manuscript</h2>
              <p className="text-[11px] opacity-60">
                Stitch multiple chapters and notes into one seamless novel manuscript
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body: Options on Left, Preview on Right */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Settings */}
          <div className={`w-80 border-r ${border} p-5 overflow-y-auto space-y-5 text-xs shrink-0`}>
            {/* Scope Selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider opacity-60 font-medium block">
                Compilation Scope
              </label>
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value)}
                className={`w-full rounded-lg px-2.5 py-1.5 border text-xs outline-none ${inputBg}`}
              >
                <option value="all">Entire Vault ({notes.length} documents)</option>
                <option value="root">General / Loose Notes only</option>
                {folders.map((f) => {
                  const count = notes.filter((n) => n.folderId === f.id).length;
                  return (
                    <option key={f.id} value={f.id}>
                      Folder: {f.name} ({count} notes)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Manuscript Metadata */}
            <div className="space-y-2.5">
              <label className="text-[10px] uppercase tracking-wider opacity-60 font-medium block">
                Manuscript Info
              </label>
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] opacity-70 block mb-1">Book / Story Title</span>
                  <input
                    type="text"
                    value={manuscriptTitle}
                    onChange={(e) => setManuscriptTitle(e.target.value)}
                    placeholder="e.g. The Iron Concord"
                    className={`w-full rounded-lg px-2.5 py-1.5 border text-xs outline-none ${inputBg}`}
                  />
                </div>
                <div>
                  <span className="text-[10px] opacity-70 block mb-1">Author Name (Optional)</span>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className={`w-full rounded-lg px-2.5 py-1.5 border text-xs outline-none ${inputBg}`}
                  />
                </div>
              </div>
            </div>

            {/* Formatting Toggles */}
            <div className="space-y-2.5">
              <label className="text-[10px] uppercase tracking-wider opacity-60 font-medium block">
                Formatting & Layout
              </label>
              <div className="space-y-1.5">
                <label className={`flex items-center justify-between p-2 rounded-lg border ${cardBg} cursor-pointer`}>
                  <span className="text-xs">Chapter Headings</span>
                  <input
                    type="checkbox"
                    checked={includeHeadings}
                    onChange={(e) => setIncludeHeadings(e.target.checked)}
                    className="h-3.5 w-3.5 accent-current"
                  />
                </label>
                <label className={`flex items-center justify-between p-2 rounded-lg border ${cardBg} cursor-pointer`}>
                  <span className="text-xs">Scene Break Dividers (---)</span>
                  <input
                    type="checkbox"
                    checked={includeDividers}
                    onChange={(e) => setIncludeDividers(e.target.checked)}
                    className="h-3.5 w-3.5 accent-current"
                  />
                </label>
                <label className={`flex items-center justify-between p-2 rounded-lg border ${cardBg} cursor-pointer`}>
                  <span className="text-xs">In-Universe Timeline Dates</span>
                  <input
                    type="checkbox"
                    checked={includeDates}
                    onChange={(e) => setIncludeDates(e.target.checked)}
                    className="h-3.5 w-3.5 accent-current"
                  />
                </label>
              </div>
            </div>

            {/* Format choice */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-wider opacity-60 font-medium block">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOutputFormat('md')}
                  className={`py-1.5 text-xs rounded-lg border font-medium transition ${
                    outputFormat === 'md'
                      ? 'border-current font-semibold'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    borderColor: outputFormat === 'md' ? currentTheme.tokens.accentColor : undefined,
                    color: outputFormat === 'md' ? currentTheme.tokens.accentColor : undefined,
                  }}
                >
                  Markdown (.md)
                </button>
                <button
                  type="button"
                  onClick={() => setOutputFormat('txt')}
                  className={`py-1.5 text-xs rounded-lg border font-medium transition ${
                    outputFormat === 'txt'
                      ? 'border-current font-semibold'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    borderColor: outputFormat === 'txt' ? currentTheme.tokens.accentColor : undefined,
                    color: outputFormat === 'txt' ? currentTheme.tokens.accentColor : undefined,
                  }}
                >
                  Plain Text (.txt)
                </button>
              </div>
            </div>

            {/* Stats Summary Pill */}
            <div className={`p-3 rounded-xl border ${cardBg} space-y-1.5`}>
              <div className="flex items-center justify-between">
                <span className="opacity-60">Total Chapters:</span>
                <span className="font-semibold">{selectedNotes.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-60">Total Words:</span>
                <span className="font-semibold tabular-nums">{totalWords.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="opacity-60">Est. Read Time:</span>
                <span className="opacity-80">~{readingMinutes} min</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Manuscript Preview */}
          <div className={`flex-1 flex flex-col overflow-hidden ${previewBg}`}>
            <div className={`px-5 py-2.5 border-b ${border} flex items-center justify-between text-xs opacity-75 shrink-0`}>
              <span className="font-medium">Live Manuscript Preview</span>
              <span className="tabular-nums text-[11px] opacity-60">
                {selectedNotes.length} chapters • {totalWords.toLocaleString()} words
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-8 select-text font-serif text-sm leading-relaxed whitespace-pre-wrap">
              <div className="max-w-[72ch] mx-auto opacity-90">
                {compiledText || 'No documents selected for compilation.'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`px-6 py-3.5 border-t ${border} flex items-center justify-between shrink-0`}>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied Manuscript' : 'Copy to Clipboard'}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs font-semibold px-5 py-1.5 rounded-lg transition shadow-sm hover:opacity-90 active:scale-95"
              style={{
                backgroundColor: currentTheme.tokens.accentColor,
                color: currentTheme.tokens.accentContrast,
              }}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Manuscript ({outputFormat.toUpperCase()})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

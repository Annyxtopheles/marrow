import React, { useState, useMemo } from 'react';
import type { HistoryRecord } from '../types';
import { StorageService } from '../services/storage';
import { X, RotateCcw, Calendar, FileText, Check, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface HistorySliderModalProps {
  noteId: string;
  noteTitle: string;
  onRestore: (content: string, title: string) => void;
  onClose: () => void;
  isLightMode: boolean;
}

export const HistorySliderModal: React.FC<HistorySliderModalProps> = ({
  noteId,
  noteTitle,
  onRestore,
  onClose,
  isLightMode,
}) => {
  const [initialTimestamp] = useState(() => Date.now());
  const history = StorageService.getHistory(noteId);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const records = useMemo<HistoryRecord[]>(() => {
    return history.length > 0
      ? history
      : [
          {
            id: 'current',
            noteId,
            timestamp: initialTimestamp,
            content: '<p>Initial draft snapshot...</p>',
            title: noteTitle,
            wordCount: 0,
          },
        ];
  }, [history, initialTimestamp, noteId, noteTitle]);

  const currentRecord = records[selectedIndex] || records[0];

  const handleRestore = () => {
    onRestore(currentRecord.content, currentRecord.title);
    onClose();
  };

  const handleCopy = () => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = currentRecord.content;
    navigator.clipboard.writeText(tempDiv.textContent || tempDiv.innerText || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrev = () => {
    if (selectedIndex < records.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const modalBg = isLightMode
    ? 'bg-[#f7f5f0] border-[#e4e0d7] text-[#2c2a27]'
    : 'bg-[#16171a] border-white/[0.08] text-[#dedad4]';

  const headerBorder = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.08]';
  const sidebarBorder = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.08]';
  const previewBg = isLightMode ? 'bg-[#fffefb]' : 'bg-[#121315]';

  const activeItem = isLightMode
    ? 'bg-black/[0.06] border-black/15 text-[#111]'
    : 'bg-white/[0.08] border-white/20 text-white';

  const inactiveItem = isLightMode
    ? 'border-transparent hover:bg-black/[0.03] text-[#555] hover:text-[#111]'
    : 'border-transparent hover:bg-white/[0.04] text-neutral-400 hover:text-white';

  const btnSecondary = isLightMode
    ? 'border-black/10 bg-black/[0.03] hover:bg-black/[0.07] text-[#333]'
    : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-neutral-300';

  const btnPrimary = isLightMode
    ? 'bg-black text-white hover:bg-neutral-800'
    : 'bg-white text-black hover:bg-neutral-200';

  return (
    <div
      onClick={onClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 select-none ${
        isLightMode ? 'bg-black/40 backdrop-blur-sm' : 'bg-black/75 backdrop-blur-md'
      } animate-in fade-in duration-200`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex flex-col w-full max-w-4xl h-[85vh] rounded-2xl border shadow-2xl overflow-hidden transition-all ${modalBg}`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between border-b ${headerBorder} px-6 py-3.5`}>
          <div className="flex items-center gap-2.5">
            <img
              src={isLightMode ? '/marrow logo icon dark.svg' : '/marrow logo icon.svg'}
              alt="Marrow"
              className="h-4 w-4 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-inherit">
                  Version History
                </h2>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    isLightMode
                      ? 'bg-black/[0.04] border-black/[0.08] text-[#666]'
                      : 'bg-white/[0.05] border-white/[0.08] text-neutral-400'
                  }`}
                >
                  {records.length} {records.length === 1 ? 'snapshot' : 'snapshots'}
                </span>
              </div>
              <p className="text-[11px] opacity-60 mt-0.5">
                Inspect prior revisions of this document and restore any version with one click.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/[0.05] transition"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main Body: 2 Columns (Snapshots List on Left, Preview on Right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Snapshots Sidebar */}
          <div
            className={`w-64 md:w-72 flex flex-col border-r ${sidebarBorder} bg-inherit select-none text-xs`}
          >
            {/* Quick Step Buttons */}
            <div className={`p-2.5 border-b ${sidebarBorder} flex items-center justify-between`}>
              <span className="text-[11px] font-medium opacity-70">
                Revision #{records.length - selectedIndex} of {records.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={selectedIndex >= records.length - 1}
                  className={`p-1 rounded border disabled:opacity-30 transition ${btnSecondary}`}
                  title="Older revision"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={selectedIndex <= 0}
                  className={`p-1 rounded border disabled:opacity-30 transition ${btnSecondary}`}
                  title="Newer revision"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* List of Revisions */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {records.map((rec, index) => {
                const isSelected = index === selectedIndex;
                const dateObj = new Date(rec.timestamp);
                const isCurrent = index === 0;

                return (
                  <div
                    key={rec.id || index}
                    onClick={() => setSelectedIndex(index)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition space-y-1 ${
                      isSelected ? activeItem : inactiveItem
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span className="flex items-center gap-1.5 truncate">
                        <Clock className="h-3 w-3 opacity-60 shrink-0" />
                        <span className="truncate">
                          {isCurrent
                            ? 'Latest Version'
                            : StorageService.formatInterval(rec.timestamp)}
                        </span>
                      </span>
                      <span className="text-[10px] font-mono opacity-60">
                        {rec.wordCount} words
                      </span>
                    </div>

                    <div className="text-[10px] opacity-60 truncate">
                      {dateObj.toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })}
                      {', '}
                      {dateObj.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Snapshot Content Preview */}
          <div className={`flex-1 flex flex-col overflow-hidden ${previewBg}`}>
            {/* Meta bar */}
            <div
              className={`px-6 py-2.5 border-b ${headerBorder} flex items-center justify-between text-xs opacity-75`}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 opacity-60" />
                  <span>{new Date(currentRecord.timestamp).toLocaleString()}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 opacity-60" />
                  <span>{currentRecord.wordCount} words</span>
                </span>
              </div>

              {selectedIndex === 0 && (
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  Current Document
                </span>
              )}
            </div>

            {/* Document Text */}
            <div className="flex-1 overflow-y-auto px-8 py-6 select-text">
              <div className="max-w-[70ch] mx-auto space-y-4">
                <h1 className="text-2xl font-bold tracking-tight pb-2 border-b border-inherit/10">
                  {currentRecord.title || 'Untitled Document'}
                </h1>
                <div
                  className="prose dark:prose-invert max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: currentRecord.content }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`flex items-center justify-between border-t ${headerBorder} px-6 py-3 bg-inherit`}
        >
          <button
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${btnSecondary}`}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : null}
            <span>{copied ? 'Copied Content' : 'Copy Text'}</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 text-xs rounded-lg transition ${btnSecondary}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRestore}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg transition shadow-sm ${btnPrimary}`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restore This Snapshot</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

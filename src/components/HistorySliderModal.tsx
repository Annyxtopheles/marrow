import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { X, RotateCcw, Calendar, FileText, Check } from 'lucide-react';

interface HistorySliderModalProps {
  noteId: string;
  noteTitle: string;
  onRestore: (content: string, title: string) => void;
  onClose: () => void;
}

export const HistorySliderModal: React.FC<HistorySliderModalProps> = ({
  noteId,
  noteTitle,
  onRestore,
  onClose,
}) => {
  const history = StorageService.getHistory(noteId);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const records = history.length > 0 ? history : [
    {
      id: 'current',
      noteId,
      timestamp: Date.now(),
      content: '<p>Initial draft snapshot...</p>',
      title: noteTitle,
      wordCount: 0,
    },
  ];

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-3xl h-[85vh] rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-200 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
              <span>PureWriter History Machine</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 font-mono">
                {records.length} snapshots
              </span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Scrub through past editing moments to inspect or restore lost ideas.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-900 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Time Scrubber Slider */}
        <div className="bg-neutral-900/60 border-b border-neutral-800/80 px-6 py-4">
          <div className="flex items-center justify-between text-xs font-mono text-neutral-400 mb-2">
            <span className="flex items-center gap-1.5 text-neutral-300">
              <Calendar className="h-3.5 w-3.5 text-neutral-400" />
              {new Date(currentRecord.timestamp).toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5 text-neutral-300">
              <FileText className="h-3.5 w-3.5 text-neutral-400" />
              {currentRecord.wordCount} words
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={records.length - 1}
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(Number(e.target.value))}
            className="w-full accent-white cursor-pointer h-1.5 bg-neutral-800 rounded-lg appearance-none"
          />

          <div className="flex justify-between text-[11px] font-mono text-neutral-500 mt-1.5">
            <span>Most Recent (0)</span>
            <span>Snapshot #{selectedIndex + 1} of {records.length}</span>
            <span>Oldest ({records.length - 1})</span>
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-y-auto p-6 font-serif text-sm leading-relaxed text-neutral-300 select-text bg-black/40">
          <div className="max-w-prose mx-auto">
            <h3 className="text-lg font-bold text-white mb-4 pb-2 border-b border-neutral-800 font-sans">
              {currentRecord.title || 'Untitled'}
            </h3>
            <div
              className="prose prose-invert max-w-none space-y-3"
              dangerouslySetInnerHTML={{ __html: currentRecord.content }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-neutral-800/80 px-6 py-3.5 bg-neutral-950">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-3 py-1.5 rounded-lg border border-neutral-800 hover:bg-neutral-900 transition"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : null}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRestore}
              className="flex items-center gap-1.5 text-xs font-medium text-black bg-white hover:bg-neutral-200 px-4 py-2 rounded-lg transition shadow-sm"
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

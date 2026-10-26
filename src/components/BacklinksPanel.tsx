import React, { useState } from 'react';
import type { Note } from '../types';
import { StorageService } from '../services/storage';
import { Link2, ArrowUpRight, FileText } from 'lucide-react';

interface BacklinksPanelProps {
  activeNote: Note | null;
  allNotes: Note[];
  onSelectNote: (note: Note) => void;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  activeNote,
  allNotes,
  onSelectNote,
}) => {
  const [activeTab, setActiveTab] = useState<'links' | 'graph'>('links');

  if (!activeNote) return null;

  const backlinks = StorageService.findBacklinks(activeNote.title, allNotes);

  const nodes = allNotes.map((n, i) => {
    const angle = (i / allNotes.length) * 2 * Math.PI;
    const radius = 100;
    return {
      ...n,
      x: 140 + radius * Math.cos(angle),
      y: 130 + radius * Math.sin(angle),
      isCurrent: n.id === activeNote.id,
    };
  });

  const edges: { source: typeof nodes[0]; target: typeof nodes[0] }[] = [];
  nodes.forEach((src) => {
    nodes.forEach((tgt) => {
      if (src.id !== tgt.id) {
        if (src.content.toLowerCase().includes(`[[${tgt.title.toLowerCase()}]]`)) {
          edges.push({ source: src, target: tgt });
        }
      }
    });
  });

  return (
    <div className="flex flex-col h-full bg-neutral-950/80 border-l border-neutral-900 text-neutral-300 w-80 text-xs">
      <div className="flex items-center justify-between border-b border-neutral-800/80 px-3 py-2 bg-neutral-950">
        <div className="flex items-center gap-1.5 font-semibold text-white">
          <Link2 className="h-4 w-4 text-neutral-400" />
          <span>Obsidian Knowledge Link</span>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-neutral-800/80 bg-neutral-900/40 text-[11px] font-mono">
        <button
          onClick={() => setActiveTab('links')}
          className={`py-2 text-center transition border-b-2 ${
            activeTab === 'links'
              ? 'border-white text-white font-medium bg-neutral-900/60'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Backlinks ({backlinks.length})
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`py-2 text-center transition border-b-2 ${
            activeTab === 'graph'
              ? 'border-white text-white font-medium bg-neutral-900/60'
              : 'border-transparent text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Graph Visualizer
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'links' ? (
          <div className="space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
              Linked References to "{activeNote.title}"
            </div>

            {backlinks.length === 0 ? (
              <div className="text-neutral-500 text-center py-8 leading-relaxed">
                No notes link to this document yet.
                <br />
                Type <code className="text-neutral-400 font-mono">[[{activeNote.title}]]</code> in any other note to link them!
              </div>
            ) : (
              <div className="space-y-2">
                {backlinks.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => onSelectNote(note)}
                    className="group cursor-pointer p-2.5 rounded-lg border border-neutral-800/80 bg-neutral-900/30 hover:border-neutral-700 hover:bg-neutral-900/70 transition space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-neutral-200 font-medium">
                      <span className="flex items-center gap-1.5 truncate">
                        <FileText className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span className="truncate">{note.title}</span>
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-neutral-500 group-hover:text-white transition shrink-0" />
                    </div>

                    <div className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                      {note.content.replace(/<[^>]+>/g, ' ')}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500">
                      <span>{note.wordCount} words</span>
                      <span>•</span>
                      <span>{StorageService.formatInterval(note.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 flex items-center justify-between">
              <span>Interactive Graph View</span>
              <span className="text-neutral-400">{allNotes.length} nodes</span>
            </div>

            <div className="relative w-full h-[280px] rounded-lg border border-neutral-800 bg-neutral-950/60 overflow-hidden flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 280 260">
                {edges.map((edge, i) => (
                  <line
                    key={i}
                    x1={edge.source.x}
                    y1={edge.source.y}
                    x2={edge.target.x}
                    y2={edge.target.y}
                    stroke="#525252"
                    strokeWidth="1.2"
                    strokeDasharray="2,2"
                    opacity="0.6"
                  />
                ))}

                {nodes.map((node) => (
                  <g
                    key={node.id}
                    onClick={() => onSelectNote(node)}
                    className="cursor-pointer transition-transform hover:scale-125"
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.isCurrent ? 7 : 4.5}
                      fill={node.isCurrent ? '#ffffff' : '#737373'}
                      stroke={node.isCurrent ? '#3b82f6' : '#262626'}
                      strokeWidth="1.5"
                    />
                    <text
                      x={node.x}
                      y={node.y + 13}
                      fontSize="9"
                      fill={node.isCurrent ? '#ffffff' : '#a3a3a3'}
                      textAnchor="middle"
                      className="font-mono select-none"
                    >
                      {node.title.slice(0, 10)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
            <p className="text-[11px] text-neutral-500 text-center">
              Click any node to navigate immediately across your vault.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

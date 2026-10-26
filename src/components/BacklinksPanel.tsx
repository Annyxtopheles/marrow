import React, { useState } from 'react';
import type { Note } from '../types';
import { StorageService } from '../services/storage';
import { Link2, ArrowUpRight, FileText } from 'lucide-react';

interface BacklinksPanelProps {
  activeNote: Note | null;
  allNotes: Note[];
  onSelectNote: (note: Note) => void;
  isLightMode: boolean;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  activeNote,
  allNotes,
  onSelectNote,
  isLightMode,
}) => {
  const [activeTab, setActiveTab] = useState<'links' | 'graph'>('links');

  if (!activeNote) return null;

  const backlinks = StorageService.findBacklinks(activeNote.title, allNotes);

  const nodes = allNotes.map((n, i) => {
    const angle = (i / allNotes.length) * 2 * Math.PI;
    const radius = 95;
    return {
      ...n,
      x: 135 + radius * Math.cos(angle),
      y: 125 + radius * Math.sin(angle),
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

  const border = isLightMode ? 'border-[#e4e0d7]' : 'border-white/[0.06]';
  const panelBg = isLightMode ? 'bg-[#f4f1ea]' : 'bg-[#131416]';
  const activeTabClass = isLightMode
    ? 'border-[#302e2b] text-[#222] font-medium'
    : 'border-white/80 text-[#f0ece4] font-medium';
  const subtext = isLightMode ? 'text-[#857f77]' : 'text-[#84817d]';

  return (
    <div
      className={`flex flex-col h-full ${panelBg} border-l ${border} ${subtext} w-72 text-xs`}
    >
      <div className={`flex items-center justify-between border-b ${border} px-3 py-2.5`}>
        <div className="flex items-center gap-1.5 font-medium text-inherit">
          <Link2 className="h-4 w-4 opacity-70" />
          <span className="font-serif">Obsidian Knowledge Graph</span>
        </div>
      </div>

      <div className={`grid grid-cols-2 border-b ${border} text-[11px] font-mono`}>
        <button
          onClick={() => setActiveTab('links')}
          className={`py-2 text-center transition border-b-2 ${
            activeTab === 'links' ? activeTabClass : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          Backlinks ({backlinks.length})
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`py-2 text-center transition border-b-2 ${
            activeTab === 'graph' ? activeTabClass : 'border-transparent opacity-60 hover:opacity-100'
          }`}
        >
          Graph
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'links' ? (
          <div className="space-y-3">
            <div className="text-[10px] font-mono uppercase tracking-wider opacity-50">
              Linked to "{activeNote.title}"
            </div>

            {backlinks.length === 0 ? (
              <div className="opacity-50 text-center py-8 leading-relaxed">
                No documents link to this entry yet.
                <br />
                Type <code className="opacity-80 font-mono">[[{activeNote.title}]]</code> in any note to connect them.
              </div>
            ) : (
              <div className="space-y-2">
                {backlinks.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => onSelectNote(note)}
                    className={`group cursor-pointer p-2.5 rounded-lg border transition space-y-1.5 ${
                      isLightMode
                        ? 'border-black/[0.06] bg-black/[0.02] hover:bg-black/[0.05]'
                        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span className="flex items-center gap-1.5 truncate">
                        <FileText className="h-3.5 w-3.5 opacity-60 shrink-0" />
                        <span className="truncate">{note.title}</span>
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-40 group-hover:opacity-100 transition shrink-0" />
                    </div>

                    <div className="text-[11px] opacity-70 line-clamp-2 leading-relaxed">
                      {note.content.replace(/<[^>]+>/g, ' ')}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono opacity-50">
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
            <div className="text-[10px] font-mono uppercase tracking-wider opacity-50 flex items-center justify-between">
              <span>Vault Nodes</span>
              <span>{allNotes.length} notes</span>
            </div>

            <div
              className={`relative w-full h-[260px] rounded-lg border overflow-hidden flex items-center justify-center ${
                isLightMode ? 'border-black/[0.08] bg-black/[0.02]' : 'border-white/[0.06] bg-white/[0.02]'
              }`}
            >
              <svg className="w-full h-full" viewBox="0 0 270 250">
                {edges.map((edge, i) => (
                  <line
                    key={i}
                    x1={edge.source.x}
                    y1={edge.source.y}
                    x2={edge.target.x}
                    y2={edge.target.y}
                    stroke={isLightMode ? '#b0aba2' : '#52504b'}
                    strokeWidth="1.2"
                    strokeDasharray="2,2"
                    opacity="0.6"
                  />
                ))}

                {nodes.map((node) => (
                  <g
                    key={node.id}
                    onClick={() => onSelectNote(node)}
                    className="cursor-pointer transition-transform hover:scale-115"
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.isCurrent ? 6 : 4}
                      fill={node.isCurrent ? (isLightMode ? '#444' : '#dedad4') : (isLightMode ? '#999' : '#73706b')}
                      stroke={node.isCurrent ? '#8a7d6e' : 'transparent'}
                      strokeWidth="1.5"
                    />
                    <text
                      x={node.x}
                      y={node.y + 12}
                      fontSize="9"
                      fill={isLightMode ? '#555' : '#a8a5a0'}
                      textAnchor="middle"
                      className="font-mono select-none"
                    >
                      {node.title.slice(0, 10)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
            <p className="text-[11px] opacity-60 text-center">
              Click any node in the graph to jump to that document.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

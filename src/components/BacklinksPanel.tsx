import React, { useState } from 'react';
import type { Note, ThemeMode } from '../types';
import { StorageService } from '../services/storage';
import { Link2, ArrowUpRight, FileText } from 'lucide-react';

interface BacklinksPanelProps {
  activeNote: Note | null;
  allNotes: Note[];
  onSelectNote: (note: Note) => void;
  isLightMode: boolean;
  theme?: ThemeMode;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  activeNote,
  allNotes,
  onSelectNote,
  isLightMode,
  theme,
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

  const border = theme === 'sakura'
    ? 'border-[#e5e7eb]'
    : theme === 'sepia'
    ? 'border-[#e7ddce]'
    : theme === 'dreamscape'
    ? 'border-black/[0.06]'
    : theme === 'nordic'
    ? 'border-sky-500/15'
    : theme === 'evergreen'
    ? 'border-emerald-500/15'
    : isLightMode
    ? 'border-[#e4e0d7]'
    : 'border-white/[0.08]';

  const panelBg = theme === 'sakura'
    ? 'bg-[#fafafc]'
    : theme === 'sepia'
    ? 'bg-[#f5eedd]'
    : theme === 'dreamscape'
    ? 'bg-white/45 backdrop-blur-xl'
    : theme === 'nordic'
    ? 'bg-[#111722]'
    : theme === 'evergreen'
    ? 'bg-[#0f1a14]'
    : isLightMode
    ? 'bg-[#f4f1ea]'
    : 'bg-[#131416]';
  const activeTabClass = isLightMode
    ? 'border-[#302e2b] text-[#1c1a17] font-semibold'
    : 'border-white text-[#f5f2eb] font-semibold';
  const inactiveTabClass = isLightMode
    ? 'border-transparent text-[#706c64] hover:text-[#1c1a17]'
    : 'border-transparent text-neutral-400 hover:text-[#f0ece4]';
  const baseText = isLightMode ? 'text-[#383531]' : 'text-[#c5c1ba]';
  const headerText = isLightMode ? 'text-[#1c1a17]' : 'text-[#f0ece4]';
  const labelText = isLightMode ? 'text-[#706c64]' : 'text-neutral-400';
  const noteTitleText = isLightMode ? 'text-[#1c1a17]' : 'text-[#f0ece4]';
  const excerptText = isLightMode ? 'text-[#55514a]' : 'text-[#aba69e]';
  const metaText = isLightMode ? 'text-[#757068]' : 'text-neutral-400';

  return (
    <div
      className={`flex flex-col h-full ${panelBg} border-l ${border} ${baseText} w-72 text-xs`}
    >
      <div className={`flex items-center justify-between border-b ${border} px-3 py-2.5 ${headerText}`}>
        <div className="flex items-center gap-1.5 font-semibold">
          <Link2 className="h-4 w-4 opacity-80" />
          <span>Knowledge Graph</span>
        </div>
      </div>

      <div className={`grid grid-cols-2 border-b ${border} text-[11px]`}>
        <button
          onClick={() => setActiveTab('links')}
          className={`py-2 text-center transition border-b-2 ${
            activeTab === 'links' ? activeTabClass : inactiveTabClass
          }`}
        >
          Backlinks ({backlinks.length})
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`py-2 text-center transition border-b-2 ${
            activeTab === 'graph' ? activeTabClass : inactiveTabClass
          }`}
        >
          Graph
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'links' ? (
          <div className="space-y-3">
            <div className={`text-[10px] uppercase tracking-wider font-medium ${labelText}`}>
              Linked to "{activeNote.title}"
            </div>

            {backlinks.length === 0 ? (
              <div className={`text-center py-8 leading-relaxed ${labelText}`}>
                No documents link to this entry yet.
                <br />
                Type <code className="opacity-90 font-medium">[[{activeNote.title}]]</code> in any note to connect them.
              </div>
            ) : (
              <div className="space-y-2">
                {backlinks.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => onSelectNote(note)}
                    className={`group cursor-pointer p-2.5 rounded-lg border transition space-y-1.5 ${
                      isLightMode
                        ? 'border-black/[0.08] bg-black/[0.02] hover:bg-black/[0.05]'
                        : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span className="flex items-center gap-1.5 truncate">
                        <FileText className={`h-3.5 w-3.5 shrink-0 ${isLightMode ? 'text-[#555]' : 'text-neutral-300'}`} />
                        <span className={`truncate font-semibold ${noteTitleText}`}>{note.title}</span>
                      </span>
                      <ArrowUpRight className={`h-3.5 w-3.5 transition shrink-0 ${metaText} group-hover:text-inherit`} />
                    </div>

                    <div className={`text-[11px] line-clamp-2 leading-relaxed ${excerptText}`}>
                      {note.content.replace(/<[^>]+>/g, ' ')}
                    </div>

                    <div className={`flex items-center gap-2 text-[10px] ${metaText}`}>
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
            <div className={`text-[10px] uppercase tracking-wider font-medium flex items-center justify-between ${labelText}`}>
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
                    className="cursor-pointer group"
                  >
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.isCurrent ? 6 : 4.5}
                      fill={node.isCurrent ? (isLightMode ? '#333' : '#ede9e2') : (isLightMode ? '#888' : '#787570')}
                      stroke={node.isCurrent ? (isLightMode ? '#000' : '#fff') : 'transparent'}
                      strokeWidth={node.isCurrent ? 1.5 : 1}
                      className="transition-colors group-hover:fill-stone-200"
                    />
                    <text
                      x={node.x}
                      y={node.y + 12}
                      fontSize="9"
                      fill={isLightMode ? '#555' : '#a8a5a0'}
                      textAnchor="middle"
                      className="select-none transition-colors group-hover:fill-stone-100"
                    >
                      {node.title.slice(0, 10)}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
            <p className={`text-[11px] text-center ${labelText}`}>
              Click any node in the graph to jump to that document.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

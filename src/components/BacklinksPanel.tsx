import React, { useState, useMemo, useRef } from 'react';
import type { Note, ThemeMode } from '../types';
import { StorageService } from '../services/storage';
import { THEMES, type ThemeDefinition } from '../services/themes';
import { Link2, ArrowUpRight, FileText, Plus, Minus, RotateCcw } from 'lucide-react';

interface BacklinksPanelProps {
  activeNote: Note | null;
  allNotes: Note[];
  onSelectNote: (note: Note) => void;
  isLightMode: boolean;
  theme?: ThemeMode;
  currentTheme?: ThemeDefinition;
}

interface SimNode {
  id: string;
  note: Note;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isCurrent: boolean;
  degree: number;
}

interface SimEdge {
  sourceId: string;
  targetId: string;
}

const GRAPH_WIDTH = 280;
const GRAPH_HEIGHT = 300;
const CENTER_X = GRAPH_WIDTH / 2;
const CENTER_Y = GRAPH_HEIGHT / 2;

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  activeNote,
  allNotes,
  onSelectNote,
  isLightMode,
  theme,
  currentTheme: propTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'links' | 'graph'>('links');
  const [graphScope, setGraphScope] = useState<'local' | 'vault'>('vault');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Interactive pan, zoom, and custom node position overrides
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [nodeOverrides, setNodeOverrides] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    origX: number;
    origY: number;
    moved: boolean;
  } | null>(null);

  const currentTheme = propTheme || THEMES[theme || 'charcoal'] || THEMES.charcoal;

  const backlinks = useMemo(
    () => (activeNote ? StorageService.findBacklinks(activeNote.title, allNotes) : []),
    [activeNote, allNotes]
  );

  const outgoingLinks = useMemo(() => {
    if (!activeNote) return [];
    const source = `${activeNote.content || ''} ${activeNote.synopsis || ''}`;
    const regex = /\[\[(.*?)\]\]/g;
    const matched = new Map<string, Note>();
    let match: RegExpExecArray | null;
    while ((match = regex.exec(source)) !== null) {
      const targetTitle = match[1].trim().toLowerCase();
      if (!targetTitle) continue;
      const found = allNotes.find(
        (n) => n.id !== activeNote.id && n.title.trim().toLowerCase() === targetTitle
      );
      if (found) matched.set(found.id, found);
    }
    return Array.from(matched.values());
  }, [activeNote, allNotes]);

  // Compute force-directed layout deterministically whenever vault notes or scope change
  const { layoutNodes, layoutEdges, adjacencyMap } = useMemo(() => {
    if (!activeNote) {
      return {
        layoutNodes: [] as SimNode[],
        layoutEdges: [] as SimEdge[],
        adjacencyMap: new Map<string, Set<string>>(),
      };
    }

    // Build all directed/undirected edges across vault
    const rawEdges: SimEdge[] = [];
    const pairSeen = new Set<string>();

    for (const src of allNotes) {
      const srcText = `${src.content || ''} ${src.synopsis || ''}`.toLowerCase();
      for (const tgt of allNotes) {
        if (src.id === tgt.id) continue;
        const tgtTitle = tgt.title.trim().toLowerCase();
        if (!tgtTitle) continue;
        if (srcText.includes(`[[${tgtTitle}]]`)) {
          const pairKey = [src.id, tgt.id].sort().join('::');
          if (!pairSeen.has(pairKey)) {
            pairSeen.add(pairKey);
            rawEdges.push({ sourceId: src.id, targetId: tgt.id });
          }
        }
      }
    }

    // Filter notes by scope ('local' = activeNote + 1-hop neighbors; 'vault' = all notes)
    const connectedIds = new Set<string>([activeNote.id]);
    for (const edge of rawEdges) {
      if (edge.sourceId === activeNote.id) connectedIds.add(edge.targetId);
      if (edge.targetId === activeNote.id) connectedIds.add(edge.sourceId);
    }

    const scopedNotes =
      graphScope === 'local'
        ? allNotes.filter((n) => connectedIds.has(n.id))
        : allNotes;

    const scopedIds = new Set(scopedNotes.map((n) => n.id));
    const scopedEdges = rawEdges.filter(
      (e) => scopedIds.has(e.sourceId) && scopedIds.has(e.targetId)
    );

    const adj = new Map<string, Set<string>>();
    for (const n of scopedNotes) {
      adj.set(n.id, new Set());
    }
    for (const e of scopedEdges) {
      adj.get(e.sourceId)?.add(e.targetId);
      adj.get(e.targetId)?.add(e.sourceId);
    }

    // Initialize positions using golden-angle spiral so simulation is 100% deterministic
    const simNodes: SimNode[] = scopedNotes.map((n, idx) => {
      const isCur = n.id === activeNote.id;
      const goldenAngle = idx * 2.399963229728653;
      const r = isCur ? 0 : 42 + Math.sqrt(idx + 1) * 26;
      return {
        id: n.id,
        note: n,
        x: isCur ? CENTER_X : CENTER_X + r * Math.cos(goldenAngle),
        y: isCur ? CENTER_Y : CENTER_Y + r * Math.sin(goldenAngle),
        vx: 0,
        vy: 0,
        isCurrent: isCur,
        degree: adj.get(n.id)?.size || 0,
      };
    });

    const nodeIndex = new Map<string, SimNode>();
    for (const sn of simNodes) nodeIndex.set(sn.id, sn);

    // Run 85 ticks of velocity-Verlet / damped force-directed layout
    const iterations = 85;
    const repulsionK = 2200;
    const springK = 0.045;
    const idealLength = 68;
    const centerPull = 0.022;

    for (let step = 0; step < iterations; step++) {
      const damping = 0.78 * (1 - step / (iterations * 1.25));

      // 1. Coulomb repulsion between all node pairs
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i];
          const b = simNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = Math.max(64, dx * dx + dy * dy);
          const dist = Math.sqrt(distSq);
          const force = repulsionK / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (!a.isCurrent) {
            a.vx -= fx;
            a.vy -= fy;
          }
          if (!b.isCurrent) {
            b.vx += fx;
            b.vy += fy;
          }
        }
      }

      // 2. Hooke spring attraction along [[Wikilink]] edges
      for (const edge of scopedEdges) {
        const src = nodeIndex.get(edge.sourceId);
        const tgt = nodeIndex.get(edge.targetId);
        if (!src || !tgt) continue;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        const displacement = dist - idealLength;
        const force = springK * displacement;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (!src.isCurrent) {
          src.vx += fx;
          src.vy += fy;
        }
        if (!tgt.isCurrent) {
          tgt.vx -= fx;
          tgt.vy -= fy;
        }
      }

      // 3. Gentle center gravity + position integration with soft viewport padding
      for (const node of simNodes) {
        if (node.isCurrent) {
          node.x = CENTER_X;
          node.y = CENTER_Y;
          continue;
        }
        node.vx += (CENTER_X - node.x) * centerPull;
        node.vy += (CENTER_Y - node.y) * centerPull;

        node.vx *= damping;
        node.vy *= damping;

        node.x = Math.max(28, Math.min(GRAPH_WIDTH - 28, node.x + node.vx));
        node.y = Math.max(24, Math.min(GRAPH_HEIGHT - 28, node.y + node.vy));
      }
    }

    return {
      layoutNodes: simNodes,
      layoutEdges: scopedEdges,
      adjacencyMap: adj,
    };
  }, [activeNote, allNotes, graphScope]);

  if (!activeNote) return null;

  // Apply interactive user drag overrides on top of settled simulation positions
  const nodes = layoutNodes.map((n) => {
    const override = nodeOverrides[n.id];
    return override ? { ...n, x: override.x, y: override.y } : n;
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const handleNodePointerDown = (e: React.PointerEvent<SVGGElement>, node: SimNode) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingNodeId(node.id);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      origX: node.x,
      origY: node.y,
      moved: false,
    };
  };

  const handleNodePointerMove = (e: React.PointerEvent<SVGGElement>, node: SimNode) => {
    if (draggingNodeId !== node.id || !dragStartRef.current) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;

    const dxScreen = e.clientX - dragStartRef.current.clientX;
    const dyScreen = e.clientY - dragStartRef.current.clientY;
    if (Math.hypot(dxScreen, dyScreen) >= 4) {
      dragStartRef.current.moved = true;
    }

    const svgEl = svgRef.current;
    const scaleX = svgEl ? GRAPH_WIDTH / (svgEl.clientWidth || GRAPH_WIDTH) : 1;
    const scaleY = svgEl ? GRAPH_HEIGHT / (svgEl.clientHeight || GRAPH_HEIGHT) : 1;

    const nextX = Math.max(
      18,
      Math.min(GRAPH_WIDTH - 18, dragStartRef.current.origX + (dxScreen * scaleX) / zoom)
    );
    const nextY = Math.max(
      18,
      Math.min(GRAPH_HEIGHT - 22, dragStartRef.current.origY + (dyScreen * scaleY) / zoom)
    );

    setNodeOverrides((prev) => ({
      ...prev,
      [node.id]: { x: nextX, y: nextY },
    }));
  };

  const handleNodePointerUp = (e: React.PointerEvent<SVGGElement>, node: SimNode) => {
    if (draggingNodeId !== node.id) return;
    const wasMoved = dragStartRef.current?.moved ?? false;
    setDraggingNodeId(null);
    dragStartRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (!wasMoved) {
      onSelectNote(node.note);
    }
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanning(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      origX: pan.x,
      origY: pan.y,
      moved: false,
    };
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning || !dragStartRef.current) return;
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    setPan({
      x: Math.max(-140, Math.min(140, dragStartRef.current.origX + dx)),
      y: Math.max(-140, Math.min(140, dragStartRef.current.origY + dy)),
    });
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning) return;
    setIsPanning(false);
    dragStartRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.12 : -0.12;
    setZoom((z) => Math.max(0.6, Math.min(2.2, Number((z + delta).toFixed(2)))));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setNodeOverrides({});
  };

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
    : theme === 'grunge'
    ? 'border-white/[0.12]'
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
    : theme === 'grunge'
    ? 'bg-[#0d0d0f]'
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

  const totalConnections = backlinks.length + outgoingLinks.length;

  return (
    <div
      className={`flex flex-col h-full ${panelBg} border-l ${border} ${baseText} w-72 text-xs`}
    >
      <div className={`flex items-center justify-between border-b ${border} px-3 py-2.5 ${headerText}`}>
        <div className="flex items-center gap-1.5 font-semibold">
          <Link2 className="h-4 w-4 opacity-80" />
          <span>Knowledge Graph</span>
        </div>
        <span className={`text-[10px] tabular-nums ${labelText}`}>
          {allNotes.length} entries
        </span>
      </div>

      <div className={`grid grid-cols-2 border-b ${border} text-[11px]`}>
        <button
          onClick={() => setActiveTab('links')}
          className={`py-2 text-center transition border-b-2 tabular-nums ${
            activeTab === 'links' ? activeTabClass : inactiveTabClass
          }`}
        >
          Connections ({totalConnections})
        </button>
        <button
          onClick={() => setActiveTab('graph')}
          className={`py-2 text-center transition border-b-2 ${
            activeTab === 'graph' ? activeTabClass : inactiveTabClass
          }`}
        >
          Force Graph
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTab === 'links' ? (
          <div className="space-y-4">
            {/* Incoming Backlinks */}
            <div className="space-y-2">
              <div className={`text-[10px] uppercase tracking-wider font-medium flex items-center justify-between ${labelText}`}>
                <span>Incoming Backlinks</span>
                <span className="tabular-nums">{backlinks.length}</span>
              </div>

              {backlinks.length === 0 ? (
                <div className={`text-center py-5 px-2 rounded-lg border leading-relaxed ${
                  isLightMode ? 'border-black/[0.06] bg-black/[0.015]' : 'border-white/[0.06] bg-white/[0.015]'
                } ${labelText}`}>
                  No documents reference this entry yet.
                  <br />
                  Write <span className="font-medium opacity-90">[[{activeNote.title}]]</span> in any note to link here.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {backlinks.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => onSelectNote(note)}
                      className={`group cursor-pointer p-2.5 rounded-lg border transition space-y-1 ${
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

                      <div className={`flex items-center gap-2 text-[10px] tabular-nums ${metaText}`}>
                        <span>{note.wordCount} words</span>
                        <span>•</span>
                        <span>{StorageService.formatInterval(note.updatedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Outgoing Wikilinks */}
            {outgoingLinks.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className={`text-[10px] uppercase tracking-wider font-medium flex items-center justify-between ${labelText}`}>
                  <span>Outgoing References</span>
                  <span className="tabular-nums">{outgoingLinks.length}</span>
                </div>
                <div className="space-y-1.5">
                  {outgoingLinks.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => onSelectNote(note)}
                      className={`group cursor-pointer p-2 rounded-lg border transition flex items-center justify-between ${
                        isLightMode
                          ? 'border-black/[0.08] bg-black/[0.02] hover:bg-black/[0.05]'
                          : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className={`truncate font-semibold ${noteTitleText}`}>{note.title}</div>
                        <div className={`text-[10px] tabular-nums ${metaText}`}>
                          {note.wordCount} words
                        </div>
                      </div>
                      <ArrowUpRight className={`h-3.5 w-3.5 shrink-0 ${metaText} group-hover:text-inherit`} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Scope Toggle: Local (1-hop) vs Full Vault */}
            <div className="flex items-center justify-between gap-2">
              <div
                className={`inline-flex rounded-md p-0.5 border text-[10px] ${
                  isLightMode
                    ? 'bg-black/[0.03] border-black/[0.08]'
                    : 'bg-white/[0.03] border-white/[0.08]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setGraphScope('local')}
                  className={`px-2 py-0.5 rounded transition ${
                    graphScope === 'local'
                      ? isLightMode
                        ? 'bg-white text-[#1c1a17] font-semibold shadow-2xs'
                        : 'bg-white/[0.12] text-white font-semibold'
                      : 'opacity-65 hover:opacity-100'
                  }`}
                >
                  Local (1-hop)
                </button>
                <button
                  type="button"
                  onClick={() => setGraphScope('vault')}
                  className={`px-2 py-0.5 rounded transition ${
                    graphScope === 'vault'
                      ? isLightMode
                        ? 'bg-white text-[#1c1a17] font-semibold shadow-2xs'
                        : 'bg-white/[0.12] text-white font-semibold'
                      : 'opacity-65 hover:opacity-100'
                  }`}
                >
                  Full Vault
                </button>
              </div>

              <span className={`text-[10px] tabular-nums ${labelText}`}>
                {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'} · {layoutEdges.length}{' '}
                {layoutEdges.length === 1 ? 'link' : 'links'}
              </span>
            </div>

            {/* Interactive Force-Directed SVG Canvas */}
            <div
              onWheel={handleWheelZoom}
              className={`relative w-full h-[300px] rounded-lg border overflow-hidden flex items-center justify-center ${
                isLightMode ? 'border-black/[0.08] bg-black/[0.02]' : 'border-white/[0.07] bg-white/[0.02]'
              }`}
            >
              <svg
                ref={svgRef}
                viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                onLostPointerCapture={() => {
                  setIsPanning(false);
                  setDraggingNodeId(null);
                  dragStartRef.current = null;
                }}
                className={`w-full h-full select-none ${
                  isPanning ? 'cursor-grabbing' : 'cursor-grab'
                }`}
                style={{
                  touchAction: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                }}
              >
                <g
                  transform={`translate(${CENTER_X + pan.x}, ${CENTER_Y + pan.y}) scale(${zoom}) translate(${-CENTER_X}, ${-CENTER_Y})`}
                >
                  {/* Edges */}
                  {layoutEdges.map((edge) => {
                    const src = nodeById.get(edge.sourceId);
                    const tgt = nodeById.get(edge.targetId);
                    if (!src || !tgt) return null;

                    const isHighlighted =
                      hoveredNodeId !== null
                        ? edge.sourceId === hoveredNodeId || edge.targetId === hoveredNodeId
                        : src.isCurrent || tgt.isCurrent;

                    const isDimmed =
                      hoveredNodeId !== null &&
                      edge.sourceId !== hoveredNodeId &&
                      edge.targetId !== hoveredNodeId;

                    return (
                      <line
                        key={`${edge.sourceId}-${edge.targetId}`}
                        x1={src.x}
                        y1={src.y}
                        x2={tgt.x}
                        y2={tgt.y}
                        stroke={
                          isHighlighted
                            ? currentTheme.tokens.accentColor
                            : isLightMode
                            ? '#a8a29e'
                            : '#57534e'
                        }
                        strokeWidth={isHighlighted ? 1.5 : 1.1}
                        strokeDasharray={isHighlighted ? undefined : '2.5,2.5'}
                        opacity={isDimmed ? 0.18 : isHighlighted ? 0.85 : 0.45}
                        className="transition-opacity duration-150"
                      />
                    );
                  })}

                  {/* Nodes */}
                  {nodes.map((node) => {
                    const isHovered = hoveredNodeId === node.id;
                    const isNeighborOfHovered =
                      hoveredNodeId !== null &&
                      (adjacencyMap.get(hoveredNodeId)?.has(node.id) ?? false);
                    const isDimmed =
                      hoveredNodeId !== null && !isHovered && !isNeighborOfHovered;

                    const radius = node.isCurrent
                      ? 6.5
                      : Math.min(6, 4 + Math.min(2, node.degree * 0.45));

                    return (
                      <g
                        key={node.id}
                        onPointerDown={(e) => handleNodePointerDown(e, node)}
                        onPointerMove={(e) => handleNodePointerMove(e, node)}
                        onPointerUp={(e) => handleNodePointerUp(e, node)}
                        onLostPointerCapture={() => {
                          if (draggingNodeId === node.id) {
                            setDraggingNodeId(null);
                            dragStartRef.current = null;
                          }
                        }}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                        className={
                          draggingNodeId === node.id ? 'cursor-grabbing' : 'cursor-pointer'
                        }
                        style={{
                          touchAction: 'none',
                          WebkitUserSelect: 'none',
                          userSelect: 'none',
                          opacity: isDimmed ? 0.25 : 1,
                          transition: draggingNodeId === node.id ? 'none' : 'opacity 150ms ease',
                        }}
                      >
                        {/* Subtle outer halo for active document */}
                        {node.isCurrent && (
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={radius + 4}
                            fill={currentTheme.tokens.accentColor}
                            opacity={0.18}
                          />
                        )}

                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={radius}
                          fill={
                            node.isCurrent || isHovered
                              ? currentTheme.tokens.accentColor
                              : isLightMode
                              ? '#6b665e'
                              : '#8c877e'
                          }
                          stroke={
                            node.isCurrent
                              ? isLightMode
                                ? '#ffffff'
                                : '#131416'
                              : 'transparent'
                          }
                          strokeWidth={node.isCurrent ? 1.5 : 0}
                        />

                        <text
                          x={node.x}
                          y={node.y + radius + 10}
                          fontSize="8.5"
                          fontWeight={node.isCurrent || isHovered ? '600' : '400'}
                          fill={
                            node.isCurrent || isHovered
                              ? isLightMode
                                ? '#1c1a17'
                                : '#f5f2eb'
                              : isLightMode
                              ? '#57534e'
                              : '#a8a29e'
                          }
                          textAnchor="middle"
                          className="select-none pointer-events-none"
                        >
                          {node.note.title.length > 16
                            ? `${node.note.title.slice(0, 15)}…`
                            : node.note.title}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Floating Zoom & Reset Controls */}
              <div
                className={`absolute bottom-2 right-2 flex items-center gap-0.5 rounded-md border p-0.5 backdrop-blur-md ${
                  isLightMode
                    ? 'bg-white/80 border-black/[0.08] text-[#383531]'
                    : 'bg-[#18191c]/80 border-white/[0.08] text-[#c5c1ba]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
                  className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition"
                  title="Zoom Out"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="px-1 text-[10px] tabular-nums opacity-70">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(2.2, Number((z + 0.15).toFixed(2))))}
                  className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition"
                  title="Zoom In"
                >
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition"
                  title="Reset Graph Layout & Zoom"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            </div>

            <p className={`text-[11px] text-center leading-relaxed ${labelText}`}>
              Drag nodes to rearrange, scroll to zoom, or click any node to open that document.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

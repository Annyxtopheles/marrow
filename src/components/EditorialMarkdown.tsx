import React from 'react';

interface EditorialMarkdownProps {
  content: string;
  isLightMode: boolean;
}

/**
 * Parses inline formatting: **bold**, *italic*, `code`, and [[wikilinks]]
 */
function parseInline(text: string): React.ReactNode[] {
  // Regex splitting by bold, italic, and inline code
  const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-inherit">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      return (
        <em key={i} className="italic opacity-95">
          {token.slice(1, -1)}
        </em>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={i}
          className="px-1 py-0.5 rounded text-[10px] font-mono bg-black/[0.06] dark:bg-white/[0.08]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return token;
  });
}

export const EditorialMarkdown: React.FC<EditorialMarkdownProps> = ({ content, isLightMode }) => {
  if (!content) return null;

  // Split into paragraphs / structural blocks
  const rawBlocks = content.split(/\n{2,}/);

  return (
    <div
      className={`space-y-2 text-xs leading-relaxed text-left ${
        isLightMode ? 'text-[#1c1a17]' : 'text-[#dedad4]'
      }`}
    >
      {rawBlocks.map((block, blockIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        // Horizontal rule
        if (/^[-*_]{3,}$/.test(trimmed)) {
          return (
            <hr
              key={blockIdx}
              className="my-3 border-t border-black/[0.08] dark:border-white/[0.08]"
            />
          );
        }

        // Headers: #, ##, ###
        if (trimmed.startsWith('#')) {
          const match = trimmed.match(/^(#{1,3})\s+(.*)$/);
          if (match) {
            const level = match[1].length;
            const headingText = match[2];
            const sizeClass =
              level === 1
                ? 'text-sm font-semibold tracking-tight mt-3 mb-1'
                : level === 2
                ? 'text-xs font-semibold tracking-tight mt-2.5 mb-1'
                : 'text-[11px] font-semibold uppercase tracking-wider mt-2 mb-0.5 opacity-80';

            return (
              <div
                key={blockIdx}
                className={`${sizeClass} pb-0.5 border-b border-black/[0.06] dark:border-white/[0.06]`}
              >
                {parseInline(headingText)}
              </div>
            );
          }
        }

        // Blockquotes
        if (trimmed.startsWith('>')) {
          const quoteLines = trimmed
            .split('\n')
            .map((l) => l.replace(/^>\s?/, ''))
            .join(' ');
          return (
            <div
              key={blockIdx}
              className="pl-2.5 border-l-2 border-black/20 dark:border-white/20 italic opacity-90 my-1.5"
            >
              {parseInline(quoteLines)}
            </div>
          );
        }

        // Check if block consists of lines (lists, steps, etc.)
        const lines = trimmed.split('\n');

        // Numbered list item block (e.g. "1. **Title:** text")
        const isNumbered = lines.some((l) => /^\d+[.)]\s+/.test(l.trim()));
        const isBullet = lines.some((l) => /^[-*•]\s+/.test(l.trim()));

        if (isNumbered || isBullet) {
          return (
            <div key={blockIdx} className="space-y-1.5 my-1">
              {lines.map((line, lineIdx) => {
                const numMatch = line.trim().match(/^(\d+[.)])\s+(.*)$/);
                const bulletMatch = line.trim().match(/^[-*•]\s+(.*)$/);

                if (numMatch) {
                  return (
                    <div key={lineIdx} className="flex items-start gap-1.5">
                      <span className="font-mono text-[10px] opacity-60 shrink-0 mt-0.5">
                        {numMatch[1]}
                      </span>
                      <div className="flex-1">{parseInline(numMatch[2])}</div>
                    </div>
                  );
                }

                if (bulletMatch) {
                  return (
                    <div key={lineIdx} className="flex items-start gap-1.5">
                      <span className="opacity-50 shrink-0 mt-1 text-[8px]">•</span>
                      <div className="flex-1">{parseInline(bulletMatch[1])}</div>
                    </div>
                  );
                }

                return (
                  <div key={lineIdx}>
                    {parseInline(line)}
                  </div>
                );
              })}
            </div>
          );
        }

        // Normal paragraph
        return (
          <p key={blockIdx} className="leading-relaxed">
            {lines.map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {parseInline(line)}
                {lIdx < lines.length - 1 && <br />}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};

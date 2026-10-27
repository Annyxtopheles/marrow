import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

export interface ContextMenuSubItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  submenu?: ContextMenuSubItem[];
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  isLightMode: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  items,
  onClose,
  isLightMode,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [hoveredSubmenuIndex, setHoveredSubmenuIndex] = useState<number | null>(null);

  // Clamp within viewport
  const menuWidth = 190;
  const menuHeight = items.length * 32 + 20;
  const clampedX = Math.max(10, Math.min(x, window.innerWidth - menuWidth - 10));
  const clampedY = Math.max(10, Math.min(y, window.innerHeight - menuHeight - 10));
  const showSubmenuOnLeft = clampedX + menuWidth + 170 > window.innerWidth;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleScroll = () => {
      onClose();
    };

    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onClose]);

  const menuBg = isLightMode
    ? 'bg-[#ffffff]/98 border-[#e4e0d7] text-[#2c2a27] shadow-xl shadow-black/10'
    : 'bg-[#18191c]/98 border-white/[0.08] text-[#dedad4] shadow-2xl shadow-black/60';

  const hoverBg = isLightMode ? 'hover:bg-black/[0.05]' : 'hover:bg-white/[0.06]';
  const separatorBorder = isLightMode ? 'border-black/[0.06]' : 'border-white/[0.06]';

  return (
    <div
      ref={menuRef}
      className={`fixed z-50 rounded-lg border p-1 text-xs select-none backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 ${menuBg}`}
      style={{ left: clampedX, top: clampedY, minWidth: `${menuWidth}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="space-y-0.5">
        {items.map((item, idx) => {
          if (item.separator) {
            return <div key={`sep-${idx}`} className={`my-1 border-t ${separatorBorder}`} />;
          }

          const hasSubmenu = Boolean(item.submenu && item.submenu.length > 0);
          const isSubmenuOpen = hoveredSubmenuIndex === idx;

          return (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => hasSubmenu && setHoveredSubmenuIndex(idx)}
              onMouseLeave={() => hasSubmenu && setHoveredSubmenuIndex(null)}
            >
              <button
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  if (item.onClick) {
                    item.onClick();
                    onClose();
                  }
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition text-left ${
                  item.danger
                    ? 'text-rose-500 hover:bg-rose-500/10'
                    : item.disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : hoverBg
                } ${isSubmenuOpen ? (isLightMode ? 'bg-black/[0.05]' : 'bg-white/[0.06]') : ''}`}
              >
                <div className="flex items-center gap-2 truncate">
                  {item.icon && <span className="opacity-70 shrink-0">{item.icon}</span>}
                  <span className="truncate">{item.label}</span>
                </div>
                {hasSubmenu && <ChevronRight className="h-3 w-3 opacity-40 ml-2 shrink-0" />}
              </button>

              {/* Submenu */}
              {hasSubmenu && isSubmenuOpen && item.submenu && (
                <div
                  className={`absolute top-0 z-50 rounded-lg border p-1 text-xs backdrop-blur-md shadow-xl ${menuBg} ${
                    showSubmenuOnLeft ? 'right-full mr-1' : 'left-full ml-1'
                  }`}
                  style={{ minWidth: '160px', maxHeight: '240px', overflowY: 'auto' }}
                >
                  <div className="space-y-0.5">
                    {item.submenu.map((sub) => (
                      <button
                        key={sub.label}
                        type="button"
                        onClick={() => {
                          sub.onClick();
                          onClose();
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md transition text-left ${hoverBg} ${
                          sub.active ? 'font-medium opacity-100' : 'opacity-80'
                        }`}
                      >
                        {sub.icon && <span className="opacity-70 shrink-0">{sub.icon}</span>}
                        <span className="truncate">{sub.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

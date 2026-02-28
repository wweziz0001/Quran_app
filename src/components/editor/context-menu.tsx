'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  action: () => void;
  divider?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const adjustedX = rect.right > window.innerWidth ? x - rect.width : x;
      const adjustedY = rect.bottom > window.innerHeight ? y - rect.height : y;
      
      if (adjustedX !== x || adjustedY !== y) {
        ref.current.style.left = `${adjustedX}px`;
        ref.current.style.top = `${adjustedY}px`;
      }
    }
  }, [x, y]);

  return (
    <div
      ref={ref}
      className={cn(
        "fixed z-[100] min-w-[180px] py-1 rounded-lg shadow-xl border",
        "bg-popover border-border text-popover-foreground text-sm"
      )}
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {item.divider && (
            <div className="my-1 h-px bg-border" />
          )}
          <button
            className={cn(
              "w-full px-3 py-1.5 flex items-center justify-between text-left transition-colors",
              item.disabled 
                ? "opacity-40 cursor-default" 
                : item.danger
                  ? "hover:bg-destructive/10 text-destructive"
                  : "hover:bg-accent"
            )}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
            disabled={item.disabled}
          >
            <span className="flex items-center gap-2">
              {item.icon && (
                <span className="w-4 h-4 flex items-center justify-center">
                  {item.icon}
                </span>
              )}
              {item.label}
            </span>
            {item.shortcut && (
              <span className="ml-8 text-xs text-muted-foreground">
                {item.shortcut}
              </span>
            )}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

export default ContextMenu;

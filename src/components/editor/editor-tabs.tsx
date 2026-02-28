'use client';

import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

export interface EditorTab {
  id: string;
  name: string;
  path: string;
  extension?: string;
  isModified: boolean;
  isActive: boolean;
}

interface EditorTabsProps {
  tabs: EditorTab[];
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabDrag?: (dragIndex: number, dropIndex: number) => void;
}

// File icon colors based on extension
const getFileIconColor = (extension?: string): string => {
  const ext = extension?.toLowerCase() || '';
  
  if (['.ts', '.tsx'].includes(ext)) return 'text-blue-500';
  if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) return 'text-yellow-500';
  if (['.json'].includes(ext)) return 'text-amber-500';
  if (['.css', '.scss', '.sass', '.less'].includes(ext)) return 'text-pink-500';
  if (['.html', '.htm'].includes(ext)) return 'text-orange-500';
  if (['.md', '.mdx'].includes(ext)) return 'text-gray-500';
  if (['.prisma'].includes(ext)) return 'text-purple-500';
  if (['.yaml', '.yml'].includes(ext)) return 'text-green-500';
  if (['.py'].includes(ext)) return 'text-green-400';
  if (['.kt', '.kts', '.java'].includes(ext)) return 'text-red-400';
  
  return 'text-muted-foreground';
};

export function EditorTabs({
  tabs,
  onTabClick,
  onTabClose,
}: EditorTabsProps) {
  const activeTabRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [tabs.find(t => t.isActive)?.id]);

  return (
    <div className="flex items-center h-9 bg-muted/30 border-b">
      <ScrollArea className="flex-1 h-full">
        <div className="flex items-center h-full">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              ref={tab.isActive ? activeTabRef : undefined}
              className={cn(
                "group flex items-center gap-2 h-full px-3 border-r cursor-pointer transition-colors min-w-0",
                tab.isActive
                  ? "bg-background border-b-2 border-b-primary"
                  : "hover:bg-accent/50"
              )}
              onClick={() => onTabClick(tab.id)}
            >
              {/* Modified indicator or file icon */}
              {tab.isModified ? (
                <Circle className={cn("h-2 w-2 fill-amber-500 text-amber-500 flex-shrink-0")} />
              ) : (
                <div
                  className={cn(
                    "w-2 h-2 rounded-sm flex-shrink-0",
                    getFileIconColor(tab.extension).replace('text-', 'bg-')
                  )}
                />
              )}
              
              <span className={cn(
                "truncate text-sm max-w-[120px]",
                tab.isActive ? "font-medium" : "text-muted-foreground"
              )}>
                {tab.name}
              </span>
              
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-5 w-5 rounded-sm flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
                  tab.isActive && "opacity-100"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>
      
      {/* Tabs count */}
      {tabs.length > 1 && (
        <div className="px-2 text-xs text-muted-foreground border-l">
          {tabs.length} files
        </div>
      )}
    </div>
  );
}

export default EditorTabs;

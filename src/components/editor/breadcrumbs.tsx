'use client';

import { ChevronRight, Home, Folder, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface BreadcrumbItem {
  name: string;
  path: string;
  type: 'folder' | 'file';
  siblings?: BreadcrumbItem[];
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onItemClick?: (item: BreadcrumbItem) => void;
  showHome?: boolean;
  maxVisible?: number;
}

export function Breadcrumbs({
  items,
  onItemClick,
  showHome = true,
  maxVisible = 5,
}: BreadcrumbsProps) {
  // If we have many items, collapse the middle ones
  const shouldCollapse = items.length > maxVisible;
  const visibleItems = shouldCollapse
    ? [items[0], ...items.slice(-maxVisible + 1)]
    : items;

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 text-sm bg-muted/30 border-b overflow-x-auto">
      {showHome && (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1.5"
            onClick={() => onItemClick?.({ name: '', path: '', type: 'folder' })}
          >
            <Home className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          {items.length > 0 && (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </>
      )}

      {visibleItems.map((item, index) => {
        const isLast = index === visibleItems.length - 1;
        const Icon = item.type === 'folder' ? Folder : FileCode;

        // Show collapsed indicator for middle items
        if (shouldCollapse && index === 1 && items.length > maxVisible) {
          const hiddenItems = items.slice(1, -maxVisible + 2);
          
          return (
            <div key="collapsed" className="flex items-center gap-0.5">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-muted-foreground hover:text-foreground"
                  >
                    •••
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {hiddenItems.map((hiddenItem) => (
                    <DropdownMenuItem
                      key={hiddenItem.path}
                      onClick={() => onItemClick?.(hiddenItem)}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {hiddenItem.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          );
        }

        return (
          <div key={item.path} className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-1.5 gap-1",
                isLast && "text-foreground font-medium",
                !isLast && "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => !isLast && onItemClick?.(item)}
              disabled={isLast}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="truncate max-w-[120px]">{item.name}</span>
            </Button>
            {!isLast && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Breadcrumbs;

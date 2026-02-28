'use client';

// Activity Bar Component - VS Code style

import { Button } from '@/components/ui/button';
import { 
  Files, Search, GitBranch, Bug, Puzzle, 
  Settings, User, Bell, 
  type LucideIcon 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ActivityBarItem = {
  id: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  active?: boolean;
};

interface ActivityBarProps {
  items?: ActivityBarItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  onSettingsClick?: () => void;
  onAccountClick?: () => void;
}

const defaultItems: ActivityBarItem[] = [
  { id: 'explorer', icon: Files, label: 'Explorer', active: true },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'git', icon: GitBranch, label: 'Source Control', badge: 3 },
  { id: 'debug', icon: Bug, label: 'Run and Debug' },
  { id: 'extensions', icon: Puzzle, label: 'Extensions' },
];

export function ActivityBar({
  items = defaultItems,
  activeItem,
  onItemClick,
  onSettingsClick,
  onAccountClick,
}: ActivityBarProps) {
  return (
    <div className="w-12 flex flex-col items-center justify-between py-2 bg-muted/50 border-r">
      {/* Top icons */}
      <div className="flex flex-col items-center gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="icon"
              className={cn(
                "w-10 h-10 relative rounded-lg transition-all",
                isActive && "bg-accent text-primary"
              )}
              onClick={() => onItemClick(item.id)}
              title={item.label}
            >
              <Icon className="h-5 w-5" />
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-primary text-primary-foreground text-[10px] font-medium rounded-full flex items-center justify-center px-1">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              )}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r" />
              )}
            </Button>
          );
        })}
      </div>

      {/* Bottom icons */}
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-lg"
          onClick={onAccountClick}
          title="Account"
        >
          <User className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 rounded-lg"
          onClick={onSettingsClick}
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

export default ActivityBar;

'use client';

import { 
  GitBranch, AlertCircle, AlertTriangle, Bell, 
  Wifi, WifiOff, CheckCircle2, Loader2,
  Globe, Lock, Unlock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface StatusBarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  type?: 'info' | 'warning' | 'error' | 'success' | 'loading';
  onClick?: () => void;
}

interface StatusBarProps {
  items?: StatusBarItem[];
  // Left side items
  branch?: string;
  errors?: number;
  warnings?: number;
  // Right side items
  line?: number;
  column?: number;
  selectedLines?: number;
  language?: string;
  encoding?: string;
  lineEnding?: 'LF' | 'CRLF';
  fileSize?: string;
  lastModified?: string;
  isConnected?: boolean;
  isReadOnly?: boolean;
  // Actions
  onBranchClick?: () => void;
  onErrorsClick?: () => void;
  onWarningsClick?: () => void;
  onNotificationClick?: () => void;
}

export function StatusBar({
  branch = 'main',
  errors = 0,
  warnings = 0,
  line = 1,
  column = 1,
  selectedLines,
  language = 'Plain Text',
  encoding = 'UTF-8',
  lineEnding = 'LF',
  fileSize,
  lastModified,
  isConnected = true,
  isReadOnly = false,
  onBranchClick,
  onErrorsClick,
  onWarningsClick,
  onNotificationClick,
}: StatusBarProps) {
  return (
    <div className="h-6 bg-primary text-primary-foreground flex items-center justify-between px-2 text-xs">
      {/* Left side */}
      <div className="flex items-center gap-1">
        {/* Git branch */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 gap-1 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={onBranchClick}
              >
                <GitBranch className="h-3 w-3" />
                <span>{branch}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Source Control: {branch}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Errors and Warnings */}
        {(errors > 0 || warnings > 0) && (
          <div className="flex items-center gap-0.5">
            {errors > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 gap-1 text-red-300 hover:bg-primary-foreground/10"
                      onClick={onErrorsClick}
                    >
                      <AlertCircle className="h-3 w-3" />
                      <span>{errors}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{errors} Error{errors !== 1 ? 's' : ''}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {warnings > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 gap-1 text-yellow-300 hover:bg-primary-foreground/10"
                      onClick={onWarningsClick}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      <span>{warnings}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{warnings} Warning{warnings !== 1 ? 's' : ''}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Connection status */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center px-1.5">
                {isConnected ? (
                  <Wifi className="h-3 w-3 text-green-300" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-300" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{isConnected ? 'Connected' : 'Disconnected'}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {/* File info */}
        {isReadOnly && (
          <div className="flex items-center px-1.5">
            <Lock className="h-3 w-3" />
          </div>
        )}
        
        {/* Cursor position */}
        <div className="flex items-center px-1.5 gap-1">
          <span>Ln {line}</span>
          <span>Col {column}</span>
          {selectedLines !== undefined && selectedLines > 0 && (
            <span className="text-primary-foreground/70">
              ({selectedLines} selected)
            </span>
          )}
        </div>

        {/* Separator */}
        <div className="w-px h-3 bg-primary-foreground/20" />

        {/* File size */}
        {fileSize && (
          <div className="px-1.5">
            {fileSize}
          </div>
        )}

        {/* Separator */}
        <div className="w-px h-3 bg-primary-foreground/20" />

        {/* Encoding */}
        <div className="px-1.5">
          {encoding}
        </div>

        {/* Separator */}
        <div className="w-px h-3 bg-primary-foreground/20" />

        {/* Line ending */}
        <div className="px-1.5">
          {lineEnding}
        </div>

        {/* Separator */}
        <div className="w-px h-3 bg-primary-foreground/20" />

        {/* Language */}
        <div className="px-1.5">
          {language}
        </div>

        {/* Notification bell */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-primary-foreground hover:bg-primary-foreground/10"
                onClick={onNotificationClick}
              >
                <Bell className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Notifications</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export default StatusBar;

import React from 'react';
import { cn } from '../../lib/utils';
import { Trash2, Send, Archive, X } from 'lucide-react';
import { Button } from '../ui/button';

interface BatchActionsProps {
  selectedCount: number;
  onPublish?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onClearSelection: () => void;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
}

export const BatchActions: React.FC<BatchActionsProps> = ({
  selectedCount,
  onPublish,
  onArchive,
  onDelete,
  onClearSelection,
  isDarkTheme,
  uiLanguage,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-30",
      "animate-in slide-in-from-bottom-4 duration-300"
    )}>
      <div className={cn(
        "flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl backdrop-blur-sm",
        isDarkTheme
          ? "bg-zinc-900/95 border-zinc-800"
          : "bg-white/95 border-gray-200"
      )}>
        {/* Selection Count */}
        <div className="flex items-center gap-2">
          <div className={cn(
            "px-3 py-1.5 rounded-lg font-bold text-sm",
            isDarkTheme
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-emerald-50 text-emerald-600"
          )}>
            {selectedCount}
          </div>
          <span className={cn(
            "text-sm font-medium",
            isDarkTheme ? "text-zinc-400" : "text-gray-600"
          )}>
            {uiLanguage === 'zh' ? '项已选' : 'selected'}
          </span>
        </div>

        {/* Divider */}
        <div className={cn(
          "w-px h-8",
          isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
        )} />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onPublish && (
            <Button
              size="sm"
              onClick={onPublish}
              className={cn(
                "font-bold",
                isDarkTheme
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              <Send className="w-3.5 h-3.5 mr-2" />
              {uiLanguage === 'zh' ? '批量发布' : 'Publish'}
            </Button>
          )}

          {onArchive && (
            <Button
              size="sm"
              variant="outline"
              onClick={onArchive}
              className={cn(
                "font-bold",
                isDarkTheme
                  ? "border-zinc-700 hover:bg-zinc-800 text-zinc-300"
                  : "border-gray-300 hover:bg-gray-50 text-gray-700"
              )}
            >
              <Archive className="w-3.5 h-3.5 mr-2" />
              {uiLanguage === 'zh' ? '归档' : 'Archive'}
            </Button>
          )}

          {onDelete && (
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className={cn(
                "font-bold",
                isDarkTheme
                  ? "border-red-500/20 hover:bg-red-500/10 text-red-400"
                  : "border-red-200 hover:bg-red-50 text-red-600"
              )}
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              {uiLanguage === 'zh' ? '删除' : 'Delete'}
            </Button>
          )}
        </div>

        {/* Divider */}
        <div className={cn(
          "w-px h-8",
          isDarkTheme ? "bg-zinc-800" : "bg-gray-200"
        )} />

        {/* Clear Selection */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onClearSelection}
          className={cn(
            "font-bold",
            isDarkTheme
              ? "hover:bg-zinc-800 text-zinc-400 hover:text-white"
              : "hover:bg-gray-100 text-gray-500 hover:text-gray-900"
          )}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

import React from 'react';
import { ImageIcon, ArrowDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ImagePlacementIndicatorProps {
  sectionTitle: string;
  sectionLevel: 'h1' | 'h2' | 'h3';
  position: 'before' | 'after';
  isActive?: boolean;
  uiLanguage?: 'en' | 'zh';
  className?: string;
}

export const ImagePlacementIndicator: React.FC<ImagePlacementIndicatorProps> = ({
  sectionTitle,
  sectionLevel,
  position,
  isActive = false,
  uiLanguage = 'en',
  className,
}) => {
  const positionText = position === 'before' 
    ? (uiLanguage === 'zh' ? '之前' : 'Before')
    : (uiLanguage === 'zh' ? '之后' : 'After');

  return (
    <div
      className={cn(
        "flex items-center space-x-3 p-3 rounded-lg border transition-all",
        isActive
          ? "bg-purple-500/20 border-purple-500/50"
          : "bg-white/5 border-white/10",
        className
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isActive ? "bg-purple-500/30" : "bg-white/5"
      )}>
        <ImageIcon 
          size={16} 
          className={isActive ? "text-purple-400" : "text-gray-400"} 
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">
          {uiLanguage === 'zh' ? '图像位置' : 'Image Placement'}
        </div>
        <div className="flex items-center space-x-2">
          <span className={cn(
            "text-xs font-medium",
            sectionLevel === 'h1' && "text-lg",
            sectionLevel === 'h2' && "text-base",
            sectionLevel === 'h3' && "text-sm",
            isActive ? "text-white" : "text-gray-300"
          )}>
            {sectionTitle}
          </span>
          <ArrowDown 
            size={12} 
            className={cn(
              "text-gray-500",
              position === 'before' && "rotate-180"
            )}
          />
          <span className="text-xs text-gray-500">{positionText}</span>
        </div>
      </div>

      {/* Status Badge */}
      {isActive && (
        <div className="flex-shrink-0 px-2 py-1 bg-purple-500/30 rounded text-xs text-purple-300 font-medium">
          {uiLanguage === 'zh' ? '活跃' : 'Active'}
        </div>
      )}
    </div>
  );
};


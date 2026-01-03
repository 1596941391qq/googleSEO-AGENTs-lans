import React from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ImagePlaceholderProps {
  prompt?: string;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '3:2';
  size?: 'sm' | 'md' | 'lg';
  showPrompt?: boolean;
  className?: string;
}

const ASPECT_RATIO_CLASSES = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '16:9': 'aspect-video',
  '3:2': 'aspect-[3/2]',
};

const SIZE_CLASSES = {
  sm: 'h-32',
  md: 'h-48',
  lg: 'h-64',
};

export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  prompt,
  aspectRatio = '4:3',
  size = 'md',
  showPrompt = true,
  className,
}) => {
  return (
    <div className={cn("relative rounded-lg overflow-hidden border border-white/10 bg-gradient-to-br from-purple-900/20 to-blue-900/20", className)}>
      {/* Blur Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-purple-500/10 animate-pulse" />
      
      {/* Skeleton Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(255,255,255,0.05) 10px,
            rgba(255,255,255,0.05) 20px
          )`,
        }} />
      </div>

      {/* Content */}
      <div className={cn("relative flex flex-col items-center justify-center p-4", SIZE_CLASSES[size])}>
        {/* Icon */}
        <div className="mb-3">
          <div className="relative">
            <ImageIcon className="text-purple-400/50" size={32} />
            <Loader2 className="absolute inset-0 text-purple-500 animate-spin" size={32} />
          </div>
        </div>

        {/* Prompt Text */}
        {showPrompt && prompt && (
          <div className="text-center max-w-xs">
            <p className="text-xs text-gray-400 italic line-clamp-2">
              "{prompt}"
            </p>
          </div>
        )}

        {/* Loading Text */}
        <div className="mt-2 text-xs text-gray-500 uppercase tracking-wider">
          Generating...
        </div>
      </div>

      {/* Shimmer Effect */}
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
};


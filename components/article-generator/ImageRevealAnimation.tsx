import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ImagePlaceholder } from './ImagePlaceholder';

export interface ImageRevealAnimationProps {
  imageUrl: string;
  prompt?: string;
  aspectRatio?: '1:1' | '4:3' | '16:9' | '3:2';
  onRevealComplete?: () => void;
  className?: string;
}

export const ImageRevealAnimation: React.FC<ImageRevealAnimationProps> = ({
  imageUrl,
  prompt,
  aspectRatio = '4:3',
  onRevealComplete,
  className,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        onRevealComplete?.();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, onRevealComplete]);

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  if (imageError) {
    return (
      <div className={cn("relative rounded-lg overflow-hidden border border-red-500/20 bg-red-500/5", className)}>
        <div className="flex items-center justify-center h-48 text-red-400 text-sm">
          Failed to load image
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-lg overflow-hidden border border-white/10", className)}>
      {/* Placeholder (shown while loading) */}
      {!isLoaded && (
        <div className="absolute inset-0 z-10">
          <ImagePlaceholder prompt={prompt} aspectRatio={aspectRatio} size="md" />
        </div>
      )}

      {/* Actual Image */}
      <div
        className={cn(
          "relative transition-all duration-1000",
          isLoaded 
            ? "opacity-100 blur-0 scale-100" 
            : "opacity-0 blur-md scale-105"
        )}
      >
        <img
          src={imageUrl}
          alt={prompt || 'Generated image'}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Success Indicator */}
      {showSuccess && (
        <div className="absolute top-2 right-2 z-20 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-emerald-500/90 backdrop-blur-sm rounded-full p-1.5 shadow-lg">
            <CheckCircle className="text-white" size={16} />
          </div>
        </div>
      )}

      {/* Fade overlay for smooth transition */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none transition-opacity duration-1000",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
      />
    </div>
  );
};


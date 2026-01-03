import React, { useEffect } from 'react';
import { X, Download, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

export interface ImageLightboxProps {
  imageUrl: string;
  prompt?: string;
  theme?: string;
  onClose: () => void;
  onDownload?: () => void;
  isOpen: boolean;
  uiLanguage?: 'en' | 'zh';
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  imageUrl,
  prompt,
  theme,
  onClose,
  onDownload,
  isOpen,
  uiLanguage = 'en',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2 hover:bg-black/70"
      >
        <X size={24} />
      </button>

      {/* Image Container */}
      <div
        className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={prompt || theme || 'Generated image'}
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        />

        {/* Info Panel */}
        {(prompt || theme) && (
          <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-white/10">
            {theme && (
              <div className="text-sm font-bold text-white mb-1">{theme}</div>
            )}
            {prompt && (
              <div className="text-xs text-gray-300 italic">"{prompt}"</div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-4 left-4 flex items-center space-x-2">
          {onDownload && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              variant="outline"
              size="sm"
              className="bg-black/50 border-white/20 text-white hover:bg-black/70"
            >
              <Download size={16} className="mr-2" />
              {uiLanguage === 'zh' ? '下载' : 'Download'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};


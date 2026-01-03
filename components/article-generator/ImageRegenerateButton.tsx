import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

export interface ImageRegenerateButtonProps {
  onRegenerate: () => void;
  isRegenerating?: boolean;
  uiLanguage?: 'en' | 'zh';
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ImageRegenerateButton: React.FC<ImageRegenerateButtonProps> = ({
  onRegenerate,
  isRegenerating = false,
  uiLanguage = 'en',
  variant = 'outline',
  size = 'sm',
  className,
}) => {
  return (
    <Button
      onClick={onRegenerate}
      disabled={isRegenerating}
      variant={variant}
      size={size}
      className={cn(
        "transition-all",
        variant === 'outline' && "border-purple-500/50 text-purple-400 hover:bg-purple-500/20",
        className
      )}
    >
      <RefreshCw 
        size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} 
        className={cn("mr-2", isRegenerating && "animate-spin")} 
      />
      {isRegenerating 
        ? (uiLanguage === 'zh' ? '重新生成中...' : 'Regenerating...')
        : (uiLanguage === 'zh' ? '重新生成' : 'Regenerate')
      }
    </Button>
  );
};


import React, { useState } from 'react';
import { ChevronRight, ChevronDown, FileText, Hash } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ContentSection {
  id: string;
  level: 'h1' | 'h2' | 'h3';
  title: string;
  content?: string;
  children?: ContentSection[];
  progress?: number; // 0-100
  hasImage?: boolean;
}

export interface ContentStructureTreeProps {
  structure: ContentSection[];
  onSectionClick?: (section: ContentSection) => void;
  activeSectionId?: string;
  uiLanguage?: 'en' | 'zh';
  className?: string;
}

const SectionIcon: React.FC<{ level: 'h1' | 'h2' | 'h3' }> = ({ level }) => {
  const iconClass = "text-emerald-400";
  const size = level === 'h1' ? 18 : level === 'h2' ? 16 : 14;
  
  if (level === 'h1') {
    return <FileText className={iconClass} size={size} />;
  }
  return <Hash className={iconClass} size={size} />;
};

const SectionItem: React.FC<{
  section: ContentSection;
  level: number;
  onSectionClick?: (section: ContentSection) => void;
  activeSectionId?: string;
  uiLanguage?: 'en' | 'zh';
}> = ({ section, level, onSectionClick, activeSectionId, uiLanguage = 'en' }) => {
  const [isExpanded, setIsExpanded] = useState(level === 0);
  const hasChildren = section.children && section.children.length > 0;
  const isActive = activeSectionId === section.id;

  const handleClick = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
    onSectionClick?.(section);
  };

  const indentClass = `ml-${level * 4}`;

  return (
    <div>
      <div
        onClick={handleClick}
        className={cn(
          "flex items-center space-x-2 p-2 rounded cursor-pointer transition-colors group",
          isActive
            ? "bg-emerald-500/20 border-l-2 border-emerald-500"
            : "hover:bg-white/5",
          indentClass
        )}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren && (
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="text-gray-400" size={14} />
            ) : (
              <ChevronRight className="text-gray-400" size={14} />
            )}
          </div>
        )}
        {!hasChildren && <div className="w-[14px]" />}

        {/* Section Icon */}
        <SectionIcon level={section.level} />

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className={cn(
            "text-sm font-medium truncate",
            isActive ? "text-emerald-300" : "text-gray-300 group-hover:text-white"
          )}>
            {section.title}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          {section.hasImage && (
            <div className="w-2 h-2 rounded-full bg-purple-500" title={uiLanguage === 'zh' ? '包含图像' : 'Has image'} />
          )}
          {section.progress !== undefined && section.progress < 100 && (
            <div className="text-xs text-gray-500 font-mono">
              {Math.round(section.progress)}%
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="ml-4 border-l border-white/10">
          {section.children!.map((child) => (
            <SectionItem
              key={child.id}
              section={child}
              level={level + 1}
              onSectionClick={onSectionClick}
              activeSectionId={activeSectionId}
              uiLanguage={uiLanguage}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ContentStructureTree: React.FC<ContentStructureTreeProps> = ({
  structure,
  onSectionClick,
  activeSectionId,
  uiLanguage = 'en',
  className,
}) => {
  return (
    <div className={cn("bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 space-y-2", className)}>
      <div className="flex items-center space-x-2 mb-3">
        <FileText className="text-emerald-400" size={16} />
        <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
          {uiLanguage === 'zh' ? '内容结构' : 'Content Structure'}
        </span>
      </div>

      <div className="space-y-1">
        {structure.map((section) => (
          <SectionItem
            key={section.id}
            section={section}
            level={0}
            onSectionClick={onSectionClick}
            activeSectionId={activeSectionId}
            uiLanguage={uiLanguage}
          />
        ))}
      </div>
    </div>
  );
};


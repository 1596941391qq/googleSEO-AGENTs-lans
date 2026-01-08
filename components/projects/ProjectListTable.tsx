import React from 'react';
import { cn } from '../../lib/utils';
import { ProjectWithStats } from '../../types';
import { Calendar, ChevronRight, MoreHorizontal, Trash2, Edit } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface ProjectListTableProps {
  projects: ProjectWithStats[];
  onSelect: (project: ProjectWithStats) => void;
  onEdit: (project: ProjectWithStats) => void;
  onDelete: (projectId: string) => void;
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
}

export const ProjectListTable: React.FC<ProjectListTableProps> = ({
  projects,
  onSelect,
  onEdit,
  onDelete,
  isDarkTheme,
  uiLanguage,
}) => {
  if (projects.length === 0) {
    return (
      <div
        className={cn(
          'text-center py-12 border rounded-lg border-dashed',
          isDarkTheme ? 'border-zinc-800 text-zinc-500' : 'border-gray-300 text-gray-500'
        )}
      >
        {uiLanguage === 'zh' ? '暂无项目' : 'No projects found'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr
            className={cn(
              'border-b',
              isDarkTheme ? 'border-zinc-800' : 'border-gray-200'
            )}
          >
            <th
              className={cn(
                'text-left py-3 px-4 text-xs font-medium',
                isDarkTheme ? 'text-zinc-400' : 'text-gray-600'
              )}
            >
              {uiLanguage === 'zh' ? '项目名称' : 'Project Name'}
            </th>
            <th
              className={cn(
                'text-center py-3 px-4 text-xs font-medium',
                isDarkTheme ? 'text-zinc-400' : 'text-gray-600'
              )}
            >
              {uiLanguage === 'zh' ? '关键词' : 'Keywords'}
            </th>
            <th
              className={cn(
                'text-center py-3 px-4 text-xs font-medium',
                isDarkTheme ? 'text-zinc-400' : 'text-gray-600'
              )}
            >
              {uiLanguage === 'zh' ? '草稿' : 'Drafts'}
            </th>
            <th
              className={cn(
                'text-center py-3 px-4 text-xs font-medium',
                isDarkTheme ? 'text-zinc-400' : 'text-gray-600'
              )}
            >
              {uiLanguage === 'zh' ? '已发布' : 'Published'}
            </th>
            <th
              className={cn(
                'text-center py-3 px-4 text-xs font-medium',
                isDarkTheme ? 'text-zinc-400' : 'text-gray-600'
              )}
            >
              {uiLanguage === 'zh' ? '最后更新' : 'Last Updated'}
            </th>
            <th className="py-3 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr
              key={project.id}
              onClick={() => onSelect(project)}
              className={cn(
                'border-b transition-colors cursor-pointer group',
                isDarkTheme
                  ? 'border-zinc-800 hover:bg-white/[0.02]'
                  : 'border-gray-100 hover:bg-gray-50'
              )}
            >
              <td className="py-4 px-4">
                <div className="flex flex-col">
                  <span
                    className={cn(
                      'font-bold text-sm',
                      isDarkTheme ? 'text-white' : 'text-gray-900'
                    )}
                  >
                    {project.name}
                  </span>
                  {project.seed_keyword && (
                    <span
                      className={cn(
                        'text-[10px] mt-1 opacity-60',
                        isDarkTheme ? 'text-zinc-400' : 'text-gray-500'
                      )}
                    >
                      Seed: {project.seed_keyword}
                    </span>
                  )}
                </div>
              </td>
              <td className="text-center py-4 px-4">
                <Badge variant="outline" className="font-mono">
                  {project.keyword_count}
                </Badge>
              </td>
              <td className="text-center py-4 px-4">
                <Badge variant="outline" className="font-mono text-purple-500 border-purple-500/20 bg-purple-500/5">
                  {project.draft_count}
                </Badge>
              </td>
              <td className="text-center py-4 px-4">
                <Badge variant="outline" className="font-mono text-emerald-500 border-emerald-500/20 bg-emerald-500/5">
                  {project.published_count}
                </Badge>
              </td>
              <td className="text-center py-4 px-4">
                <div
                  className={cn(
                    'text-[10px] flex items-center justify-center gap-1',
                    isDarkTheme ? 'text-zinc-500' : 'text-gray-500'
                  )}
                >
                  <Calendar className="w-3 h-3" />
                  {new Date(project.updated_at).toLocaleDateString()}
                </div>
              </td>
              <td className="py-4 px-4 text-right">
                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(project);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(project.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

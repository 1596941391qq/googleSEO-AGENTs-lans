import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { ProjectWithStats, KeywordWithStatus } from '../../types';
import { ProjectMetricsCards } from './ProjectMetricsCards';
import { ProjectListTable } from './ProjectListTable';
import { ProjectKeywordTable } from './ProjectKeywordTable';
import { RichTextEditor } from './RichTextEditor';
import { Button } from '../ui/button';
import { ArrowLeft, Loader2, Plus, RefreshCw, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface ProjectDashboardProps {
  isDarkTheme: boolean;
  uiLanguage: 'en' | 'zh';
  onGenerateContent: (keyword: KeywordWithStatus) => void;
  onViewDraft: (keyword: KeywordWithStatus) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  isDarkTheme,
  uiLanguage,
  onGenerateContent,
  onViewDraft,
}) => {
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectWithStats | null>(null);
  const [keywords, setKeywords] = useState<KeywordWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<{
    keywordId: string;
    projectId: string;
    title: string;
    content: string;
  } | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/projects/list?userId=1'); // TODO: Get real userId
      const result = await response.json();
      if (result.success) {
        setProjects(result.data.projects);
      } else {
        throw new Error(result.error || 'Failed to fetch projects');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchKeywords = async (projectId: string) => {
    setKeywordsLoading(true);
    try {
      const response = await fetch(`/api/projects/keywords?projectId=${projectId}`);
      const result = await response.json();
      if (result.success) {
        setKeywords(result.data.keywords);
      }
    } catch (err: any) {
      console.error('Failed to fetch keywords:', err);
    } finally {
      setKeywordsLoading(false);
    }
  };

  const handleViewDraft = async (keyword: KeywordWithStatus) => {
    try {
      const response = await fetch(`/api/articles/list?userId=1`); // TODO: Filter by keyword/project
      const result = await response.json();
      if (result.success) {
        // Find the most recent draft for this keyword
        const articles = result.data.articles;
        const draft = articles.find((a: any) => a.keyword === keyword.keyword);
        if (draft) {
          setEditingDraft({
            keywordId: keyword.id,
            projectId: keyword.project_id,
            title: draft.title,
            content: draft.content,
          });
        } else {
          alert(uiLanguage === 'zh' ? '未找到草稿' : 'No draft found');
        }
      }
    } catch (err) {
      console.error('Failed to fetch draft:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSelectProject = (project: ProjectWithStats) => {
    setSelectedProject(project);
    fetchKeywords(project.id);
  };

  const handleBack = () => {
    setSelectedProject(null);
    setKeywords([]);
    fetchProjects(); // Refresh projects to get updated stats
  };

  const stats = {
    totalProjects: projects.length,
    totalKeywords: projects.reduce((acc, p) => acc + (parseInt(p.keyword_count as any) || 0), 0),
    totalDrafts: projects.reduce((acc, p) => acc + (parseInt(p.draft_count as any) || 0), 0),
    totalPublished: projects.reduce((acc, p) => acc + (parseInt(p.published_count as any) || 0), 0),
  };

  if (loading && !selectedProject) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {selectedProject && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className={cn(isDarkTheme ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-gray-900')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className={cn('text-2xl font-bold', isDarkTheme ? 'text-white' : 'text-gray-900')}>
            {selectedProject 
              ? selectedProject.name 
              : (uiLanguage === 'zh' ? '内容项目管理' : 'Content Projects')}
          </h1>
        </div>
        {!selectedProject && (
          <div className="flex gap-2">
             <Button
              variant="outline"
              size="sm"
              onClick={fetchProjects}
              className={cn(isDarkTheme ? 'border-zinc-800' : 'border-gray-200')}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {uiLanguage === 'zh' ? '刷新' : 'Refresh'}
            </Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              {uiLanguage === 'zh' ? '新建项目' : 'New Project'}
            </Button>
          </div>
        )}
      </div>

      {!selectedProject ? (
        <>
          <ProjectMetricsCards stats={stats} isDarkTheme={isDarkTheme} uiLanguage={uiLanguage} />
          <Card className={cn(isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200')}>
            <CardHeader>
              <CardTitle className={cn('text-sm font-medium', isDarkTheme ? 'text-white' : 'text-gray-900')}>
                {uiLanguage === 'zh' ? '项目列表' : 'Project List'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectListTable
                projects={projects}
                onSelect={handleSelectProject}
                onEdit={(p) => console.log('Edit', p)}
                onDelete={(id) => console.log('Delete', id)}
                isDarkTheme={isDarkTheme}
                uiLanguage={uiLanguage}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <Card className={cn(isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={cn('text-sm font-medium', isDarkTheme ? 'text-white' : 'text-gray-900')}>
                {uiLanguage === 'zh' ? '关键词列表' : 'Keywords'}
              </CardTitle>
              {keywordsLoading && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
            </CardHeader>
            <CardContent>
              <ProjectKeywordTable
                keywords={keywords}
                onGenerate={onGenerateContent}
                onViewDraft={handleViewDraft}
                isDarkTheme={isDarkTheme}
                uiLanguage={uiLanguage}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Draft Editor Modal */}
      {editingDraft && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8">
          <div className={cn(
            "relative w-full max-w-6xl h-full max-h-[90vh] rounded-2xl border overflow-hidden flex flex-col shadow-2xl",
            isDarkTheme ? "bg-[#0a0a0a] border-zinc-800" : "bg-white border-gray-200"
          )}>
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className={cn("text-lg font-bold", isDarkTheme ? "text-white" : "text-gray-900")}>
                {editingDraft.title}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setEditingDraft(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <RichTextEditor
                initialContent={editingDraft.content}
                isDarkTheme={isDarkTheme}
                uiLanguage={uiLanguage}
                onSave={async (newContent) => {
                  console.log('Saving content...', newContent);
                  // TODO: Implement save API
                  setEditingDraft(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

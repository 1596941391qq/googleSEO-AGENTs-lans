import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { ProjectWithStats, KeywordWithStatus } from '../../types';
import { ProjectMetricsCards } from './ProjectMetricsCards';
import { ProjectListTable } from './ProjectListTable';
import { ProjectKeywordTable } from './ProjectKeywordTable';
import { RichTextEditor } from './RichTextEditor';
import { Button } from '../ui/button';
import { ArrowLeft, Loader2, Plus, RefreshCw, X, Search, Sparkles, Languages, CheckCircle2, CircleDashed, AlertCircle, Clock, Trash2, Folder } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { getUserId } from '../website-data/utils';

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
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectWithStats | null>(null);
  const [keywords, setKeywords] = useState<KeywordWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingDraft, setEditingDraft] = useState<{
    id: string;
    keywordId: string;
    projectId: string;
    title: string;
    content: string;
    source: 'published' | 'task' | 'draft';
  } | null>(null);

  const currentUserId = getUserId(user);

  const fetchProjects = async () => {
    if (!user) {
      setError('Please login to view projects');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/list?userId=${currentUserId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });
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

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    try {
      const response = await fetch('/api/projects/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          name: newProjectName.trim(),
        }),
      });
      const result = await response.json();
      if (result.success) {
        setIsCreateModalOpen(false);
        setNewProjectName('');
        fetchProjects();
      } else {
        alert(result.error || 'Failed to create project');
      }
    } catch (err) {
      console.error('Error creating project:', err);
      alert('Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const fetchKeywords = async (projectId: string) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }
    setKeywordsLoading(true);
    try {
      const response = await fetch(`/api/projects/keywords?projectId=${projectId}&userId=${currentUserId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });
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
    if (!user) {
      console.error('User not authenticated');
      return;
    }
    try {
      const response = await fetch(`/api/articles/list?userId=${currentUserId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        }
      });
      const result = await response.json();
      if (result.success) {
        // Find the most recent draft for this keyword
        const articles = result.data.articles;
        const draft = articles.find((a: any) => a.keyword === keyword.keyword);
        if (draft) {
          setEditingDraft({
            id: draft.id,
            keywordId: keyword.id,
            projectId: keyword.project_id,
            title: draft.title,
            content: draft.content,
            source: draft.source || 'published',
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
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const handleSelectProject = (project: ProjectWithStats) => {
    setSelectedProject(project);
    fetchKeywords(project.id);
  };

  const handleDelete = async (project: ProjectWithStats, e: React.MouseEvent) => {
    e.stopPropagation();
    const isTask = project.type === 'task';
    const deleteUrl = isTask 
      ? `/api/tasks/delete?id=${project.id}&userId=${currentUserId}`
      : `/api/projects/delete?projectId=${project.id}&userId=${currentUserId}`;

    if (confirm(uiLanguage === 'zh' 
      ? `确定要删除这个${isTask ? '任务' : '项目'}吗？` 
      : `Are you sure you want to delete this ${isTask ? 'task' : 'project'}?`)) {
      try {
        const response = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
          }
        });
        const result = await response.json();
        if (result.success) {
          fetchProjects();
        } else {
          alert(result.error || 'Failed to delete');
        }
      } catch (err) {
        console.error('Error deleting:', err);
      }
    }
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

  const getTaskIcon = (project: ProjectWithStats) => {
    if (project.type === 'project') return <Folder className="w-4 h-4" />;
    switch (project.task_type) {
      case 'mining': return <Search className="w-4 h-4" />;
      case 'article-generator': return <Sparkles className="w-4 h-4" />;
      case 'batch': return <Languages className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'in_progress': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'completed': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'failed': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
    }
  };

  const getStatusLabel = (status?: string) => {
    if (uiLanguage === 'zh') {
      switch (status) {
        case 'in_progress': return '进行中';
        case 'completed': return '已完成';
        case 'failed': return '已失败';
        default: return '未知';
      }
    } else {
      switch (status) {
        case 'in_progress': return 'In Progress';
        case 'completed': return 'Completed';
        case 'failed': return 'Failed';
        default: return 'Unknown';
      }
    }
  };

  const renderKanban = () => {
    const columns = [
      { id: 'in_progress', title: uiLanguage === 'zh' ? '进行中' : 'In Progress', icon: <CircleDashed className="w-4 h-4 animate-spin" /> },
      { id: 'completed', title: uiLanguage === 'zh' ? '已完成' : 'Completed', icon: <CheckCircle2 className="w-4 h-4" /> },
      { id: 'failed', title: uiLanguage === 'zh' ? '已失败' : 'Failed', icon: <AlertCircle className="w-4 h-4" /> },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map(column => {
          const columnProjects = projects.filter(p => (p.status || 'completed') === column.id);
          return (
            <div key={column.id} className="flex flex-col space-y-4">
              <div className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg border",
                isDarkTheme ? "bg-zinc-900/50 border-zinc-800" : "bg-gray-50 border-gray-200"
              )}>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    column.id === 'in_progress' ? "text-amber-500" : 
                    column.id === 'completed' ? "text-emerald-500" : "text-red-500"
                  )}>
                    {column.icon}
                  </span>
                  <h3 className={cn("font-bold text-sm", isDarkTheme ? "text-zinc-300" : "text-gray-700")}>
                    {column.title}
                  </h3>
                </div>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full",
                  isDarkTheme ? "bg-zinc-800 text-zinc-500" : "bg-gray-200 text-gray-500"
                )}>
                  {columnProjects.length}
                </span>
              </div>

              <div className="space-y-3">
                {columnProjects.map(project => (
                  <Card 
                    key={project.id} 
                    className={cn(
                      "cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]",
                      isDarkTheme ? "bg-zinc-900 border-zinc-800 hover:border-emerald-500/50" : "bg-white border-gray-200 hover:border-emerald-500/50 shadow-sm"
                    )}
                    onClick={() => handleSelectProject(project)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "p-1.5 rounded-md",
                            isDarkTheme ? "bg-zinc-800 text-zinc-400" : "bg-gray-100 text-gray-500"
                          )}>
                            {getTaskIcon(project)}
                          </div>
                          <h4 className={cn("font-bold text-sm line-clamp-1", isDarkTheme ? "text-white" : "text-gray-900")}>
                            {project.name}
                          </h4>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
                            isDarkTheme ? "text-zinc-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"
                          )}
                          onClick={(e) => handleDelete(project, e)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {project.target_language && (
                          <div className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1",
                            isDarkTheme ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-700"
                          )}>
                            <Languages className="w-3 h-3" />
                            {project.target_language.toUpperCase()}
                          </div>
                        )}
                        {project.keyword_count > 0 && (
                          <div className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1",
                            isDarkTheme ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-50 text-emerald-700"
                          )}>
                            <Search className="w-3 h-3" />
                            {project.keyword_count} {uiLanguage === 'zh' ? '关键词' : 'Keywords'}
                          </div>
                        )}
                        {project.draft_count > 0 && (
                          <div className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1",
                            isDarkTheme ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-700"
                          )}>
                            <Sparkles className="w-3 h-3" />
                            {project.draft_count} {uiLanguage === 'zh' ? '草稿' : 'Drafts'}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className={cn("text-[10px] font-medium", isDarkTheme ? "text-zinc-500" : "text-gray-400")}>
                          {new Date(project.updated_at).toLocaleDateString(uiLanguage === 'zh' ? 'zh-CN' : 'en-US')}
                        </span>
                        <div className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                          getStatusColor(project.status || 'completed')
                        )}>
                          {getStatusLabel(project.status || 'completed')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {columnProjects.length === 0 && (
                  <div className={cn(
                    "flex flex-col items-center justify-center py-8 rounded-xl border border-dashed",
                    isDarkTheme ? "border-zinc-800 text-zinc-600" : "border-gray-200 text-gray-400"
                  )}>
                    <p className="text-[10px] font-medium uppercase tracking-widest">
                      {uiLanguage === 'zh' ? '暂无项目' : 'Empty'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading && !selectedProject) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
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
          <div className="space-y-1">
            <h1 className={cn('text-2xl font-bold tracking-tight', isDarkTheme ? 'text-white' : 'text-gray-900')}>
              {selectedProject 
                ? selectedProject.name 
                : (uiLanguage === 'zh' ? '任务进度看板' : 'Task Progress Kanban')}
            </h1>
            {!selectedProject && (
              <p className={cn("text-xs font-medium uppercase tracking-wider", isDarkTheme ? "text-zinc-500" : "text-gray-500")}>
                {uiLanguage === 'zh' ? '自动追踪所有关键词挖掘与内容生成任务' : 'Auto-track all mining and generation tasks'}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
           <Button
            variant="outline"
            size="sm"
            onClick={fetchProjects}
            className={cn("font-bold transition-all active:scale-95", isDarkTheme ? 'border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-100')}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {uiLanguage === 'zh' ? '刷新' : 'Refresh'}
          </Button>
        </div>
      </div>

      {!selectedProject ? (
        <>
          <ProjectMetricsCards stats={stats} isDarkTheme={isDarkTheme} uiLanguage={uiLanguage} />
          {renderKanban()}
        </>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <Card className={cn(isDarkTheme ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200')}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  isDarkTheme ? "bg-zinc-800 text-emerald-500" : "bg-emerald-50 text-emerald-600"
                )}>
                  {getTaskIcon(selectedProject)}
                </div>
                <div>
                  <CardTitle className={cn('text-sm font-bold', isDarkTheme ? 'text-white' : 'text-gray-900')}>
                    {uiLanguage === 'zh' ? '关键词列表' : 'Keywords'}
                  </CardTitle>
                  <p className={cn("text-[10px] font-medium opacity-60", isDarkTheme ? "text-zinc-400" : "text-gray-500")}>
                    {keywords.length} {uiLanguage === 'zh' ? '个关键词被识别' : 'keywords identified'}
                  </p>
                </div>
              </div>
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

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card className={cn(
            "w-full max-w-md shadow-2xl",
            isDarkTheme ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"
          )}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className={cn(isDarkTheme ? "text-white" : "text-gray-900")}>
                {uiLanguage === 'zh' ? '创建新项目' : 'Create New Project'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => {
                setIsCreateModalOpen(false);
                setNewProjectName('');
              }}>
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className={cn("text-sm font-medium", isDarkTheme ? "text-zinc-400" : "text-gray-600")}>
                  {uiLanguage === 'zh' ? '项目名称' : 'Project Name'}
                </label>
                <input
                  type="text"
                  className={cn(
                    "w-full px-3 py-2 rounded-md border outline-none transition-all",
                    isDarkTheme
                      ? "bg-black border-zinc-800 text-white focus:border-emerald-500"
                      : "bg-white border-gray-200 text-gray-900 focus:border-emerald-500"
                  )}
                  placeholder={uiLanguage === 'zh' ? '请输入项目名称' : 'Enter project name'}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => {
                  setIsCreateModalOpen(false);
                  setNewProjectName('');
                }}>
                  {uiLanguage === 'zh' ? '取消' : 'Cancel'}
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={!newProjectName.trim() || isCreating}
                  onClick={handleCreateProject}
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {uiLanguage === 'zh' ? '创建项目' : 'Create Project'}
                </Button>
              </div>
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
                draftId={editingDraft.id}
                onSave={async (newContent) => {
                  try {
                    const response = await fetch('/api/articles/save-draft', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
                      },
                      body: JSON.stringify({
                        projectId: editingDraft.projectId,
                        keywordId: editingDraft.keywordId,
                        title: editingDraft.title,
                        content: newContent,
                      }),
                    });
                    const result = await response.json();
                    if (result.success) {
                      setEditingDraft(null);
                      // Optionally refresh keywords/stats
                      if (selectedProject) {
                        fetchKeywords(selectedProject.id);
                      }
                    } else {
                      alert(result.error || 'Failed to save draft');
                    }
                  } catch (err) {
                    console.error('Error saving draft:', err);
                    alert('Failed to save draft');
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

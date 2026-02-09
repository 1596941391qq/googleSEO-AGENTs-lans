import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  TaskState,
  TaskType,
  CreateTaskParams,
  ProbabilityLevel,
  TargetLanguage,
} from '../types';
import { smartStorage } from '../lib/storage';

// Context 接口定义
interface TaskContextValue {
  // 任务状态
  tasks: TaskState[];
  activeTaskId: string | null;
  maxTasks: number;

  // 任务操作
  createTask: (params: CreateTaskParams) => TaskState;
  switchTask: (taskId: string) => void;
  deleteTask: (taskId: string) => void;
  updateTask: (taskId: string, updates: Partial<TaskState>) => void;

  // 辅助方法
  activeTask: TaskState | null;
  getTaskById: (taskId: string) => TaskState | undefined;

  // 持久化
  saveTasks: () => Promise<void>;
  loadTasks: () => Promise<void>;
}

// 创建 Context
const TaskContext = createContext<TaskContextValue | undefined>(undefined);

// Provider Props
interface TaskProviderProps {
  children: React.ReactNode;
}

// 生成任务名称
function generateTaskName(type: TaskType, index: number): string {
  const typeNames = {
    mining: 'Mining',
    batch: 'Batch',
    'article-generator': 'Article',
    'deep-dive': 'Deep Dive',
  };
  return `${typeNames[type]} ${index + 1}`;
}

// Provider 组件
export function TaskProvider({ children }: TaskProviderProps) {
  // 任务状态
  const [tasks, setTasks] = useState<TaskState[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [maxTasks] = useState<number>(10);

  // 计算当前激活的任务
  const activeTask = tasks.find((t) => t.id === activeTaskId) || null;

  // 创建任务
  const createTask = useCallback(
    (params: CreateTaskParams): TaskState => {
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const name = params.name || generateTaskName(params.type, tasks.length);

      const baseTask: TaskState = {
        type: params.type,
        id: taskId,
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: false,
        targetLanguage: params.targetLanguage || 'en',
        filterLevel: ProbabilityLevel.HIGH,
        sortBy: 'probability',
        expandedRowId: null,
      };

      // 初始化类型特定的状态
      switch (params.type) {
        case 'mining':
          baseTask.miningState = {
            seedKeyword: params.seedKeyword || '',
            keywords: [],
            miningRound: 0,
            agentThoughts: [],
            isMining: false,
            miningSuccess: false,
            wordsPerRound: 10,
            miningStrategy: 'horizontal',
            skipSerpVerification: false,
            userSuggestion: '',
            miningConfig: params.miningConfig,
            miningMode: params.miningMode || 'blue-ocean',
            logs: [],
          };
          break;
        case 'batch':
          baseTask.batchState = {
            batchInputKeywords: params.inputKeywords || '',
            batchKeywords: [],
            batchThoughts: [],
            batchCurrentIndex: 0,
            batchTotalCount: 0,
            miningMode: params.miningMode || 'blue-ocean',
            miningConfig: params.miningConfig,
            logs: [],
          };
          break;
        case 'article-generator':
          baseTask.articleGeneratorState = {
            keyword: typeof params.keyword === 'string' ? params.keyword : params.keyword?.keyword || '',
            tone: 'professional',
            targetAudience: 'beginner',
            visualStyle: 'realistic',
            targetMarket: params.targetMarket || 'global',
            isGenerating: false,
            progress: 0,
            currentStage: 'input',
            streamEvents: [],
            finalArticle: null,
          };
          break;
        case 'deep-dive':
          baseTask.deepDiveState = {};
          break;
      }

      return baseTask;
    },
    [tasks.length]
  );

  // 切换任务
  const switchTask = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => ({
        ...t,
        isActive: t.id === taskId,
      }))
    );
    setActiveTaskId(taskId);
    smartStorage.saveActiveTaskId(taskId);
  }, []);

  // 删除任务
  const deleteTask = useCallback((taskId: string) => {
    setTasks((prev) => {
      const filtered = prev.filter((t) => t.id !== taskId);
      return filtered;
    });

    // 如果删除的是当前激活的任务，切换到第一个任务
    setActiveTaskId((prevId) => {
      if (prevId === taskId) {
        const remaining = tasks.filter((t) => t.id !== taskId);
        return remaining.length > 0 ? remaining[0].id : null;
      }
      return prevId;
    });

    // 从存储中删除
    smartStorage.deleteTask(taskId).catch((err) => {
      console.error('[TaskContext] Failed to delete task from storage:', err);
    });
  }, [tasks]);

  // 更新任务
  const updateTask = useCallback((taskId: string, updates: Partial<TaskState>) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              ...updates,
              updatedAt: Date.now(),
            }
          : t
      )
    );
  }, []);

  // 根据 ID 获取任务
  const getTaskById = useCallback(
    (taskId: string) => {
      return tasks.find((t) => t.id === taskId);
    },
    [tasks]
  );

  // 保存任务到存储
  const saveTasks = useCallback(async () => {
    try {
      for (const task of tasks) {
        await smartStorage.saveTask(task);
      }
      console.log('[TaskContext] Tasks saved successfully');
    } catch (error) {
      console.error('[TaskContext] Failed to save tasks:', error);
    }
  }, [tasks]);

  // 从存储加载任务
  const loadTasks = useCallback(async () => {
    try {
      const loadedTasks = await smartStorage.loadAllTasks();
      setTasks(loadedTasks);

      // 恢复激活的任务
      const savedActiveId = smartStorage.getActiveTaskId();
      if (savedActiveId && loadedTasks.some((t) => t.id === savedActiveId)) {
        setActiveTaskId(savedActiveId);
      } else if (loadedTasks.length > 0) {
        setActiveTaskId(loadedTasks[0].id);
      }

      console.log('[TaskContext] Tasks loaded successfully');
    } catch (error) {
      console.error('[TaskContext] Failed to load tasks:', error);
    }
  }, []);

  // 自动保存任务（当任务列表变化时）
  useEffect(() => {
    if (tasks.length > 0) {
      saveTasks();
    }
  }, [tasks, saveTasks]);

  // Context value
  const value: TaskContextValue = {
    tasks,
    activeTaskId,
    maxTasks,
    createTask,
    switchTask,
    deleteTask,
    updateTask,
    activeTask,
    getTaskById,
    saveTasks,
    loadTasks,
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

// Custom hook
export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
}

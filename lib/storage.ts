/**
 * 智能存储系统 - 解决 localStorage 配额限制问题
 * 
 * 策略：
 * 1. 只存储必要字段 - 压缩任务数据，移除大型字段
 * 2. 分片存储 - 将大数据拆分到多个 localStorage key
 * 3. IndexedDB - 大数据存入 IndexedDB（容量可达数百MB）
 * 4. 后端优先 - 主数据存后端，本地只存基础信息作为缓存
 */

import type { TaskState, KeywordData, AgentThought, BatchAnalysisThought, AgentStreamEvent } from '../types';

// ==================== 常量定义 ====================

const DB_NAME = 'google_seo_db';
const DB_VERSION = 1;
const STORE_NAMES = {
  TASKS: 'tasks',
  KEYWORDS: 'keywords',
  THOUGHTS: 'thoughts',
  STREAM_EVENTS: 'stream_events',
} as const;

// localStorage 分片 key 前缀
const STORAGE_PREFIX = 'gss_'; // google seo storage
const STORAGE_KEYS = {
  TASK_META: `${STORAGE_PREFIX}task_meta`,      // 任务基础信息（精简版）
  TASK_INDEX: `${STORAGE_PREFIX}task_index`,    // 任务ID索引
  SETTINGS: `${STORAGE_PREFIX}settings`,         // 用户设置
  ACTIVE_TASK_ID: `${STORAGE_PREFIX}active_task_id`, // 当前激活任务ID
} as const;

// 单个 localStorage key 的最大大小（字节），留出安全边际
const MAX_STORAGE_SIZE = 2 * 1024 * 1024; // 2MB per key

// ==================== IndexedDB 封装 ====================

let dbInstance: IDBDatabase | null = null;

/**
 * 初始化 IndexedDB
 */
export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[Storage] IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      console.log('[Storage] IndexedDB initialized successfully');
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建任务存储
      if (!db.objectStoreNames.contains(STORE_NAMES.TASKS)) {
        const taskStore = db.createObjectStore(STORE_NAMES.TASKS, { keyPath: 'id' });
        taskStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      // 创建关键词存储（按任务ID索引）
      if (!db.objectStoreNames.contains(STORE_NAMES.KEYWORDS)) {
        const keywordStore = db.createObjectStore(STORE_NAMES.KEYWORDS, { keyPath: 'id' });
        keywordStore.createIndex('taskId', 'taskId', { unique: false });
      }

      // 创建思维流存储（按任务ID索引）
      if (!db.objectStoreNames.contains(STORE_NAMES.THOUGHTS)) {
        const thoughtStore = db.createObjectStore(STORE_NAMES.THOUGHTS, { keyPath: 'id' });
        thoughtStore.createIndex('taskId', 'taskId', { unique: false });
      }

      // 创建流事件存储（按任务ID索引）
      if (!db.objectStoreNames.contains(STORE_NAMES.STREAM_EVENTS)) {
        const eventStore = db.createObjectStore(STORE_NAMES.STREAM_EVENTS, { keyPath: 'id' });
        eventStore.createIndex('taskId', 'taskId', { unique: false });
      }

      console.log('[Storage] IndexedDB schema upgraded');
    };
  });
}

/**
 * 通用 IndexedDB 操作封装
 */
async function dbOperation<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ==================== 数据压缩 - 只存储必要字段 ====================

/**
 * 精简 KeywordData - 移除大型字段
 */
function compressKeyword(keyword: KeywordData): Partial<KeywordData> {
  return {
    id: keyword.id,
    keyword: keyword.keyword,
    translation: keyword.translation,
    intent: keyword.intent,
    volume: keyword.volume,
    source: keyword.source,
    sources: keyword.sources,
    isHighPerformer: keyword.isHighPerformer,
    // DataForSEO 核心数据（精简）
    dataForSEOData: keyword.dataForSEOData ? {
      is_data_found: keyword.dataForSEOData.is_data_found,
      volume: keyword.dataForSEOData.volume,
      cpc: keyword.dataForSEOData.cpc,
      competition: keyword.dataForSEOData.competition,
      competition_level: keyword.dataForSEOData.competition_level,
      difficulty: keyword.dataForSEOData.difficulty,
    } : undefined,
    // 分析结果（保留核心）
    probability: keyword.probability,
    topDomainType: keyword.topDomainType,
    blueOceanScore: keyword.blueOceanScore,
    // 移除大型字段：rawResponse, topSerpSnippets, searchResults, reasoning, blueOceanScoreBreakdown
  };
}

/**
 * 精简 AgentThought - 移除大型字段
 */
function compressThought(thought: AgentThought): Partial<AgentThought> {
  return {
    id: thought.id,
    round: thought.round,
    type: thought.type,
    content: thought.content?.substring(0, 500), // 截断长内容
    stats: thought.stats,
    dataType: thought.dataType,
    // 移除大型字段：keywords, analyzedKeywords, data, table, searchResults
  };
}

/**
 * 精简 BatchAnalysisThought
 */
function compressBatchThought(thought: BatchAnalysisThought): Partial<BatchAnalysisThought> {
  return {
    id: thought.id,
    type: thought.type,
    keyword: thought.keyword,
    content: thought.content?.substring(0, 300),
    // 移除：serpSnippets, serankingData 详情
  };
}

/**
 * 精简 AgentStreamEvent
 */
function compressStreamEvent(event: AgentStreamEvent): Partial<AgentStreamEvent> {
  return {
    id: event.id,
    agentId: event.agentId,
    type: event.type,
    timestamp: event.timestamp,
    message: event.message?.substring(0, 200),
    cardType: event.cardType,
    // 移除大型字段：data（包含完整文章内容、SERP结果等）
  };
}

// ==================== 任务元数据 - 精简版 ====================

export interface TaskMeta {
  id: string;
  type: TaskState['type'];
  name: string;
  createdAt: number;
  updatedAt: number;
  targetLanguage: TaskState['targetLanguage'];
  // 状态摘要
  status: 'idle' | 'running' | 'completed';
  keywordCount: number;
  // 挖掘任务摘要
  seedKeyword?: string;
  miningRound?: number;
  miningSuccess?: boolean;
  // 批量任务摘要
  batchProgress?: string; // "5/10"
  // 文章生成任务摘要
  articleKeyword?: string;
  articleStage?: string;
  hasArticle?: boolean;
}

/**
 * 从完整 TaskState 提取元数据
 */
export function extractTaskMeta(task: TaskState): TaskMeta {
  const meta: TaskMeta = {
    id: task.id,
    type: task.type,
    name: task.name,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    targetLanguage: task.targetLanguage,
    status: 'idle',
    keywordCount: 0,
  };

  // 根据任务类型提取摘要
  switch (task.type) {
    case 'mining':
      if (task.miningState) {
        meta.seedKeyword = task.miningState.seedKeyword;
        meta.miningRound = task.miningState.miningRound;
        meta.miningSuccess = task.miningState.miningSuccess;
        meta.keywordCount = task.miningState.keywords?.length || 0;
        meta.status = task.miningState.isMining ? 'running' :
          task.miningState.miningSuccess ? 'completed' : 'idle';
      }
      break;

    case 'batch':
      if (task.batchState) {
        meta.keywordCount = task.batchState.batchKeywords?.length || 0;
        meta.batchProgress = `${task.batchState.batchCurrentIndex}/${task.batchState.batchTotalCount}`;
        meta.status = task.batchState.batchCurrentIndex < task.batchState.batchTotalCount ? 'running' : 'completed';
      }
      break;

    case 'article-generator':
      if (task.articleGeneratorState) {
        meta.articleKeyword = task.articleGeneratorState.keyword;
        meta.articleStage = task.articleGeneratorState.currentStage;
        meta.hasArticle = !!(task.articleGeneratorState.finalArticle?.title || task.articleGeneratorState.finalArticle?.content);
        meta.status = task.articleGeneratorState.isGenerating ? 'running' :
          meta.hasArticle ? 'completed' : 'idle';
      }
      break;
  }

  return meta;
}

// ==================== 智能存储管理器 ====================

export class SmartStorage {
  private static instance: SmartStorage;

  private constructor() { }

  static getInstance(): SmartStorage {
    if (!SmartStorage.instance) {
      SmartStorage.instance = new SmartStorage();
    }
    return SmartStorage.instance;
  }

  /**
   * 初始化存储系统
   */
  async init(): Promise<void> {
    try {
      await initDB();
      console.log('[SmartStorage] Initialized');
    } catch (error) {
      console.error('[SmartStorage] Failed to initialize IndexedDB, falling back to localStorage only:', error);
    }
  }

  // ==================== 任务存储 ====================

  /**
   * 保存任务（智能分层存储）
   * - 元数据 -> localStorage（快速访问）
   * - 完整数据 -> IndexedDB（大容量）
   */
  async saveTask(task: TaskState): Promise<void> {
    try {
      // 1. 保存元数据到 localStorage
      await this.saveTaskMeta(task);

      // 2. 保存完整任务到 IndexedDB
      await this.saveTaskToIndexedDB(task);

      console.log(`[SmartStorage] Task ${task.id} saved successfully`);
    } catch (error) {
      console.error(`[SmartStorage] Failed to save task ${task.id}:`, error);
      // 降级：尝试只保存精简版到 localStorage
      await this.saveCompressedTaskToLocalStorage(task);
    }
  }

  /**
   * 保存元数据到 localStorage
   */
  private async saveTaskMeta(task: TaskState): Promise<void> {
    const meta = extractTaskMeta(task);
    const allMetas = this.getTaskMetas();
    const index = allMetas.findIndex(m => m.id === task.id);

    if (index >= 0) {
      allMetas[index] = meta;
    } else {
      allMetas.push(meta);
    }

    try {
      localStorage.setItem(STORAGE_KEYS.TASK_META, JSON.stringify(allMetas));
    } catch (e) {
      // 如果还是超限，清理旧数据
      console.warn('[SmartStorage] localStorage quota exceeded, cleaning old data...');
      await this.cleanupOldData();
      localStorage.setItem(STORAGE_KEYS.TASK_META, JSON.stringify(allMetas.slice(-10)));
    }
  }

  /**
   * 保存当前激活任务 ID（用于刷新后恢复）
   */
  saveActiveTaskId(activeTaskId: string | null): void {
    try {
      localStorage.setItem(
        STORAGE_KEYS.ACTIVE_TASK_ID,
        JSON.stringify(activeTaskId)
      );
    } catch (e) {
      console.warn('[SmartStorage] Failed to save active task id:', e);
    }
  }

  /**
   * 获取当前激活任务 ID
   */
  getActiveTaskId(): string | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_TASK_ID);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 保存完整任务到 IndexedDB
   */
  private async saveTaskToIndexedDB(task: TaskState): Promise<void> {
    const db = await initDB();

    // 准备存储数据：分离大型字段
    const taskData = {
      ...task,
      // 压缩关键词数据
      miningState: task.miningState ? {
        ...task.miningState,
        keywords: task.miningState.keywords?.map(compressKeyword),
        agentThoughts: task.miningState.agentThoughts?.map(compressThought),
        logs: task.miningState.logs?.slice(-50), // 只保留最近50条日志
      } : undefined,
      batchState: task.batchState ? {
        ...task.batchState,
        batchKeywords: task.batchState.batchKeywords?.map(compressKeyword),
        batchThoughts: task.batchState.batchThoughts?.map(compressBatchThought),
        logs: task.batchState.logs?.slice(-50),
      } : undefined,
      articleGeneratorState: task.articleGeneratorState ? {
        ...task.articleGeneratorState,
        streamEvents: task.articleGeneratorState.streamEvents?.slice(-100).map(compressStreamEvent),
        // 保留 finalArticle，但移除过大的图片数据
        finalArticle: task.articleGeneratorState.finalArticle ? {
          title: task.articleGeneratorState.finalArticle.title,
          content: task.articleGeneratorState.finalArticle.content,
          images: task.articleGeneratorState.finalArticle.images?.slice(0, 5), // 只保留前5张图片引用
        } : null,
      } : undefined,
    };

    await dbOperation(STORE_NAMES.TASKS, 'readwrite', (store) =>
      store.put(taskData)
    );

    // 同时保存完整关键词数据（如果存在）
    if (task.miningState?.keywords?.length) {
      await this.saveKeywords(task.id, task.miningState.keywords);
    }
    if (task.batchState?.batchKeywords?.length) {
      await this.saveKeywords(task.id, task.batchState.batchKeywords);
    }
  }

  /**
   * 保存关键词到 IndexedDB（完整版）
   */
  private async saveKeywords(taskId: string, keywords: KeywordData[]): Promise<void> {
    const db = await initDB();
    const transaction = db.transaction(STORE_NAMES.KEYWORDS, 'readwrite');
    const store = transaction.objectStore(STORE_NAMES.KEYWORDS);

    // 先删除旧的关键词
    const index = store.index('taskId');
    const request = index.openCursor(IDBKeyRange.only(taskId));

    await new Promise<void>((resolve, reject) => {
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });

    // 添加新的关键词 - 确保每个 keyword 都有有效的 id
    let skippedCount = 0;
    for (const keyword of keywords) {
      // 验证 id 是否为有效的 IndexedDB key（string 或 number）
      if (keyword.id === undefined || keyword.id === null ||
        (typeof keyword.id !== 'string' && typeof keyword.id !== 'number')) {
        skippedCount++;
        console.warn('[SmartStorage] Skipping keyword without valid id:', keyword.keyword);
        continue;
      }
      store.put({ ...keyword, taskId });
    }

    if (skippedCount > 0) {
      console.warn(`[SmartStorage] Skipped ${skippedCount} keywords without valid id for task ${taskId}`);
    }
  }

  /**
   * 降级方案：保存精简版任务到 localStorage
   */
  private async saveCompressedTaskToLocalStorage(task: TaskState): Promise<void> {
    const compressedTask = {
      id: task.id,
      type: task.type,
      name: task.name,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      targetLanguage: task.targetLanguage,
      isActive: task.isActive,
      filterLevel: task.filterLevel,
      sortBy: task.sortBy,
      expandedRowId: task.expandedRowId,
      // 只保留必要的状态摘要
      miningState: task.miningState ? {
        seedKeyword: task.miningState.seedKeyword,
        miningRound: task.miningState.miningRound,
        isMining: task.miningState.isMining,
        miningSuccess: task.miningState.miningSuccess,
        wordsPerRound: task.miningState.wordsPerRound,
        miningStrategy: task.miningState.miningStrategy,
        miningMode: task.miningState.miningMode,
        skipSerpVerification: task.miningState.skipSerpVerification,
        userSuggestion: task.miningState.userSuggestion,
        miningConfig: task.miningState.miningConfig,
        selectedWebsite: task.miningState.selectedWebsite,
        websiteId: task.miningState.websiteId,
        websiteUrl: task.miningState.websiteUrl,
        websiteDomain: task.miningState.websiteDomain,
        websiteAnalysis: task.miningState.websiteAnalysis,
        competitorAnalysis: task.miningState.competitorAnalysis,
        keywords: task.miningState.keywords?.slice(0, 50).map(compressKeyword), // 只保留前50个
        agentThoughts: [], // 不保存思维流
        logs: [],
      } : undefined,
      batchState: task.batchState ? {
        batchInputKeywords: task.batchState.batchInputKeywords?.substring(0, 500),
        batchCurrentIndex: task.batchState.batchCurrentIndex,
        batchTotalCount: task.batchState.batchTotalCount,
        batchKeywords: task.batchState.batchKeywords?.slice(0, 50).map(compressKeyword),
        batchThoughts: [],
        logs: [],
      } : undefined,
      articleGeneratorState: task.articleGeneratorState ? {
        keyword: task.articleGeneratorState.keyword,
        currentStage: task.articleGeneratorState.currentStage,
        isGenerating: task.articleGeneratorState.isGenerating,
        progress: task.articleGeneratorState.progress,
        finalArticle: task.articleGeneratorState.finalArticle ? {
          title: task.articleGeneratorState.finalArticle.title,
          content: '', // 不保存文章内容到 localStorage
          images: [],
        } : null,
        streamEvents: [],
        tone: task.articleGeneratorState.tone,
        targetAudience: task.articleGeneratorState.targetAudience,
        visualStyle: task.articleGeneratorState.visualStyle,
        targetMarket: task.articleGeneratorState.targetMarket,
      } : undefined,
    };

    const key = `${STORAGE_PREFIX}task_${task.id}`;
    try {
      localStorage.setItem(key, JSON.stringify(compressedTask));
    } catch (e) {
      console.error('[SmartStorage] Even compressed task failed to save:', e);
    }
  }

  // ==================== 任务读取 ====================

  /**
   * 获取所有任务元数据（快速列表）
   */
  getTaskMetas(): TaskMeta[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TASK_META);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('[SmartStorage] Failed to get task metas:', e);
      return [];
    }
  }

  /**
   * 加载完整任务（从 IndexedDB）
   */
  async loadTask(taskId: string): Promise<TaskState | null> {
    try {
      const task = await dbOperation<TaskState>(
        STORE_NAMES.TASKS,
        'readonly',
        (store) => store.get(taskId)
      );

      if (task) {
        // 加载完整关键词数据
        const keywords = await this.loadKeywords(taskId);
        if (keywords.length > 0) {
          if (task.miningState) {
            task.miningState.keywords = keywords;
          }
          if (task.batchState) {
            task.batchState.batchKeywords = keywords;
          }
        }
      }

      return task;
    } catch (error) {
      console.error(`[SmartStorage] Failed to load task ${taskId}:`, error);
      // 降级：从 localStorage 加载
      return this.loadTaskFromLocalStorage(taskId);
    }
  }

  /**
   * 加载关键词（从 IndexedDB）
   */
  private async loadKeywords(taskId: string): Promise<KeywordData[]> {
    try {
      const db = await initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAMES.KEYWORDS, 'readonly');
        const store = transaction.objectStore(STORE_NAMES.KEYWORDS);
        const index = store.index('taskId');
        const request = index.getAll(taskId);

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[SmartStorage] Failed to load keywords:', error);
      return [];
    }
  }

  /**
   * 从 localStorage 加载任务（降级方案）
   */
  private loadTaskFromLocalStorage(taskId: string): TaskState | null {
    try {
      const key = `${STORAGE_PREFIX}task_${taskId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * 加载所有任务
   */
  async loadAllTasks(): Promise<TaskState[]> {
    try {
      const db = await initDB();
      const tasks = await dbOperation<TaskState[]>(
        STORE_NAMES.TASKS,
        'readonly',
        (store) => store.getAll()
      );
      return (tasks || []).sort((a, b) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('[SmartStorage] Failed to load all tasks:', error);
      return [];
    }
  }

  // ==================== 任务删除 ====================

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      if (this.getActiveTaskId() === taskId) {
        this.saveActiveTaskId(null);
      }
      // 从 IndexedDB 删除
      await dbOperation(STORE_NAMES.TASKS, 'readwrite', (store) =>
        store.delete(taskId)
      );

      // 删除关联的关键词
      const db = await initDB();
      const transaction = db.transaction(STORE_NAMES.KEYWORDS, 'readwrite');
      const store = transaction.objectStore(STORE_NAMES.KEYWORDS);
      const index = store.index('taskId');
      const request = index.openCursor(IDBKeyRange.only(taskId));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      // 从 localStorage 删除元数据
      const metas = this.getTaskMetas().filter(m => m.id !== taskId);
      localStorage.setItem(STORAGE_KEYS.TASK_META, JSON.stringify(metas));

      // 删除 localStorage 中的精简版
      localStorage.removeItem(`${STORAGE_PREFIX}task_${taskId}`);

      console.log(`[SmartStorage] Task ${taskId} deleted`);
    } catch (error) {
      console.error(`[SmartStorage] Failed to delete task ${taskId}:`, error);
    }
  }

  // ==================== 批量操作 ====================

  /**
   * 批量保存任务
   */
  async saveTasks(tasks: TaskState[]): Promise<void> {
    for (const task of tasks) {
      await this.saveTask(task);
    }
  }

  // ==================== 清理操作 ====================

  /**
   * 清理旧数据（超过30天的任务）
   */
  async cleanupOldData(): Promise<void> {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    try {
      const tasks = await this.loadAllTasks();
      const oldTaskIds = tasks
        .filter(t => t.updatedAt < thirtyDaysAgo)
        .map(t => t.id);

      for (const taskId of oldTaskIds) {
        await this.deleteTask(taskId);
      }

      console.log(`[SmartStorage] Cleaned up ${oldTaskIds.length} old tasks`);
    } catch (error) {
      console.error('[SmartStorage] Failed to cleanup old data:', error);
    }
  }

  /**
   * 清理所有本地数据
   */
  async clearAll(): Promise<void> {
    try {
      // 清理 IndexedDB
      const db = await initDB();
      const storeNames = [STORE_NAMES.TASKS, STORE_NAMES.KEYWORDS, STORE_NAMES.THOUGHTS, STORE_NAMES.STREAM_EVENTS];

      for (const storeName of storeNames) {
        await dbOperation(storeName, 'readwrite', (store) => store.clear());
      }

      // 清理 localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      console.log('[SmartStorage] All data cleared');
    } catch (error) {
      console.error('[SmartStorage] Failed to clear all data:', error);
    }
  }

  // ==================== 存储统计 ====================

  /**
   * 获取存储使用情况
   */
  async getStorageStats(): Promise<{
    localStorageUsed: number;
    localStorageLimit: number;
    indexedDBUsed: number;
    taskCount: number;
    keywordCount: number;
  }> {
    // localStorage 使用量
    let localStorageUsed = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localStorageUsed += (localStorage.getItem(key) || '').length * 2; // UTF-16
      }
    }

    // IndexedDB 任务数量
    let taskCount = 0;
    let keywordCount = 0;
    try {
      const tasks = await this.loadAllTasks();
      taskCount = tasks.length;

      const db = await initDB();
      const countRequest = await dbOperation<number>(
        STORE_NAMES.KEYWORDS,
        'readonly',
        (store) => store.count()
      );
      keywordCount = countRequest || 0;
    } catch (e) {
      // Ignore
    }

    return {
      localStorageUsed,
      localStorageLimit: 5 * 1024 * 1024, // ~5MB typical limit
      indexedDBUsed: 0, // Hard to calculate accurately
      taskCount,
      keywordCount,
    };
  }
}

// ==================== 导出单例 ====================

export const smartStorage = SmartStorage.getInstance();

// ==================== 兼容层 - 用于平滑迁移 ====================

/**
 * 从旧版 localStorage 迁移数据到新存储系统
 */
export async function migrateFromOldStorage(): Promise<boolean> {
  const OLD_TASKS_KEY = 'google_seo_tasks';

  try {
    const oldData = localStorage.getItem(OLD_TASKS_KEY);
    if (!oldData) return false;

    const oldTasks: TaskState[] = JSON.parse(oldData);
    if (!oldTasks || oldTasks.length === 0) return false;

    console.log(`[Migration] Found ${oldTasks.length} tasks to migrate`);

    // 初始化新存储
    await smartStorage.init();

    // 迁移每个任务
    for (const task of oldTasks) {
      await smartStorage.saveTask(task);
    }

    // 备份旧数据（而不是直接删除）
    localStorage.setItem(`${OLD_TASKS_KEY}_backup`, oldData);
    localStorage.removeItem(OLD_TASKS_KEY);

    console.log('[Migration] Migration completed successfully');
    return true;
  } catch (error) {
    console.error('[Migration] Failed to migrate:', error);
    return false;
  }
}

/**
 * 兼容旧版 saveTasksToLocalStorage 的包装函数
 */
export async function saveTasksCompat(tasks: TaskState[]): Promise<void> {
  try {
    await smartStorage.saveTasks(tasks);
  } catch (error) {
    console.error('[Storage] Failed to save tasks:', error);
    // 最后的降级方案：只保存任务ID列表
    try {
      const taskIds = tasks.map(t => ({ id: t.id, name: t.name, type: t.type }));
      localStorage.setItem(STORAGE_KEYS.TASK_INDEX, JSON.stringify(taskIds));
    } catch (e) {
      console.error('[Storage] Even task index failed to save:', e);
    }
  }
}

/**
 * 兼容旧版 loadTasksFromLocalStorage 的包装函数
 */
export async function loadTasksCompat(): Promise<TaskState[]> {
  try {
    // 首先尝试从新存储加载
    const tasks = await smartStorage.loadAllTasks();
    if (tasks.length > 0) return tasks;

    // 检查是否需要迁移
    const migrated = await migrateFromOldStorage();
    if (migrated) {
      return smartStorage.loadAllTasks();
    }

    return [];
  } catch (error) {
    console.error('[Storage] Failed to load tasks:', error);
    return [];
  }
}

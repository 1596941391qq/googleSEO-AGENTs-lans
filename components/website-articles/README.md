# Website Articles Manager - 网站文章管理系统

## 📋 概述

这是一个全新的、精致的文章管理UI系统，专为PSEO（Programmatic SEO）批量推广场景设计。系统突出了**网站与文章的1对多关系**，采用紧凑的表格布局，提升信息密度和操作效率。

## 🎨 设计特点

### 1. 三层架构

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: 网站选择器 (Website Selector)                  │
│  - 顶部固定，始终可见                                     │
│  - 显示网站域名 + 快速切换下拉菜单                         │
│  - 展示网站级别聚合数据（总文章数、已发布数、排名中数）      │
├─────────────────────────────────────────────────────────┤
│  Layer 2: 文章列表 (Article Table)                       │
│  - 紧凑表格布局，一屏显示20+文章                          │
│  - 支持排序、筛选、搜索                                   │
│  - 批量选择和批量操作                                     │
│  - 状态用图标+颜色快速识别                                │
├─────────────────────────────────────────────────────────┤
│  Layer 3: 文章详情抽屉 (Article Drawer)                  │
│  - 从右侧滑出，不打断浏览流程                             │
│  - 显示完整内容预览、SEO数据、发布历史                     │
│  - 支持快速编辑和重新发布                                 │
└─────────────────────────────────────────────────────────┘
```

### 2. 核心组件

#### **WebsiteSelector** - 网站选择器
- 玻璃态效果 (`backdrop-blur-sm`)
- 下拉菜单快速切换网站
- 实时显示网站统计数据
- 精致的卡片式指标展示

#### **ArticleTable** - 文章表格
- 紧凑行高 (48-56px)
- 可排序的表头
- 全选/单选复选框
- 悬停高亮效果

#### **ArticleRow** - 表格行
- 状态徽章（draft/generating/published/ranking/failed）
- 关键词标签
- URL路径类型标识（/lab/, /guide/, /tool/, /compare/）
- 发布平台标识（RTD, GH, GL, CF, etc.）
- 排名显示（颜色区分：Top 10绿色，Top 50蓝色）
- 三点菜单操作（查看/编辑/删除）

#### **ArticleDrawer** - 详情抽屉
- 右侧滑入动画
- 完整的文章元数据
- 内容预览（前500字符）
- 时间戳（创建/更新/发布）
- 快速操作按钮

#### **BatchActions** - 批量操作栏
- 底部居中浮动
- 显示选中数量
- 批量发布/归档/删除
- 清除选择按钮

#### **StatusBadge** - 状态徽章
- 5种状态：draft, generating, published, ranking, failed
- 图标 + 文字 + 颜色
- 支持两种尺寸（sm/md）

## 🎯 状态系统

### 文章状态 (ArticleStatus)

| 状态 | 图标 | 颜色 | 说明 |
|------|------|------|------|
| `draft` | Circle | 灰色 | 草稿状态 |
| `generating` | Loader2 (旋转) | 黄色 | AI生成中 |
| `published` | CheckCircle2 | 绿色 | 已发布 |
| `ranking` | TrendingUp | 蓝色 | 排名追踪中 |
| `failed` | AlertCircle | 红色 | 生成/发布失败 |

### URL路径类型 (URLPathType)

| 路径 | 颜色 | 用途 |
|------|------|------|
| `/lab/` | 黄色 | 实验性内容（快刀） |
| `/guide/` | 蓝色 | 长期指南（慢刀） |
| `/tool/` | 紫色 | 工具页面 |
| `/compare/` | 绿色 | 对比页面 |
| `/live/` | 其他 | 实时内容 |

### 发布平台 (PublishPlatform)

| 平台 | 标签 | 颜色 |
|------|------|------|
| Read the Docs | RTD | 蓝色 |
| GitHub Pages | GH | 紫色 |
| GitLab Pages | GL | 橙色 |
| Cloudflare Pages | CF | 黄色 |
| Netlify | NTL | 青色 |
| Vercel | VCL | 灰色 |

## 📦 文件结构

```
components/website-articles/
├── types.ts                      # 类型定义
├── WebsiteSelector.tsx           # 网站选择器
├── StatusBadge.tsx               # 状态徽章
├── ArticleRow.tsx                # 表格行
├── ArticleTable.tsx              # 文章表格
├── ArticleDrawer.tsx             # 详情抽屉
├── BatchActions.tsx              # 批量操作栏
├── WebsiteArticlesManager.tsx    # 主容器组件
└── index.ts                      # 导出文件
```

## 🚀 使用方法

### 1. 在 ProjectDashboard 中集成

```tsx
import { WebsiteArticlesManager } from '../website-articles';

// 在组件中添加视图切换
const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'articles'>('kanban');

// 渲染
{viewMode === 'articles' ? (
  <WebsiteArticlesManager
    isDarkTheme={isDarkTheme}
    uiLanguage={uiLanguage}
  />
) : (
  // 原有的看板视图
)}
```

### 2. 独立使用

```tsx
import { WebsiteArticlesManager } from './components/website-articles';

function App() {
  return (
    <WebsiteArticlesManager
      isDarkTheme={true}
      uiLanguage="zh"
    />
  );
}
```

## 🎨 设计系统

### 颜色方案

基于现有的 `design-tokens.ts`：

- **品牌色**: `emerald-400/500` (主要操作)
- **成功**: `emerald-500` (已发布、排名好)
- **警告**: `amber-500` (生成中、实验性)
- **错误**: `red-500` (失败)
- **信息**: `blue-500` (排名中)
- **中性**: `zinc-400/500` (草稿、未开始)

### 间距系统

- **卡片内边距**: `p-6` (移动端) / `p-8` (桌面端)
- **表格行高**: `py-3` (48px)
- **组件间距**: `gap-3` / `gap-4` / `gap-6`

### 圆角系统

- **小圆角**: `rounded-lg` (8px) - 按钮、徽章
- **中圆角**: `rounded-xl` (12px) - 卡片、输入框
- **大圆角**: `rounded-2xl` (16px) - 模态框、抽屉

### 动画系统

- **快速**: `duration-200` - 悬停、点击反馈
- **正常**: `duration-300` - 页面切换、抽屉滑入
- **缓慢**: `duration-500` - 复杂动画

## 🔧 功能特性

### ✅ 已实现

- [x] 网站选择器（下拉菜单 + 统计数据）
- [x] 紧凑表格布局
- [x] 状态徽章系统
- [x] 表格排序功能
- [x] 搜索过滤
- [x] 单选/全选复选框
- [x] 右侧详情抽屉
- [x] 批量操作栏
- [x] 响应式设计（移动端适配）
- [x] 玻璃态效果
- [x] 流畅动画

### ⏳ 待实现

- [ ] 高级筛选器（按状态、平台、URL路径筛选）
- [ ] 分页功能
- [ ] 拖拽排序
- [ ] 批量发布/归档/删除的实际API调用
- [ ] 与后端API集成（目前使用Mock数据）
- [ ] 实时排名追踪
- [ ] 文章编辑器集成
- [ ] 导出功能（CSV/Excel）

## 📱 移动端适配

- 表格在移动端自动切换为卡片列表
- 保持触摸目标 ≥ 44px (Apple HIG标准)
- 支持左滑显示操作按钮
- 底部批量操作栏自动适配安全区域

## 🎯 性能优化

- 使用 `React.memo` 优化组件渲染
- 虚拟滚动（大数据量时）
- 懒加载图片
- 防抖搜索输入
- 批量操作使用 Promise.all

## 📝 数据结构

### Website

```typescript
interface Website {
  id: string;
  domain: string;
  url: string;
  totalArticles: number;
  publishedCount: number;
  rankingCount: number;
  createdAt: string;
}
```

### Article

```typescript
interface Article {
  id: string;
  websiteId: string;
  title: string;
  keyword: string;
  urlPath: URLPathType | string;
  platform: PublishPlatform;
  status: ArticleStatus;
  ranking?: number;
  traffic?: number;
  content?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}
```

## 🎉 总结

这个新的UI系统完全重构了文章管理界面，从大卡片布局改为紧凑表格布局，信息密度提升3-5倍，更符合PSEO批量推广的实际使用场景。设计遵循Apple风格的精致感，使用玻璃态效果、流畅动画和合理的视觉层次，提供了专业级的用户体验。

---

**Created**: 2026-01-26
**Version**: 1.0.0
**Design System**: Apple-inspired, Glassmorphism
**Framework**: React + TypeScript + Tailwind CSS

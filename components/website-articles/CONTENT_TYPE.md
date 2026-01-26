# 内容类型（Content Type）说明

## 📋 概述

在我们的PSEO系统中，文章分为两种**内容类型**（也称为搜索意图）：**信息型**和**商业型**。这个分类的核心目的是**自动分配发布平台**，避免同一平台被过度使用导致封号风险。

## 🎯 两种内容类型

### 1. **信息型 (Informational)** 🔵

- **图标**: Info (ℹ️)
- **颜色**: 蓝色
- **标签**: 信息 / I
- **发布平台**: RTD (Read the Docs) / Cloudflare Pages
- **说明**: 教程、指南、知识类内容

**关键词示例**:
- "what is..."
- "how to..."
- "guide to..."
- "tutorial"
- "learn"
- "introduction"

**内容特点**:
- 长篇教程（2000+ 字）
- 详细的步骤说明
- 图表和示例
- 适合建立权威

---

### 2. **商业型 (Commercial)** 🟣

- **图标**: ShoppingCart (🛒)
- **颜色**: 紫色
- **标签**: 商业 / C
- **发布平台**: Netlify / Vercel
- **说明**: 产品评测、对比、推荐类内容

**关键词示例**:
- "best..."
- "top 10..."
- "review"
- "vs" / "versus"
- "comparison"
- "alternatives"
- "pricing"

**内容特点**:
- 产品对比（1500-2000 字）
- 优缺点列表
- 价格信息
- 适合转化

---

## 🚀 自动平台分配逻辑

### 系统工作流程

```
文章创建 → 标记内容类型 → 发布时自动选择平台
```

1. **AI生成时标记**: 在生成文章时，AI会根据关键词自动判断内容类型
2. **手动调整**: 用户可以在文章列表中查看和调整内容类型
3. **自动分配**: 发布时，系统根据内容类型从Admin配置的站点池中自动选择可用平台

### 平台分配规则

| 内容类型 | 优先平台 | 备选平台 | 原因 |
|---------|---------|---------|------|
| 信息型 | RTD | Cloudflare | 技术文档平台，适合教程 |
| 商业型 | Netlify | Vercel | 商业化平台，适合营销内容 |

### 代码实现

在 `api/articles/publish.ts` 中：

```typescript
// 确定内容类型
const contentType: 'informational' | 'commercial' = article.content_type || 'informational';

// 系统自动从站点池中选择对应类型的平台
const siteBinding = await assignSiteToWebsite(projectId, contentType);
```

---

## 💡 为什么要分开发布？

### 1. **风险分散**

- 避免单一平台被过度使用
- 降低被封号的风险
- 提高系统稳定性

### 2. **平台特性匹配**

- **RTD/Cloudflare**: 适合技术文档，权威性高
- **Netlify/Vercel**: 适合商业内容，转化率高

### 3. **SEO优化**

- 不同类型的内容在不同平台上表现更好
- 多平台分布提高整体排名

### 4. **资源利用**

- 充分利用Admin配置的所有平台Token
- 自动负载均衡

---

## 📊 UI 展示

### 表格列

```
[状态] [标题] [关键词] [类型] [URL路径] [平台] [排名]
                        ↓
                    🔵 信息 → RTD
                    🟣 商业 → Netlify
```

### 意图徽章

- **信息型**: 蓝色徽章，悬停显示 "信息型内容 → 发布到 RTD/Cloudflare"
- **商业型**: 紫色徽章，悬停显示 "商业型内容 → 发布到 Netlify/Vercel"

---

## 🔧 使用指南

### 1. 查看文章类型

在文章列表中，每篇文章都会显示其内容类型徽章：

- 🔵 **信息** = 将发布到 RTD/Cloudflare
- 🟣 **商业** = 将发布到 Netlify/Vercel

### 2. 发布流程

```
1. 选择文章
2. 点击"发布"
3. 系统自动根据内容类型选择平台
4. 无需手动配置Token
5. 自动创建仓库和部署
```

### 3. 平台绑定

- 首次发布时，系统自动从Admin配置的站点池中分配站点
- 后续发布复用已绑定的站点
- 一个项目可以同时拥有信息型和商业型站点

---

## 📈 最佳实践

### 1. 内容组合建议

```
信息型: 60% (建立权威，吸引流量)
商业型: 40% (引导转化，提高收益)
```

### 2. 关键词选择

- **信息型**: 选择教程类、问答类关键词
- **商业型**: 选择对比类、评测类关键词

### 3. 内部链接策略

```
信息型文章 → 商业型文章
(学习)      (对比/购买)
```

### 4. 平台健康度监控

- 定期检查各平台的使用情况
- 避免单一平台文章过多
- 保持平台间的平衡

---

## 🛠️ Admin 配置

### 站点池管理

Admin需要在后台配置两类平台的Token：

**信息型平台**:
- Read the Docs Token
- Cloudflare Pages Token
- GitHub Token（用于创建仓库）

**商业型平台**:
- Netlify Token
- Vercel Token
- GitHub Token（用于创建仓库）

### 自动分配算法

系统会根据以下因素选择平台：
1. 平台类型匹配（informational/commercial）
2. Token可用性
3. 使用次数（负载均衡）
4. 平台状态（active/pending）

---

## 🔍 技术细节

### 数据库字段

```sql
-- published_articles 表
content_type VARCHAR(20) -- 'informational' | 'commercial'
```

### TypeScript 类型

```typescript
export type SearchIntent = 'informational' | 'commercial';

export interface Article {
  // ... 其他字段
  intent: SearchIntent;
}
```

### API 接口

```typescript
// POST /api/articles/publish
{
  articleId: string;
  projectId?: string;
  // content_type 从文章记录中读取，无需传递
}
```

---

## ⚠️ 注意事项

1. **不要过度设计**: 只有两种类型，不要添加更多
2. **自动分配**: 用户无需关心具体发布到哪个平台
3. **类型准确**: AI生成时尽量准确判断类型
4. **手动调整**: 如果AI判断错误，用户可以手动调整

---

## 🎯 总结

- **两种类型**: 信息型（教程）、商业型（评测）
- **自动分配**: 系统根据类型自动选择发布平台
- **风险分散**: 避免单一平台过度使用
- **简单高效**: 用户无需配置，一键发布

---

**更新时间**: 2026-01-26
**版本**: 1.0.0 (简化版)
**核心目的**: 自动平台分配，风险分散

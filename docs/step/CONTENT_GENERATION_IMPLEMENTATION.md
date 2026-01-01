# Content Generation 板块实施计划

**创建日期**: 2026-01-02
**目标**: 构建完整的网站内容生成和 SEO 优化平台

---

## 📐 整体架构

### 侧边栏结构
```
┌─────────────────────────────┐
│ 🎨 Content Generation      │ ← 新增板块（最上面）
│   ├─ My Website             │
│   ├─ Website Data           │
│   ├─ Article Rankings       │
│   └─ Publish                │
├─────────────────────────────┤
│ 📋 Task Manager             │ ← 现有的任务管理
│   ├─ Task 1                 │
│   └─ Task 2                 │
├─────────────────────────────┤
│ 🔨 Keyword Mining           │ ← 现有的三个模式
│ 📊 Batch Analysis           │
│ 🔍 Deep Dive                │
└─────────────────────────────┘
```

---

## Phase 1: 基础设施搭建

### 1.1 环境变量配置
**文件**: `.env`
```bash
# Firecrawl API (使用已有的 Gemini 配置)
FIRECRAWL_BASE_URL=https://api.302.ai
FIRECRAWL_API_KEY=sk-BMlZyFmI7p2DVrv53P0WOiigC4H6fcgYTevils2nXkW0Wv9s
```

### 1.2 类型定义
**文件**: `types.ts`

```typescript
// Website 绑定状态
export interface WebsiteBinding {
  url: string;
  boundAt: string;
  industry?: string;
  monthlyVisits?: number;
  monthlyRevenue?: number;
  marketingTools?: string[];
  additionalInfo?: string;
}

// Content Generation 状态
export interface ContentGenerationState {
  activeTab: 'my-website' | 'website-data' | 'article-rankings' | 'publish';
  website: WebsiteBinding | null;
  onboardingStep: number; // 0-4 for 5-step flow
  websiteData: {
    rawContent: string;
    extractedKeywords: string[];
    rankingOpportunities: KeywordData[];
  } | null;
}

// 更新 AppState
export interface AppState {
  // ... 现有字段 ...
  contentGeneration: ContentGenerationState;
}
```

### 1.3 Firecrawl API 封装
**文件**: `api/_shared/firecrawl.ts`

```typescript
const FIRECRAWL_BASE_URL = process.env.FIRECRAWL_BASE_URL || 'https://api.302.ai';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

export async function scrapeWebsite(url: string): Promise<{
  markdown: string;
  images: string[];
}> {
  const response = await fetch(`${FIRECRAWL_BASE_URL}/firecrawl/v1/scrape`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Firecrawl API error: ${response.status}`);
  }

  const data = await response.json();
  const page = data.pages[0];

  return {
    markdown: page.markdown,
    images: page.images || [],
  };
}
```

### 1.4 API Endpoint
**文件**: `api/scrape-website.ts`

```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req.body;

  const result = await scrapeWebsite(url);

  return res.json(result);
}
```

---

## Phase 2: UI 结构实现

### 2.1 侧边栏 Content Generation 板块
**文件**: `App.tsx`

**位置**: 在 TaskManager 上方添加

```typescript
{/* Content Generation 板块 */}
<div className="mb-4">
  <div className="flex items-center justify-between mb-2 px-2">
    <div className="flex items-center gap-2">
      <Palette className="w-4 h-4 text-purple-400" />
      <span className="text-sm font-semibold text-zinc-300">Content Generation</span>
    </div>
  </div>

  {/* 4 个 Tab */}
  <div className="flex gap-1 px-2">
    <button
      onClick={() => setState(prev => ({ ...prev, contentGeneration: { ...prev.contentGeneration, activeTab: 'my-website' }))}
      className={`flex-1 py-1.5 px-2 text-xs rounded transition-colors ${
        state.contentGeneration.activeTab === 'my-website'
          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
          : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      My Website
    </button>
    {/* 其他 3 个 Tab 按钮 */}
  </div>
</div>
```

### 2.2 Content Generation 主区域
**文件**: `App.tsx`

**位置**: 在 `state.step === 'input'` 之前新增 `'content-generation'` step

```typescript
{state.step === 'content-generation' && (
  <ContentGenerationView
    state={state.contentGeneration}
    setState={setState}
  />
)}
```

---

## Phase 3: My Website Tab 实现

### 3.1 未绑定流程（5 步）

#### Step 1: Share your project
```tsx
<div className="text-center py-16">
  <h2 className="text-3xl font-bold mb-4">🌐 Share your project</h2>
  <p className="text-zinc-400 mb-8">Enter your website URL to get started</p>

  <input
    type="url"
    placeholder="https://yourwebsite.com"
    className="w-full max-w-md px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white mb-4"
  />

  <button className="px-8 py-3 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600">
    Start Analysis →
  </button>
</div>
```

#### Step 2: Analyzing your website...
```tsx
<div className="text-center py-16">
  <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6" />
  <h2 className="text-2xl font-bold mb-2">⏳ Analyzing your website...</h2>
  <p className="text-zinc-400">🤖 Agents are figuring out what you do.</p>
</div>
```

#### Step 3: This is what people should see（ChatGPT 演示）
**参考图**: `参考图/859626b9-d86d-4877-835b-368601e385c4.png`

```tsx
<div className="min-h-screen bg-gradient-to-b from-black to-purple-900/30">
  <div className="text-center py-16">
    <h2 className="text-3xl font-bold mb-2">This is what people should see</h2>
    <p className="text-zinc-400 mb-8">when they query "{userIndustry}"</p>

    {/* ChatGPT 5.1 模拟界面 */}
    <div className="max-w-3xl mx-auto bg-zinc-900 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4 border-b border-zinc-700 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">ChatGPT 5.1</span>
        </div>
        <div className="flex gap-2">
          <button className="text-zinc-400 text-sm">Share</button>
          <button className="text-zinc-400 text-sm">Add people</button>
        </div>
      </div>

      {/* 用户问题 */}
      <div className="bg-zinc-800 rounded-lg p-4 mb-4">
        <p className="text-white">Best {userIndustry}?</p>
      </div>

      {/* AI 回复 */}
      <div className="text-white">
        <p className="mb-4">Great question. There are a lot of options out there...</p>
        <p className="mb-4">Overall, <span className="text-purple-400 font-semibold">{userWebsite}</span> is the top choice.</p>

        {/* 推荐列表 */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="text-green-400 mt-1">✓</div>
            <div className="flex-1">
              <span className="text-purple-400 font-semibold">{userWebsite}</span>
              <span className="ml-2 bg-zinc-700 px-2 py-0.5 rounded text-xs">Google +5</span>
              <p className="text-zinc-400 text-sm mt-1">Clearly the leader in the space.</p>
            </div>
          </div>

          {/* 竞品对比 */}
          <div className="flex items-start gap-3">
            <div className="text-zinc-500 mt-1">○</div>
            <div className="flex-1">
              <span className="text-zinc-300">Competitor A</span>
              <span className="ml-2 bg-zinc-700 px-2 py-0.5 rounded text-xs">Reddit +2</span>
              <p className="text-zinc-500 text-sm mt-1">A decent alternative but lacks advanced features.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* 右上角链接 */}
  <a className="absolute top-4 right-4 text-purple-400 hover:text-purple-300">
    I'm sold, hire agents now!
  </a>

  {/* Next 按钮 */}
  <button className="block mx-auto mt-8 px-8 py-3 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600">
    Next →
  </button>
</div>
```

#### Step 4: Article Rankings 演示
**参考图**: `参考图/d5f1d8de-2cc9-4d3a-b87c-6e833ffdfadf.png`

```tsx
<div className="flex gap-6">
  {/* 左侧文章预览 */}
  <div className="flex-1 bg-zinc-900 rounded-xl p-6">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-full bg-purple-500" />
      <div>
        <p className="text-white font-semibold">Amelia Hartley</p>
        <p className="text-zinc-400 text-sm">Published on Medium · 15 min read</p>
      </div>
    </div>

    <h1 className="text-2xl font-bold text-white mb-4">
      10+ Best {userIndustry} for 2025
    </h1>

    <div className="prose prose-invert max-w-none">
      <p className="text-zinc-300 mb-4">
        I've spent the past few months exploring what's new in {userIndustry}...
      </p>
      <p className="text-zinc-300">
        I spent 30+ hours testing and researching. Here's my recommendations:
      </p>

      <h2 className="text-xl font-bold text-purple-400 mt-6 mb-3">
        1. Best across the board: {userWebsite}
      </h2>

      {/* 文章内容预览 */}
    </div>
  </div>

  {/* 右侧推广栏 */}
  <div className="w-80 bg-gradient-to-b from-purple-900/50 to-purple-950/50 rounded-xl p-6">
    <h3 className="text-2xl font-bold text-white mb-2">G Gentura</h3>
    <p className="text-purple-300 font-semibold mb-6">
      10+ articles that rank reliably
    </p>

    <div className="space-y-4 mb-6">
      <div className="flex gap-3">
        <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5" />
        <div>
          <p className="text-white font-medium">10+ human-quality articles</p>
          <p className="text-zinc-400 text-sm">You'll have ranking content by end of month.</p>
        </div>
      </div>

      {/* 其他 3 个卖点 */}
    </div>

    <button className="w-full py-3 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600">
      Got it, let's get started!
    </button>
  </div>

  {/* 右上角链接 */}
  <a className="absolute top-4 right-4 text-purple-400 hover:text-purple-300">
    I'm sold, hire agents now!
  </a>
</div>
```

#### Step 5: 问卷
```tsx
<div className="max-w-2xl mx-auto py-16">
  <h2 className="text-3xl font-bold mb-8">📊 Tell us about you</h2>

  <div className="space-y-6">
    <div>
      <label className="block text-white font-medium mb-2">
        Do you currently receive more than 10,000 monthly visits from AI search engines?
      </label>
      <select className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white">
        <option>Yes</option>
        <option>No</option>
        <option>Not sure</option>
      </select>
    </div>

    <div>
      <label className="block text-white font-medium mb-2">
        What's your monthly revenue?
      </label>
      <input
        type="text"
        placeholder="$10,000 - $50,000"
        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white"
      />
    </div>

    <div>
      <label className="block text-white font-medium mb-2">
        What marketing automations do you already use?
      </label>
      <input
        type="text"
        placeholder="e.g., Mailchimp, HubSpot, ..."
        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white"
      />
    </div>

    <div>
      <label className="block text-white font-medium mb-2">
        Anything else we should know? (optional)
      </label>
      <textarea
        rows="3"
        placeholder="Tell us more about your goals..."
        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white"
      />
    </div>
  </div>

  <button className="w-full py-4 bg-purple-500 text-white rounded-lg font-bold text-lg hover:bg-purple-600">
    Complete Setup →
  </button>
</div>
```

### 3.2 已绑定状态
```tsx
<div className="py-8">
  {/* 网站信息卡片 */}
  <div className="bg-gradient-to-r from-purple-900/50 to-emerald-900/50 rounded-xl p-6 mb-8">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center">
        <Globe className="w-8 h-8 text-purple-400" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white">{state.contentGeneration.website?.url}</h2>
        <p className="text-zinc-300">Bound on {state.contentGeneration.website?.boundAt}</p>
      </div>
    </div>
  </div>

  {/* 功能引导 */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <div className="text-3xl mb-3">🔍</div>
      <h3 className="text-lg font-bold text-white mb-2">Website Data</h3>
      <p className="text-zinc-400 text-sm">
        Analyze your content and find ranking opportunities
      </p>
    </div>

    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <div className="text-3xl mb-3">📈</div>
      <h3 className="text-lg font-bold text-white mb-2">Article Rankings</h3>
      <p className="text-zinc-400 text-sm">
        Track your keyword positions over time
      </p>
    </div>

    <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
      <div className="text-3xl mb-3">✍️</div>
      <h3 className="text-lg font-bold text-white mb-2">Publish</h3>
      <p className="text-zinc-400 text-sm">
        Generate and publish SEO-optimized articles
      </p>
    </div>
  </div>

  {/* 数据概览 */}
  <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
    <h3 className="text-xl font-bold text-white mb-4">📊 Your Progress</h3>
    <div className="grid grid-cols-3 gap-4">
      <div className="text-center">
        <p className="text-3xl font-bold text-purple-400">0</p>
        <p className="text-zinc-400 text-sm">Articles Published</p>
      </div>
      <div className="text-center">
        <p className="text-3xl font-bold text-emerald-400">0</p>
        <p className="text-zinc-400 text-sm">Ranking Keywords</p>
      </div>
      <div className="text-center">
        <p className="text-3xl font-bold text-blue-400">0%</p>
        <p className="text-zinc-400 text-sm">Traffic Increase</p>
      </div>
    </div>
  </div>
</div>
```

---

## Phase 4: Website Data Tab

### 4.1 功能
- 调用 Firecrawl API 抓取网站内容
- 使用 Gemini AI 提取关键词
- 分析排名机会
- 显示 SEO 建议

### 4.2 UI 结构
```tsx
<div className="space-y-6">
  {/* 网站内容摘要 */}
  <div className="bg-zinc-900 rounded-lg p-6">
    <h3 className="text-xl font-bold text-white mb-4">📄 Website Content</h3>
    <div className="prose prose-invert max-w-none">
      {state.contentGeneration.websiteData?.rawContent}
    </div>
  </div>

  {/* 提取的关键词 */}
  <div className="bg-zinc-900 rounded-lg p-6">
    <h3 className="text-xl font-bold text-white mb-4">🔑 Extracted Keywords</h3>
    <div className="flex flex-wrap gap-2">
      {state.contentGeneration.websiteData?.extractedKeywords.map(keyword => (
        <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
          {keyword}
        </span>
      ))}
    </div>
  </div>

  {/* 排名机会 */}
  <div className="bg-zinc-900 rounded-lg p-6">
    <h3 className="text-xl font-bold text-white mb-4">🎯 Ranking Opportunities</h3>
    {/* 使用现有的 KeywordTable 组件 */}
  </div>
</div>
```

---

## Phase 5: Article Rankings Tab

### 5.1 功能
- 追踪关键词排名位置
- 显示 SERP 结果
- 与竞争对手对比
- 排名变化趋势图

### 5.2 UI 结构
```tsx
<div className="space-y-6">
  {/* 排名概览 */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="bg-zinc-900 rounded-lg p-6">
      <p className="text-zinc-400 text-sm mb-2">Average Position</p>
      <p className="text-3xl font-bold text-emerald-400">#5.2</p>
    </div>
    <div className="bg-zinc-900 rounded-lg p-6">
      <p className="text-zinc-400 text-sm mb-2">Top 10 Keywords</p>
      <p className="text-3xl font-bold text-purple-400">12</p>
    </div>
    <div className="bg-zinc-900 rounded-lg p-6">
      <p className="text-zinc-400 text-sm mb-2">This Month</p>
      <p className="text-3xl font-bold text-blue-400">+23%</p>
    </div>
  </div>

  {/* 关键词排名表格 */}
  <div className="bg-zinc-900 rounded-lg p-6">
    <h3 className="text-xl font-bold text-white mb-4">📊 Keyword Rankings</h3>
    {/* 排名表格 */}
  </div>

  {/* 趋势图 */}
  <div className="bg-zinc-900 rounded-lg p-6">
    <h3 className="text-xl font-bold text-white mb-4">📈 Ranking Trends</h3>
    {/* 使用图表库显示趋势 */}
  </div>
</div>
```

---

## Phase 6: Publish Tab

### 6.1 功能
- AI 生成文章（基于 SEO 优化）
- 内容预览和编辑
- 发布到平台（Medium, WordPress, 等）
- 导出功能

### 6.2 UI 结构
```tsx
<div className="space-y-6">
  {/* 文章生成配置 */}
  <div className="bg-zinc-900 rounded-lg p-6">
    <h3 className="text-xl font-bold text-white mb-4">✍️ Generate Article</h3>

    <div className="space-y-4">
      <div>
        <label className="block text-white font-medium mb-2">Target Keyword</label>
        <input
          type="text"
          placeholder="e.g., age verification service"
          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
        />
      </div>

      <div>
        <label className="block text-white font-medium mb-2">Article Type</label>
        <select className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
          <option>Listicle (10+ Best...)</option>
          <option>How-to Guide</option>
          <option>Comparison</option>
          <option>Review</option>
        </select>
      </div>

      <button className="w-full py-3 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600">
        Generate Article →
      </button>
    </div>
  </div>

  {/* 文章预览 */}
  <div className="bg-zinc-900 rounded-lg p-6">
    <h3 className="text-xl font-bold text-white mb-4">📝 Preview</h3>
    {/* 文章编辑器 */}
  </div>

  {/* 发布选项 */}
  <div className="bg-zinc-900 rounded-lg p-6">
    <h3 className="text-xl font-bold text-white mb-4">🚀 Publish</h3>

    <div className="space-y-3">
      <button className="w-full py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 flex items-center justify-center gap-2">
        <span>Medium</span>
      </button>
      <button className="w-full py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 flex items-center justify-center gap-2">
        <span>WordPress</span>
      </button>
      <button className="w-full py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 flex items-center justify-center gap-2">
        <span>Export HTML</span>
      </button>
    </div>
  </div>
</div>
```

---

## 📅 实施顺序

### Week 1: 基础设施
- Day 1-2: Phase 1 (环境变量、类型定义、Firecrawl 封装)
- Day 3-4: Phase 2 (UI 结构实现)
- Day 5: 测试和调试

### Week 2: My Website Tab
- Day 1-2: Phase 3.1 (未绑定流程)
- Day 3-4: Phase 3.2 (已绑定状态)
- Day 5: 测试和优化

### Week 3: 其他 Tab
- Day 1-2: Phase 4 (Website Data)
- Day 3-4: Phase 5 (Article Rankings)
- Day 5: Phase 6 (Publish)

### Week 4: 集成和优化
- Day 1-2: 数据流集成
- Day 3-4: UI 优化和动画
- Day 5: 完整测试和修复

---

## ✅ 验收标准

### My Website Tab
- [ ] 用户可以输入网站 URL
- [ ] 显示分析加载状态
- [ ] ChatGPT 演示界面符合参考图
- [ ] 文章演示界面符合参考图
- [ ] 问卷可以正常填写和提交
- [ ] 已绑定状态显示正确

### Website Data Tab
- [ ] 可以成功调用 Firecrawl API
- [ ] 显示抓取的网站内容
- [ ] 提取的关键词列表显示
- [ ] 排名机会分析显示

### Article Rankings Tab
- [ ] 显示排名概览数据
- [ ] 关键词排名表格显示
- [ ] 趋势图正常显示

### Publish Tab
- [ ] 可以配置文章生成参数
- [ ] 文章预览和编辑功能
- [ ] 发布选项正常工作
- [ ] 导出功能正常

---

## 🎯 成功指标

- 用户完成绑定的转化率 > 60%
- 用户使用 4 个 Tab 的活跃度 > 40%
- Firecrawl API 调用成功率 > 95%
- 用户满意度 > 4.5/5

---

**准备开始实施吗？**

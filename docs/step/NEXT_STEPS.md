# 下一步工作计划

---

## 🔥 当前任务（立即执行）

### 1. Agent 过程可视化
**目标**: 让用户看到 AI 工作的实时细节，增加趣味性

**实现内容**:
- 实时进度显示（当前步骤、进度条）
- Agent 想法气泡（AI 正在思考什么）
- 生成内容预览（实时显示关键词、分析结果）
- 洞察高亮���重要发现用特殊样式显示）

**技术方案**:
```typescript
// 新增状态字段
agentVisualization: {
  currentStep: string;        // 当前步骤描述
  stepProgress: number;       // 进度 0-100
  thoughts: string[];         // Agent 想法列表
  previews: any[];            // 生成内容预览
  insights: string[];         // 重要洞察
}
```

**文件**:
- `components/workflow/AgentWorkflowVisualizer.tsx` (新建)
- 修改 `App.tsx` 添加可视化状态管理
- 修改 API 调用返回实时进度

**预计耗时**: 4-6 小时

---

## ⏳ 待办任务（后续执行）

### 2. Firecrawl 网站挖词功能
- 集成 Firecrawl API
- 添加"输入网址"挖词选项
- 自动分析网站内容提取关键词

### 3. 网站绑定与追踪
- 用户绑定自己的网站
- 追踪排名数据
- 与竞争对手对比

### 4. 多代理系统
- Agent 1: SEO 研究员
- Agent 2: 内容写手
- Agent 3: 质量审查
- Agent 4: 图像创意

---

## 📝 已完成功能

### ✅ 行业精确配置
- 点击"精确行业"选择行业
- 添加其他建议给 AI
- 配置显示在输入框上方
- 挖词时传递所有信息给 agent
- **文件**: `components/workflow/KeywordMiningGuide.tsx`, `App.tsx:5069`, `types.ts`

### ✅ UI 主题统一
- 所有绿色改为 Emerald Green
- **文件**: `components/workflow/KeywordMiningGuide.tsx`

---

## 🎯 优先级排序

1. **🔥 最高**: Agent 过程可视化（当前任务）
2. **⏳ 高**: Firecrawl 网站挖词
3. **⏳ 中**: 网站绑定与追踪
4. **⏳ 低**: 多代理系统（Phase 2）

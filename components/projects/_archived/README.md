# Archived Components

**归档日期**: 2024-01-26

这些组件已被新的 `KeywordManagerDashboard` 系统替代。

## 归档文件列表

### ProjectDashboard.tsx
- **替代组件**: `components/keywords/KeywordManagerDashboard.tsx`
- **原因**: 从看板布局重构为表格布局，功能更强大
- **主要改进**:
  - 搜索功能
  - 多维度筛选（概率、意图、项目）
  - 多字段排序
  - 批量操作
  - 智能分页

### ProjectMetricsCards.tsx
- **替代组件**: `components/keywords/KeywordStatsCards.tsx`
- **原因**: 统计指标更新，适配新的关键词管理视角
- **主要改进**:
  - 4个核心指标（总数、高概率、已生成、待处理）
  - 更清晰的视觉设计

### ProjectListTable.tsx
- **替代组件**: `components/keywords/KeywordDataTable.tsx`
- **原因**: 不再需要项目列表表格，改为关键词数据表格
- **主要改进**:
  - 直接显示关键词数据（而非项目）
  - 可排序列
  - 批量选择
  - 更高的信息密度

## 功能对照

| 旧功能 | 新功能 | 位置 |
|--------|--------|------|
| 看板视图 | 表格视图 | KeywordDataTable |
| 项目卡片 | 关键词行 | KeywordDataTable |
| 项目详情 | 项目筛选器 | KeywordFiltersBar |
| 统计卡片 | 统计卡片 | KeywordStatsCards |

## 回滚方案

如果需要恢复旧版本：

```bash
# 从归档恢复
cp _archived/ProjectDashboard.tsx ./
cp _archived/ProjectMetricsCards.tsx ./
cp _archived/ProjectListTable.tsx ./

# 修改 ContentGenerationView.tsx
# 将 import { KeywordManagerDashboard } 改回 import { ProjectDashboard }
```

## 删除计划

- **1周后** (2024-02-02): 确认新功能稳定
- **2周后** (2024-02-09): 如无问题，可考虑删除
- **1个月后** (2024-02-26): 完全移除归档目录

## 相关文档

- 重构报告: `KEYWORD_MANAGER_REFACTOR.md`
- 清理指南: `CODE_CLEANUP_GUIDE.md`

---

**注意**: 这些文件仅供参考和回滚使用，不应在新代码中引用。

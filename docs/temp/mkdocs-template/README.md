# NicheDigger PSEO - MkDocs Template

这是一个用于 **NicheDigger AI + PSEO Agent** 的 MkDocs 项目模板，用于自动发布内容到 Read the Docs。

## 🚀 快速开始

### 1. 创建 GitHub 仓库

```bash
# 克隆此模板
git clone https://github.com/your-username/mkdocs-template.git ai-seo-docs
cd ai-seo-docs

# 初始化新仓库
rm -rf .git
git init
git add .
git commit -m "Initial commit"

# 推送到 GitHub
git remote add origin https://github.com/your-username/ai-seo-docs.git
git push -u origin main
```

### 2. 连接 Read the Docs

1. 登录 [Read the Docs](https://readthedocs.org/)
2. 点击 "Import a Project"
3. 选择你的 GitHub 仓库
4. RTD 会自动检测 `mkdocs.yml` 和 `.readthedocs.yaml`
5. 点击 "Build" 开始构建

### 3. 配置 NicheDigger

在 NicheDigger 发布配置中填入：

- **GitHub Token**: 你的 Personal Access Token（需要 `repo` 权限）
- **仓库所有者**: `your-username`
- **仓库名称**: `ai-seo-docs`
- **分支**: `main`
- **文档目录**: `docs`

### 4. 开始发布

在 NicheDigger 中选择文章，点击「发布到 RTD」即可！

---

## 📁 目录结构

```
ai-seo-docs/
├── docs/
│   ├── index.md           # 首页
│   ├── lab/               # 实验区（快刀）
│   │   └── index.md
│   ├── guide/             # 指南区（慢刀）
│   │   └── index.md
│   ├── compare/           # 对比区（商业意图）
│   │   └── index.md
│   ├── tool/              # 工具区
│   │   └── index.md
│   ├── stylesheets/
│   │   └── extra.css
│   └── javascripts/
│       └── extra.js
├── mkdocs.yml             # MkDocs 配置
├── requirements.txt       # Python 依赖
├── .readthedocs.yaml      # RTD 配置
└── README.md
```

## 🔪 快慢刀机制

| 路径 | 用途 | 策略 |
|------|------|------|
| `/lab/` | 短期曝光测试 | 快刀 - 7-14 天观察 |
| `/guide/` | 长期转化内容 | 慢刀 - 胜出者继承 |
| `/compare/` | 商业意图强 | 转化出口 |
| `/tool/` | 工具展示 | 功能介绍 |

### 内链规则（单向漏斗）

```
lab → guide/tool → compare
```

**绝对不要反向链接！**

## 🔧 本地开发

```bash
# 安装依赖
pip install -r requirements.txt

# 本地预览
mkdocs serve

# 构建静态站点
mkdocs build
```

## 📊 SEO 优化建议

1. **保持更新频率**: 每周至少更新一次胜出页面
2. **内容中性原则**: 避免过度商业化，RTD 是技术文档平台
3. **Canonical 配置**: 在文章末尾植入指向主站的 Canonical URL
4. **结构化数据**: 使用 Schema.org 标记增强搜索结果

---

## 📚 相关文档

- [MkDocs 官方文档](https://www.mkdocs.org/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
- [Read the Docs 文档](https://docs.readthedocs.io/)
- [NicheDigger PSEO 白皮书](./docs/AI%20+%20PSEO%20Agent：自动化搜索流量基础设施白皮书.md)

---

*Powered by NicheDigger - AI + PSEO Agent*

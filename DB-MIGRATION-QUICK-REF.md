# 数据库迁移快速参考

## 🚀 一键命令

### 对比并生成迁移
```
"对比本地和线上数据库，生成迁移 SQL"
```

### 检查特定表
```
"检查 [表名] 在本地和线上的差异"
```

### 查看本地表结构
```
"使用 postgres-local 查看所有表"
```

### 查看线上表结构
```
"使用 postgres-prod 查看所有表"
```

---

## 📋 常用 SQL 查询

### 查看所有表
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

### 查看表结构
```sql
\d table_name
-- 或
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'your_table';
```

### 查看索引
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'your_table';
```

### 查看外键
```sql
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

---

## ⚡ 迁移模板

### 新增表
```sql
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 新增列
```sql
ALTER TABLE table_name
ADD COLUMN column_name TYPE DEFAULT value;
```

### 修改列类型
```sql
ALTER TABLE table_name
ALTER COLUMN column_name TYPE new_type;
```

### 新增索引
```sql
CREATE INDEX idx_table_column ON table_name(column_name);
```

### 新增外键
```sql
ALTER TABLE table_name
ADD CONSTRAINT fk_name
FOREIGN KEY (column_id) REFERENCES other_table(id);
```

---

## ✅ 安全检查清单

执行前必须确认：

- [ ] 已备份数据库
- [ ] 已在本地测试
- [ ] 已检查 SQL 语句
- [ ] 已准备回滚方案
- [ ] 已选择低流量时段

---

## 🔗 相关文档

- [MCP-README.md](./MCP-README.md) - MCP 完整指南
- [DB-MIGRATION-GUIDE.md](./DB-MIGRATION-GUIDE.md) - 迁移详细文档
- [POSTGRES-MCP-SETUP.md](./POSTGRES-MCP-SETUP.md) - PostgreSQL MCP 安装

---

**快速访问**: 将此文件保存为书签，随时查阅！

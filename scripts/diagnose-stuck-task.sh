#!/bin/bash
# 诊断长时间运行的任务

echo "=== 检查正在运行的 Node 进程 ==="
ps aux | grep -E "(node|vercel|vite)" | grep -v grep

echo ""
echo "=== 检查端口占用情况 ==="
lsof -i :3000 -i :3002 -i :3003 2>/dev/null || echo "lsof 命令不可用"

echo ""
echo "=== 检查最近的 API 请求（从日志） ==="
echo "提示：请在浏览器开发者工具的 Network 标签中查看："
echo "1. 找到状态为 'pending' 或耗时超过 30 秒的请求"
echo "2. 查看请求 URL 和 Payload"
echo "3. 检查 Response 标签是否有部分响应"

echo ""
echo "=== 建议的排查步骤 ==="
echo "1. 打开浏览器开发者工具 (F12)"
echo "2. 切换到 Network 标签"
echo "3. 找到卡住的请求（通常显示为 'pending'）"
echo "4. 右键点击该请求 → Copy → Copy as cURL"
echo "5. 将 cURL 命令发给我，我可以帮您分析"

echo ""
echo "=== 临时解决方案 ==="
echo "如果任务卡住超过 5 分钟，建议："
echo "1. 刷新浏览器页面"
echo "2. 重新触发任务"
echo "3. 如果仍然卡住，可能需要调整超时设置"

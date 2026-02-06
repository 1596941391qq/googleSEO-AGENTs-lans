@echo off
REM MCP 快速安装脚本
REM 用于 NicheDigger 项目

echo ========================================
echo MCP 服务安装脚本
echo ========================================
echo.

echo [1/4] 安装 GitHub MCP...
claude mcp add github -- npx -y @modelcontextprotocol/server-github
echo.

echo [2/4] 安装 Filesystem MCP...
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem D:\google-seo-agent
echo.

echo [3/4] 安装 Fetch MCP...
claude mcp add fetch -- npx -y @modelcontextprotocol/server-fetch
echo.

echo [4/4] 验证安装...
claude mcp list
echo.

echo ========================================
echo 安装完成！
echo ========================================
echo.
echo 注意：
echo 1. GitHub MCP 需要设置环境变量 GITHUB_PERSONAL_ACCESS_TOKEN
echo 2. PostgreSQL MCP 需要手动安装（需要数据库连接字符串）
echo 3. 详细说明请查看 MCP-README.md
echo.

pause

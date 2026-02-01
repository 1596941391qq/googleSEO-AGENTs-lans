#!/bin/bash
# PostgreSQL 17 Client Tools Install Script for macOS

echo "=== PostgreSQL 17 Client Tools Installation (macOS) ==="

# 1. 检查 Homebrew 是否安装
if ! command -v brew &> /dev/null; then
    echo "Error: Homebrew not found. Please install it first from https://brew.sh/"
    exit 1
fi

# 2. 安装 PostgreSQL 17 (keg-only, 不会覆盖系统自带版本)
echo "[1/3] Installing postgresql@17 via Homebrew..."
brew install postgresql@17

# 3. 配置环境变量 (让系统优先找到 pg_dump v17)
# 针对 Apple Silicon (M1/M2/M3) 和 Intel 路径处理
BREW_PREFIX=$(brew --prefix)
PG_BIN="$BREW_PREFIX/opt/postgresql@17/bin"

echo "[2/3] Configuring PATH..."
if [[ ! ":$PATH:" == *":$PG_BIN:"* ]]; then
    # 临时加入当前会话
    export PATH="$PG_BIN:$PATH"
    
    # 永久加入 zshrc (macOS 默认使用 zsh)
    if [ -f "$HOME/.zshrc" ]; then
        if ! grep -q "$PG_BIN" "$HOME/.zshrc"; then
            echo "export PATH=\"$PG_BIN:\$PATH\"" >> "$HOME/.zshrc"
            echo "Added $PG_BIN to ~/.zshrc"
        fi
    fi
fi

# 4. 验证安装
echo "[3/3] Verifying installation..."
if command -v pg_dump &> /dev/null; then
    VERSION=$(pg_dump --version)
    echo "Success! $VERSION is now available."
    echo "PostgreSQL tools path: $PG_BIN"
else
    echo "Error: Installation failed or pg_dump not in PATH."
    exit 1
fi

echo "Done!"

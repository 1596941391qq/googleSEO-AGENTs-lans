#!/bin/bash

# 推送 MkDocs 必需文件到 GitHub

GITHUB_TOKEN="${GITHUB_TOKEN:-}"
OWNER="ylyy"
REPO="pseo-site-fd0f7f66"
BRANCH="main"

echo "=== 推送 mkdocs.yml ==="
cat > /tmp/mkdocs.yml << 'EOF'
site_name: PSEO Site
site_description: Auto-generated PSEO site
theme:
  name: material
  palette:
    primary: indigo
    accent: indigo
  features:
    - navigation.instant
    - navigation.tracking
    - navigation.tabs
    - navigation.sections
    - navigation.expand
    - navigation.top
    - search.suggest
    - search.highlight
    - content.code.copy

markdown_extensions:
  - admonition
  - pymdownx.details
  - pymdownx.superfences
  - pymdownx.tabbed
  - pymdownx.highlight
  - pymdownx.inlinehilite
  - pymdownx.snippets
  - toc:
      permalink: true

nav:
  - Home: index.md
EOF

CONTENT=$(base64 -i /tmp/mkdocs.yml)
curl -X PUT "https://api.github.com/repos/$OWNER/$REPO/contents/mkdocs.yml" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Add mkdocs.yml\",\"content\":\"$CONTENT\",\"branch\":\"$BRANCH\"}"

echo -e "\n\n=== 推送 requirements.txt ==="
cat > /tmp/requirements.txt << 'EOF'
mkdocs>=1.5.0
mkdocs-material>=9.0.0
pymdown-extensions>=10.0
EOF

CONTENT=$(base64 -i /tmp/requirements.txt)
curl -X PUT "https://api.github.com/repos/$OWNER/$REPO/contents/requirements.txt" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Add requirements.txt\",\"content\":\"$CONTENT\",\"branch\":\"$BRANCH\"}"

echo -e "\n\n=== 推送 docs/index.md ==="
cat > /tmp/index.md << 'EOF'
# Welcome to PSEO Site

This is an auto-generated site for SEO content.

## Articles

Browse the navigation menu to view published articles.
EOF

CONTENT=$(base64 -i /tmp/index.md)
curl -X PUT "https://api.github.com/repos/$OWNER/$REPO/contents/docs/index.md" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Add index page\",\"content\":\"$CONTENT\",\"branch\":\"$BRANCH\"}"

echo -e "\n\n✅ 所有文件已推送!"

# Build Workflow

## Content SSOT

**entaticspiral.com 的 SSOT = `src/**/*.md`**

每個 Markdown 文件必須包含 frontmatter：
- `title` - 頁面標題
- `type` - 頁面類型（`overview`, `term`, `law`, `essay`, `lab`, `links`, `index`）
- `slug` - URL slug（詞條頁必須）
- `status` - 狀態（`active`, `draft`, `deprecated`，詞條頁必須）
- `last_updated` - 更新日期（YYYY-MM-DD 格式）
- `related` - 相關頁面連結（數組）
- `defined_in` - 定義來源（詞條頁必須，數組）
- `tags` - 標籤（詞條頁可選，數組）

## Layout 固定化

### BaseLayout.html
適用於：Overview, Index, Law, Essays, Lab, Links

包含：
- Header（機構化標題 + 導航）
- Breadcrumb
- Main content
- Footer（citation block）

### TermLayout.html
適用於：Terms

包含：
- BaseLayout 所有內容
- 右側 info box（status / defined_in / related）
- 詞條專用結構

## Build Rules（必須自動化）

Build 時生成：

```
/index.html              # Overview
/terms/                  # Terms index
/terms/{slug}/           # Individual terms
/law/                    # Law index
/law/{slug}/             # Individual law pages
/essays/                 # Essays index
/essays/{slug}/          # Individual essays
/lab/                    # Lab index
/lab/{slug}/             # Individual lab pages
/links/                  # Links index
/links/{slug}/           # Individual link pages
/latest/                 # Latest updates (from frontmatter aggregation)
/index/                  # Full site index (grouped by type)
```

## QA（每次 build 必跑）

### 內部連結檢查
- 檢查所有 `[text](/path/)` 連結是否存在
- 報告 404 錯誤

### Slug 唯一性檢查
- 確保所有 `slug` 在相同類型中唯一
- 報告重複 slug

### last_updated 格式檢查
- 驗證 `YYYY-MM-DD` 格式
- 報告格式錯誤

### Citation Block 檢查
- 確保每頁都有 citation block（在 Markdown 內容中或由模板生成）
- 報告缺失的 citation

## Ecosystem 接口（只做"指向"不做"複製"）

### spiral.ooo
- 在 Lab 中放置卡片與導讀
- 不複製完整內容，只提供入口

### law.spiral.ooo
- 在 Law 中放置導讀與索引
- 指向外部 canonical 版本

### braintank.ai
- 只在 Links / Ecosystem 中提及
- 標記為 sibling property

## 建議的構建工具

### Option 1: Astro
```bash
npm create astro@latest
# 使用 Markdown + HTML 模板
```

### Option 2: Eleventy
```bash
npm install -g @11ty/eleventy
# 使用 Markdown + Nunjucks/Liquid 模板
```

### Option 3: Next.js SSG
```bash
npx create-next-app@latest
# 使用 Markdown + React 組件
```

### Option 4: 純 HTML（手動）
- 手動替換模板變數
- 使用簡單腳本處理 Markdown → HTML

## 自動化腳本示例

### 檢查腳本（Node.js）

```javascript
// scripts/check.js
const fs = require('fs');
const path = require('path');

// 檢查 frontmatter
// 檢查連結
// 檢查 slug 唯一性
// 檢查日期格式
```

### 構建腳本

```bash
# scripts/build.sh
# 1. 運行檢查
# 2. 生成 HTML
# 3. 複製靜態資源
# 4. 生成索引頁
```


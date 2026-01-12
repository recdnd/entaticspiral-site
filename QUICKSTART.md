# Quick Start Guide

## 安裝和構建

### 1. 安裝依賴

```bash
npm install
```

這將安裝以下依賴：
- `fast-glob` - 文件掃描
- `gray-matter` - Frontmatter 解析
- `markdown-it` - Markdown 轉 HTML

### 2. 構建站點

```bash
npm run build
```

構建腳本會：
1. 讀取所有 `src/**/*.md` 文件
2. 驗證 frontmatter 和內容規範
3. 渲染 HTML 頁面
4. 生成自動索引頁（`/index/terms/` 和 `/latest/`）
5. 複製樣式和靜態資源到 `dist/`

### 3. 預覽構建結果

```bash
cd dist
python3 -m http.server 8000
```

然後在瀏覽器中訪問 http://localhost:8000

---

## 構建驗證

構建腳本會自動執行以下驗證：

✅ **Frontmatter 完整性** - 所有頁面必須有 title, type, slug, last_updated  
✅ **日期格式** - last_updated 必須是 YYYY-MM-DD 格式  
✅ **Slug 唯一性** - 不允許重複的 slug  
✅ **Canonical URL 唯一性** - 不允許重複的 URL  
✅ **Citation Block** - 每個頁面必須有 citation 區塊  
✅ **內部連結** - 所有站內連結必須指向存在的頁面  
✅ **Terms 規範** - Terms 頁面必須有 Definition 和 Related Terms 區塊  
✅ **時間指代** - 禁止使用 "currently", "now", "today" 等隱式時間詞

如果任何驗證失敗，構建將停止並顯示錯誤列表。

---

## 文件結構

```
entaticspiral-site/
├── src/              # Markdown 源文件
│   ├── index.md      # 首頁
│   ├── terms/        # 詞條
│   ├── essays/       # 文章
│   ├── law/          # 法律文檔
│   ├── lab/          # 實驗室
│   └── links/        # 連結
├── layouts/          # HTML 模板
│   ├── BaseLayout.html
│   └── TermLayout.html
├── styles/           # CSS 樣式
│   ├── tokens.css
│   ├── base.css
│   └── components.css
├── tools/            # 構建工具
│   └── build.mjs
└── dist/             # 構建輸出（自動生成）
```

---

## 常見問題

### 構建失敗：缺少 frontmatter 字段

確保所有 Markdown 文件都有完整的 frontmatter：

```yaml
---
title: "Page Title"
type: "page"
slug: "page-slug"
last_updated: "2026-01-12"
---
```

### 構建失敗：內部連結錯誤

檢查 Markdown 中的連結是否指向正確的路徑。Terms 頁面使用 `/terms/{slug}/` 格式。

### 構建失敗：Citation 區塊缺失

確保每個 Markdown 文件都有 `## Citation` 區塊：

```markdown
## Citation
**Defined in:** Source Name  
**Canonical URL:** /path/to/page  
**Last updated:** 2026-01-12
```

---

## 下一步

構建成功後，你可以：

1. **部署到靜態託管** - 將 `dist/` 目錄上傳到 Netlify, Vercel, GitHub Pages 等
2. **自定義樣式** - 修改 `styles/tokens.css` 中的設計 token
3. **添加內容** - 在 `src/` 目錄中添加新的 Markdown 文件
4. **自動化部署** - 設置 CI/CD 流程自動構建和部署

---

## 技術支持

如有問題，請檢查：
- `BUILD-CHECKLIST.md` - 完整的構建檢查清單
- `BUILD.md` - 構建工作流文檔
- 構建腳本的錯誤輸出


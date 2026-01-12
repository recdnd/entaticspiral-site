# 前端預覽指南

## 快速開始

### 方法 1：使用啟動腳本（推薦）

```bash
./start-preview.sh
```

### 方法 2：使用 Python HTTP 服務器

```bash
python3 -m http.server 8000
```

### 方法 3：使用 Node.js serve

```bash
npm run preview:node
# 或
npx serve . -p 8000
```

## 預覽頁面

啟動服務器後，在瀏覽器中訪問：

- **首頁預覽**: http://localhost:8000/preview.html
- **詞條頁預覽**: http://localhost:8000/preview-term.html

## 文件說明

### 預覽文件
- `preview.html` - 首頁預覽（Overview 頁面）
- `preview-term.html` - 詞條頁預覽（Term 頁面，含側邊欄）

### 樣式文件
- `styles/tokens.css` - 設計 token（顏色、字體、間距）
- `styles/base.css` - 基礎樣式（body、容器、標題）
- `styles/components.css` - 組件樣式（header、nav、box、grid）

### 模板文件
- `layouts/BaseLayout.html` - 基礎布局模板（含變數占位符）
- `layouts/TermLayout.html` - 詞條頁布局模板（含側邊欄）

## 設計系統檢視

### 顏色系統
- **主權色**: `#7a1f2b` (--accent)
- **文檔藍**: `#1a5fb4` (--link)
- **灰階**: 從 `#111` (ink) 到 `#f4f4f4` (panel)

### 字體系統
- **標題**: Serif（Iowan Old Style, Palatino, Georgia）
- **正文**: Sans-serif（系統字體棧）

### 布局特點
- 最大寬度：1040px
- 左右留白：24px（桌面）
- 行寬：65-75ch（正文）
- 響應式：900px 以下單欄布局

## 下一步

預覽確認設計後，可以：
1. 調整 CSS token（在 `styles/tokens.css`）
2. 修改布局模板（在 `layouts/`）
3. 選擇構建工具（Astro / Eleventy / Next.js）
4. 實現 Markdown → HTML 轉換


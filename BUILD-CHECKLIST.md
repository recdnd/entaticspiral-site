# Build Checklist & Validation Rules

## 目標

在 **不引入後端、不改變目錄結構** 的前提下，使 entaticspiral.com 成為：

* 可穩定 build 的靜態站
* 可被 AI / 搜索引擎信任的文檔源
* 結構一致、不可悄悄腐化的"制度型文檔庫"

---

## 一、Build Checklist（構建必須完成的事項）

### 1. Markdown → HTML 基礎構建

**必須保證：**

* `src/**/*.md` 全部被解析為 HTML 頁面
* 所有頁面統一使用 `BaseLayout.html`
* `terms/*` 頁面使用 `TermLayout.html`

**輸出路徑規則：**

* `src/index.md` → `/index.html`
* `src/terms/fragment.md` → `/terms/fragment/index.html`
* `src/essays/what-is-spiral.md` → `/essays/what-is-spiral/index.html`

---

### 2. Frontmatter 強制字段解析

所有 Markdown 頁面 **必須讀取 frontmatter**，並用於：

* `<title>` 標籤
* breadcrumb
* citation block
* index / latest 聚合

**最低必需字段（所有頁面）：**

* `title`
* `type`
* `slug`
* `last_updated`

---

### 3. 自動生成 Index Pages

#### A. `/index/terms`

**生成規則：**

* 掃描 `src/terms/*.md`
* 按 `slug` 或 `title` 排序
* 輸出：

  * Term 名稱
  * 1 句 description（取 Definition 第一行）
  * 連結到 canonical URL

> 當前可先手寫占位，**但 build 管道必須支持自動生成**

---

#### B. `/latest`

**生成規則：**

* 掃描所有頁面 frontmatter
* 按 `last_updated` 倒序
* 輸出最近 N 條（建議 10）

字段：

* title
* type
* last_updated
* canonical URL

---

### 4. Canonical URL 注入

**每個頁面 `<head>` 中必須包含：**

```html
<link rel="canonical" href="https://entaticspiral.com/{slug-path}/">
```

slug-path 規則：

* terms → `/terms/{slug}/`
* essays → `/essays/{slug}/`
* law → `/law/{slug}/`

---

### 5. Citation Block 強制渲染

每個頁面底部必須渲染 Citation 區塊，包含：

* Defined in（如有）
* Canonical URL
* Last updated

即使 Markdown 未寫完整，**HTML 中也必須存在 citation 容器**。

---

## 二、Validation Rules（構建時必須校驗，否則失敗）

> 這些規則是你這個系統"不會悄悄爛掉"的關鍵。

---

### Rule 1 — Frontmatter 完整性

**Fail if：**

* 缺少 `title`
* 缺少 `type`
* 缺少 `slug`
* 缺少 `last_updated`

---

### Rule 2 — `last_updated` 格式

**允許格式：**

* `YYYY-MM-DD`

**Fail if：**

* 使用自然語言
* 使用時間戳
* 留空

---

### Rule 3 — Slug 唯一性

**Fail if：**

* 任意兩個頁面 slug 相同
* slug 與目錄名衝突（如 `/terms/terms`）

---

### Rule 4 — Canonical URL 唯一性

**Fail if：**

* 生成出的 canonical URL 重複
* canonical URL 與輸出路徑不一致

---

### Rule 5 — Citation Block 存在性

**Fail if：**

* 頁面 HTML 中不存在 citation 容器
* citation 中缺少 canonical URL 或 last_updated

---

### Rule 6 — 內部連結有效性

**Fail if：**

* Markdown 中出現站內連結指向不存在的 slug
* breadcrumb 指向的父級不存在

---

### Rule 7 — Terms 規範性（僅 terms/）

僅對 `src/terms/*.md` 生效。

**Fail if：**

* `type ≠ "term"`
* 缺少 `Definition` section
* 缺少 `Related Terms` section

---

### Rule 8 — 禁止隱式狀態

**Fail if：**

* 頁面內容引用"latest", "current", "now" 等時間指代但未在 metadata 中標註
* 頁面行為依賴構建時間以外的狀態

---

## 三、推薦的 Build 順序

```text
1. Parse all Markdown files under src/
2. Validate frontmatter fields and formats
3. Build canonical URL map and detect conflicts
4. Render HTML pages with layouts
5. Inject canonical link + citation block
6. Generate /index/terms and /latest
7. Validate internal links and breadcrumbs
8. Output static files
```

---

## 四、使用方式

### 安裝依賴

```bash
npm install
```

### 構建站點

```bash
npm run build
```

### 預覽構建結果

```bash
cd dist
python3 -m http.server 8000
```

然後訪問 http://localhost:8000

---

## 五、構建輸出

構建成功後，所有文件將輸出到 `dist/` 目錄：

```
dist/
├── index.html
├── terms/
│   ├── fragment/
│   │   └── index.html
│   └── ...
├── essays/
├── law/
├── lab/
├── links/
├── index/
│   └── terms/
│       └── index.html
├── latest/
│   └── index.html
└── styles/
    ├── tokens.css
    ├── base.css
    └── components.css
```

---

## 六、驗證狀態

構建腳本會自動執行所有驗證規則。如果任何規則失敗，構建將停止並顯示錯誤列表。

成功輸出示例：

```
BUILD OK.
Pages: 28
Output: /path/to/entaticspiral-site/dist
```


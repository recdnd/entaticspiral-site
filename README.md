# Entatic Spiral Site

**定位：** EntaticSpiral = "Spiral Universe 的官方文檔/百科入口站"（偏 Cornell library / 大學百科 / wiki），以靜態為主，只做「可引用、可索引、可讀」的內容站，不承擔 runtime、帳號、支付、資料庫等產品責任。

## Ecosystem 關係

- **entaticspiral.com** - 官方文檔/百科入口站（本專案）
- **spiral.ooo** - 可互動產品（flame editor / suscoin / RWX / Arc 流程）
- **law.spiral.ooo** - 制度檔案館（TXT→JSON SSOT 的靜態卡片系統）
- **core.rec.ooo / spiral-core-series** - 算法/規格研究原型文檔
- **rec.ooo** - 個人入口站
- **braintank.ai** - 研究出版平台（sibling property，不歸入主導航）

## 技術路線

- **靜態優先**：Markdown→HTML，SEO/可引用/可閱讀/可長期維護
- **動態只做前端小互動**：站內搜尋（client-side）、目錄展開、tabs、引用塊折疊
- **產品功能由 spiral.ooo 承擔**：用戶、支付、編輯器、API

## Structure

```
entaticspiral.com/
  public/          # Static assets
  src/             # Content pages (Markdown)
    index.md       # Overview page
    terms/         # Term definitions
    law/           # Law / Specification
    essays/        # Interpretive articles
    lab/           # Demos and playgrounds
    links/         # External resources
  layouts/         # HTML templates
    BaseLayout.html
    TermLayout.html
  styles/          # CSS files
    tokens.css     # Design tokens
    base.css       # Base styles
    components.css # Component styles
  redirects/       # External link mappings
```

## Design System

The site uses a Cornell Library-inspired design system with:

- **Typography**: Serif for headings, sans-serif for body
- **Color**: Single accent color (#7a1f2b) + grayscale
- **Layout**: Max-width 1040px, generous whitespace
- **Components**: Boxed content panels, tab navigation, breadcrumbs

## Next Steps

1. Choose a static site generator (Astro, Eleventy, Next.js SSG, or pure HTML)
2. Convert templates to your chosen framework
3. Add build configuration
4. Fill in placeholder content

## CSS Tokens

All design tokens are defined in `styles/tokens.css`. Customize the `--accent` color to match your Spiral brand color.


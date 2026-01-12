# 部署指南

## 構建狀態

✅ **構建成功**
- 總頁面數：29
- 輸出目錄：`dist/`
- 所有驗證規則通過

## 部署選項

### 選項 1：Netlify（推薦）

#### 自動部署（GitHub/GitLab）

1. 將代碼推送到 Git 倉庫
2. 登錄 [Netlify](https://www.netlify.com/)
3. 點擊 "New site from Git"
4. 選擇你的倉庫
5. 構建設置：
   - Build command: `npm run build`
   - Publish directory: `dist`
6. 點擊 "Deploy site"

Netlify 會自動使用 `netlify.toml` 配置文件。

#### 手動部署

```bash
# 構建站點
npm run build

# 使用 Netlify CLI
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

---

### 選項 2：Vercel

#### 自動部署（GitHub/GitLab）

1. 將代碼推送到 Git 倉庫
2. 登錄 [Vercel](https://vercel.com/)
3. 點擊 "New Project"
4. 導入你的倉庫
5. Vercel 會自動檢測配置（使用 `vercel.json`）

#### 手動部署

```bash
# 構建站點
npm run build

# 使用 Vercel CLI
npm install -g vercel
vercel --prod
```

---

### 選項 3：GitHub Pages

1. 在 `package.json` 中添加部署腳本：

```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```

2. 安裝 gh-pages：

```bash
npm install --save-dev gh-pages
```

3. 部署：

```bash
npm run deploy
```

4. 在 GitHub 倉庫設置中啟用 GitHub Pages，選擇 `gh-pages` 分支。

---

### 選項 4：其他靜態託管

#### Cloudflare Pages

1. 連接 Git 倉庫
2. 構建命令：`npm run build`
3. 輸出目錄：`dist`

#### AWS S3 + CloudFront

```bash
# 構建
npm run build

# 上傳到 S3
aws s3 sync dist/ s3://your-bucket-name --delete

# 配置 CloudFront 分發
```

---

## 自定義域名

### Netlify

1. 在 Netlify 儀表板中進入 "Domain settings"
2. 添加自定義域名：`entaticspiral.com`
3. 按照指示配置 DNS 記錄

### Vercel

1. 在項目設置中進入 "Domains"
2. 添加域名：`entaticspiral.com`
3. 配置 DNS 記錄

---

## 環境變量（如需要）

如果未來需要環境變量，可以在部署平台設置：

- `SITE_URL` - 站點 URL（用於 canonical links）
- `BUILD_DATE` - 構建日期

---

## 持續集成（CI/CD）

### GitHub Actions 示例

創建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=dist
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## 檢查清單

部署前確認：

- [ ] `npm run build` 成功執行
- [ ] `dist/` 目錄包含所有文件
- [ ] 所有頁面可以正常訪問
- [ ] CSS 和樣式正確加載
- [ ] 內部連結正常工作
- [ ] Canonical URLs 正確設置
- [ ] 移動端響應式正常

---

## 故障排除

### 構建失敗

檢查：
1. Node.js 版本（建議 18+）
2. 所有依賴已安裝
3. Frontmatter 格式正確
4. 沒有驗證錯誤

### 頁面 404

檢查：
1. 路由重寫規則配置正確
2. 文件路徑正確（`/terms/fragment/index.html`）
3. 服務器配置支持 SPA 路由

### 樣式未加載

檢查：
1. CSS 文件路徑正確（`/styles/tokens.css`）
2. 靜態資源複製到 `dist/`
3. 服務器配置允許 CSS 文件訪問

---

## 下一步

部署成功後：

1. 測試所有頁面
2. 檢查 SEO 設置（meta tags, canonical URLs）
3. 設置 Google Search Console
4. 配置分析工具（如需要）
5. 設置監控和錯誤追蹤


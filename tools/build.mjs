/**
 * entaticspiral.com static builder (MVP)
 * - Reads all Markdown files from src/
 * - Validates frontmatter + slugs + last_updated + citation presence
 * - Renders Markdown -> HTML
 * - Applies layouts/BaseLayout.html + layouts/TermLayout.html
 * - Generates /latest/ and /index/terms/
 *
 * Assumptions:
 * - Project root contains: src/, layouts/, styles/, public/
 * - layouts/BaseLayout.html and layouts/TermLayout.html exist
 * - Output folder: dist/
 *
 * Install:
 *   npm i gray-matter markdown-it fast-glob
 *
 * Run:
 *   node tools/build.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const LAYOUT_DIR = path.join(ROOT, "layouts");
const PUBLIC_DIR = path.join(ROOT, "public");
const DIST_DIR = path.join(ROOT, "dist");

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

const REQUIRED_FM = ["title", "type", "slug", "last_updated"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------- utilities ----------
async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function normalizeSlug(slug) {
  // keep simple: lowercase, trim, spaces to hyphen
  return String(slug).trim().toLowerCase().replace(/\s+/g, "-");
}

function toUrlPath(page) {
  // canonical path mapping
  const t = page.fm.type;
  const slug = page.fm.slug;
  if (t === "term") return `/terms/${slug}/`;
  if (t === "essay") return `/essays/${slug}/`;
  if (t === "law") return `/law/${slug}/`;
  if (t === "index") {
    // special: allow index pages to live under /index/
    // e.g. src/index/terms.md => /index/terms/
    if (page.srcRel.startsWith("index/")) {
      const relNoExt = page.srcRel.replace(/\.md$/, "");
      return `/${relNoExt}/`.replace(/\/index$/, "/index/"); // no-op safety
    }
    return `/${slug}/`;
  }
  if (page.srcRel === "index.md") return `/`;
  // default: path-based if nested
  // e.g. src/links/ecosystem.md -> /links/ecosystem/
  const relNoExt = page.srcRel.replace(/\.md$/, "");
  return `/${relNoExt}/`;
}

function toOutputFile(urlPath) {
  // /terms/fragment/ -> dist/terms/fragment/index.html
  const cleaned = urlPath.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!cleaned) return path.join(DIST_DIR, "index.html");
  return path.join(DIST_DIR, cleaned, "index.html");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripMdToOneLineDefinition(markdown) {
  // naive: find "## Definition" and take next non-empty line(s)
  const lines = markdown.split(/\r?\n/);
  let i = lines.findIndex((l) => l.trim().toLowerCase() === "## definition");
  if (i === -1) return "";
  for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
    const t = lines[j].trim();
    if (!t) continue;
    // stop at next heading
    if (t.startsWith("#")) break;
    // remove markdown formatting lightly
    return t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/`([^`]+)`/g, "$1");
  }
  return "";
}

function hasHeading(markdown, headingText) {
  const needle = `## ${headingText}`.toLowerCase();
  return markdown
    .split(/\r?\n/)
    .some((l) => l.trim().toLowerCase() === needle);
}

function findInternalLinks(markdown) {
  // internal links: (/terms/xxx) or /something/yyy
  // capture hrefs starting with "/"
  const links = [];
  const re = /\[[^\]]*?\]\((\/[^)]+)\)/g;
  let m;
  while ((m = re.exec(markdown))) links.push(m[1]);
  return links;
}

function compareDateDesc(a, b) {
  // YYYY-MM-DD lexical works
  return String(b).localeCompare(String(a));
}

// ---------- layout rendering ----------
async function loadLayout(name) {
  const p = path.join(LAYOUT_DIR, name);
  const txt = await fs.readFile(p, "utf8");
  return txt;
}

/**
 * Very small templating:
 * Replace {{key}} with provided values.
 * Supported keys: title, content, breadcrumb, citation, canonical, last_updated, subtitle (optional)
 */
function applyTemplate(layoutHtml, vars) {
  let out = layoutHtml;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{{${k}}}`, v ?? "");
  }
  // remove any unreplaced tokens
  out = out.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, "");
  return out;
}

function makeBreadcrumb(page) {
  // Cornell-ish breadcrumb: Overview / Section / Title
  const url = page.urlPath;
  const parts = url.split("/").filter(Boolean);
  const crumbs = [{ label: "Overview", href: "/" }];

  if (parts.length >= 1) {
    const top = parts[0];
    const sectionMap = {
      terms: "Terms",
      law: "Law",
      essays: "Essays",
      lab: "Lab",
      links: "Links",
      index: "Index",
    };
    if (sectionMap[top]) {
      crumbs.push({ label: sectionMap[top], href: `/${top}/` });
    } else {
      // unknown top folder, still show
      crumbs.push({ label: top, href: `/${top}/` });
    }
  }
  // final
  if (page.srcRel !== "index.md") {
    crumbs.push({ label: page.fm.title, href: page.urlPath });
  }

  // render as simple HTML
  return `
<nav class="breadcrumb" aria-label="Breadcrumb">
  ${crumbs
    .map(
      (c, idx) =>
        `<a href="${c.href}">${escapeHtml(c.label)}</a>${
          idx < crumbs.length - 1 ? `<span class="sep">/</span>` : ""
        }`
    )
    .join("")}
</nav>
`.trim();
}

function makeCitation(page) {
  const definedIn = Array.isArray(page.fm.defined_in)
    ? page.fm.defined_in
    : page.fm.defined_in
    ? [page.fm.defined_in]
    : [];

  const definedLine =
    definedIn.length > 0
      ? `<div><strong>Defined in:</strong> ${escapeHtml(definedIn.join("; "))}</div>`
      : "";

  return `
<section class="citation box" id="citation">
  <h2>Citation</h2>
  ${definedLine}
  <div><strong>Canonical URL:</strong> <a href="${page.urlPath}">${escapeHtml(page.urlPath)}</a></div>
  <div><strong>Last updated:</strong> ${escapeHtml(page.fm.last_updated)}</div>
</section>
`.trim();
}

function injectCanonicalLink(html, canonicalAbs) {
  // If layout already has {{canonical}} placeholder, use that.
  // Otherwise inject before </head>.
  if (html.includes("{{canonical}}")) return html.replaceAll("{{canonical}}", canonicalAbs);
  const tag = `<link rel="canonical" href="${canonicalAbs}">`;
  if (html.includes("</head>")) return html.replace("</head>", `  ${tag}\n</head>`);
  return `${tag}\n${html}`;
}

// ---------- validation ----------
function validateFrontmatter(page, errors) {
  for (const k of REQUIRED_FM) {
    if (page.fm[k] === undefined || page.fm[k] === null || String(page.fm[k]).trim() === "") {
      errors.push(`[Frontmatter] Missing "${k}" in ${page.srcRel}`);
    }
  }
  if (page.fm.slug) {
    const norm = normalizeSlug(page.fm.slug);
    if (norm !== page.fm.slug) {
      errors.push(
        `[Frontmatter] slug should be normalized "${norm}" but got "${page.fm.slug}" in ${page.srcRel}`
      );
    }
  }
  if (page.fm.last_updated && !DATE_RE.test(String(page.fm.last_updated))) {
    errors.push(
      `[Frontmatter] last_updated must be YYYY-MM-DD, got "${page.fm.last_updated}" in ${page.srcRel}`
    );
  }
}

function validateTermsShape(page, errors) {
  if (!page.srcRel.startsWith("terms/")) return;
  // Skip index pages
  if (page.fm.type === "index") return;
  if (page.fm.type !== "term") {
    errors.push(`[Terms] type must be "term" for ${page.srcRel}`);
  }
  if (!hasHeading(page.raw, "Definition")) {
    errors.push(`[Terms] Missing "## Definition" in ${page.srcRel}`);
  }
  if (!hasHeading(page.raw, "Related Terms")) {
    errors.push(`[Terms] Missing "## Related Terms" in ${page.srcRel}`);
  }
}

function validateCitationPresence(page, errors) {
  // We enforce citation container in HTML during render,
  // but also require the markdown to include a "Citation" section for authoring discipline.
  // If you want ONLY HTML enforcement, remove this rule.
  if (!hasHeading(page.raw, "Citation")) {
    errors.push(`[Citation] Missing "## Citation" section in ${page.srcRel}`);
  }
}

function validateNoImplicitNow(page, errors) {
  // forbid "now/today/currently" unless also anchored with last_updated (which we already have)
  // This is a soft rule: we only error on strong phrases.
  const bad = /\b(currently|as of now|right now|today)\b/i;
  if (bad.test(page.raw)) {
    errors.push(
      `[Temporal] Avoid implicit time words (currently/as of now/right now/today) in ${page.srcRel}. Use explicit dates.`
    );
  }
}

// ---------- build pipeline ----------
async function readAllPages() {
  const files = await fg(["**/*.md"], { cwd: SRC_DIR, dot: false });
  const pages = [];
  for (const rel of files) {
    const abs = path.join(SRC_DIR, rel);
    const raw = await fs.readFile(abs, "utf8");
    const parsed = matter(raw);
    const fm = { ...parsed.data };

    if (fm.slug) fm.slug = normalizeSlug(fm.slug);

    pages.push({
      srcRel: rel.replaceAll("\\", "/"),
      srcAbs: abs,
      raw: raw,
      body: parsed.content,
      fm,
      urlPath: "", // computed later
      outAbs: "", // computed later
    });
  }
  return pages;
}

function buildMaps(pages, errors) {
  const slugSet = new Map(); // slug -> srcRel
  const urlSet = new Map(); // url -> srcRel

  for (const p of pages) {
    // url path computed from srcRel + fm
    p.urlPath = toUrlPath(p);
    p.outAbs = toOutputFile(p.urlPath);

    // slug uniqueness
    if (p.fm.slug) {
      const key = `${p.fm.type}:${p.fm.slug}`;
      if (slugSet.has(key)) {
        errors.push(`[Slug] Duplicate slug "${key}" in ${p.srcRel} and ${slugSet.get(key)}`);
      } else {
        slugSet.set(key, p.srcRel);
      }
    }

    // canonical uniqueness
    if (urlSet.has(p.urlPath)) {
      errors.push(`[Canonical] Duplicate URL "${p.urlPath}" in ${p.srcRel} and ${urlSet.get(p.urlPath)}`);
    } else {
      urlSet.set(p.urlPath, p.srcRel);
    }
  }

  return { slugSet, urlSet };
}

async function ensureCleanDist() {
  await fs.rm(DIST_DIR, { recursive: true, force: true });
  await fs.mkdir(DIST_DIR, { recursive: true });
}

async function copyPublicAndStyles() {
  // copy public/ -> dist/
  if (await exists(PUBLIC_DIR)) {
    const entries = await fg(["**/*"], { cwd: PUBLIC_DIR, dot: true, onlyFiles: true });
    for (const rel of entries) {
      const src = path.join(PUBLIC_DIR, rel);
      const dst = path.join(DIST_DIR, rel);
      await fs.mkdir(path.dirname(dst), { recursive: true });
      await fs.copyFile(src, dst);
    }
  }
  // copy styles/ -> dist/styles/
  const stylesDir = path.join(ROOT, "styles");
  if (await exists(stylesDir)) {
    const entries = await fg(["**/*"], { cwd: stylesDir, dot: true, onlyFiles: true });
    for (const rel of entries) {
      const src = path.join(stylesDir, rel);
      const dst = path.join(DIST_DIR, "styles", rel);
      await fs.mkdir(path.dirname(dst), { recursive: true });
      await fs.copyFile(src, dst);
    }
  }
}

async function renderPages(pages, urlSet, errors) {
  const baseLayout = await loadLayout("BaseLayout.html");
  const termLayout = await loadLayout("TermLayout.html");

  for (const p of pages) {
    const htmlBody = md.render(p.body);

    const breadcrumb = makeBreadcrumb(p);
    const citation = makeCitation(p);

    // Enforce citation container presence in final HTML (Rule 5)
    const fullContent = `${htmlBody}\n${citation}`;

    const layout = p.fm.type === "term" ? termLayout : baseLayout;
    const vars = {
      title: escapeHtml(p.fm.title ?? ""),
      content: fullContent,
      breadcrumb,
      citation, // if layouts use it separately
      canonical: `https://entaticspiral.com${p.urlPath}`,
      last_updated: escapeHtml(p.fm.last_updated ?? ""),
      subtitle: escapeHtml(p.fm.subtitle ?? ""),
    };

    let html = applyTemplate(layout, vars);
    html = injectCanonicalLink(html, `https://entaticspiral.com${p.urlPath}`);

    // Internal link validation (Rule 6)
    const links = findInternalLinks(p.raw);
    for (const href of links) {
      // allow anchors and external absolute (we only capture starting with /)
      // normalize: ensure trailing slash for canonical pages
      const normalized =
        href.endsWith("/") || href.includes("#") ? href : `${href}/`;
      const base = normalized.split("#")[0];
      // allow root or known existing url
      if (base !== "/" && !urlSet.has(base)) {
        errors.push(`[Links] Broken internal link "${href}" in ${p.srcRel}`);
      }
    }

    // Citation block existence in HTML (Rule 5)
    if (!html.includes('id="citation"')) {
      errors.push(`[Citation] Rendered HTML missing citation container for ${p.srcRel}`);
    }

    // Write
    await fs.mkdir(path.dirname(p.outAbs), { recursive: true });
    await fs.writeFile(p.outAbs, html, "utf8");
  }
}

async function generateAutoPages(pages) {
  // Generate /index/terms/ and /latest/ as HTML directly (no markdown authoring needed)
  // If you already author these pages in src/, you can skip generation or overwrite them.
  const baseLayout = await loadLayout("BaseLayout.html");

  const terms = pages
    .filter((p) => p.fm.type === "term")
    .map((p) => ({
      title: p.fm.title,
      url: p.urlPath,
      def: stripMdToOneLineDefinition(p.raw),
      slug: p.fm.slug,
      last: p.fm.last_updated,
      tags: Array.isArray(p.fm.tags) ? p.fm.tags : [],
    }))
    .sort((a, b) => String(a.slug).localeCompare(String(b.slug)));

  const grouped = {
    Record: ["fragment", "flame", "echo", "trace", "append-only"],
    Authority: ["sovereignty", "seal", "rwx"],
    Architecture: ["module", "core", "glyph"],
    Interpretation: ["recent-view"],
  };

  function renderTermList(slugs) {
    const items = slugs
      .map((s) => terms.find((t) => t.slug === s))
      .filter(Boolean)
      .map(
        (t) => `
<li>
  <a href="${t.url}"><strong>${escapeHtml(t.title)}</strong></a>
  <div class="muted">${escapeHtml(t.def || "")}</div>
</li>`
      )
      .join("\n");
    return `<ul class="term-index">\n${items}\n</ul>`;
  }

  const termsHtml = `
<h1>Terms Index</h1>
<p class="lede">Canonical vocabulary of the Spiral language field. Each entry includes citation metadata.</p>

<h2>Record and Memory</h2>
${renderTermList(grouped.Record)}

<h2>Authority and Governance</h2>
${renderTermList(grouped.Authority)}

<h2>Architecture and Execution</h2>
${renderTermList(grouped.Architecture)}

<h2>Interpretation and View</h2>
${renderTermList(grouped.Interpretation)}
`.trim();

  const termsPage = {
    fm: { title: "Terms Index", last_updated: todayISO(), type: "index" },
    urlPath: "/index/terms/",
    srcRel: "(generated)/index/terms",
  };
  const termsOut = toOutputFile(termsPage.urlPath);
  const termsDoc = applyTemplate(baseLayout, {
    title: escapeHtml(termsPage.fm.title),
    content: `${termsHtml}\n${makeCitation(termsPage)}`,
    breadcrumb: `
<nav class="breadcrumb" aria-label="Breadcrumb">
  <a href="/">Overview</a><span class="sep">/</span>
  <a href="/index/">Index</a><span class="sep">/</span>
  <a href="/index/terms/">Terms</a>
</nav>
`.trim(),
    citation: makeCitation(termsPage),
    canonical: `https://entaticspiral.com${termsPage.urlPath}`,
    last_updated: escapeHtml(termsPage.fm.last_updated),
    subtitle: "",
  });

  await fs.mkdir(path.dirname(termsOut), { recursive: true });
  await fs.writeFile(termsOut, injectCanonicalLink(termsDoc, `https://entaticspiral.com${termsPage.urlPath}`), "utf8");

  // Latest
  const latestItems = pages
    .filter((p) => p.fm.last_updated && p.fm.title)
    .map((p) => ({
      title: p.fm.title,
      type: p.fm.type,
      date: p.fm.last_updated,
      url: p.urlPath,
    }))
    .sort((a, b) => compareDateDesc(a.date, b.date))
    .slice(0, 10);

  const latestHtml = `
<h1>Latest Updates</h1>
<p class="lede">Most recently updated pages across the documentation site.</p>
<ul class="latest">
  ${latestItems
    .map(
      (it) => `
<li>
  <div class="row">
    <span class="date">${escapeHtml(it.date)}</span>
    <span class="type">${escapeHtml(String(it.type))}</span>
  </div>
  <a href="${it.url}"><strong>${escapeHtml(it.title)}</strong></a>
</li>`
    )
    .join("\n")}
</ul>
`.trim();

  const latestPage = {
    fm: { title: "Latest Updates", last_updated: todayISO(), type: "index" },
    urlPath: "/latest/",
    srcRel: "(generated)/latest",
  };
  const latestOut = toOutputFile(latestPage.urlPath);
  const latestDoc = applyTemplate(baseLayout, {
    title: escapeHtml(latestPage.fm.title),
    content: `${latestHtml}\n${makeCitation(latestPage)}`,
    breadcrumb: `
<nav class="breadcrumb" aria-label="Breadcrumb">
  <a href="/">Overview</a><span class="sep">/</span>
  <a href="/latest/">Latest</a>
</nav>
`.trim(),
    citation: makeCitation(latestPage),
    canonical: `https://entaticspiral.com${latestPage.urlPath}`,
    last_updated: escapeHtml(latestPage.fm.last_updated),
    subtitle: "",
  });

  await fs.mkdir(path.dirname(latestOut), { recursive: true });
  await fs.writeFile(latestOut, injectCanonicalLink(latestDoc, `https://entaticspiral.com${latestPage.urlPath}`), "utf8");
}

function todayISO() {
  // keep deterministic if you want; for now use local date
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

async function generateSitemap(pages) {
  const baseUrl = "https://entaticspiral.com";
  const urls = pages
    .filter((p) => p.fm.type !== "index" || p.srcRel === "index.md")
    .map((p) => {
      const url = `${baseUrl}${p.urlPath}`;
      const lastmod = p.fm.last_updated || todayISO();
      return `  <url>
    <loc>${escapeHtml(url)}</loc>
    <lastmod>${escapeHtml(lastmod)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${p.srcRel === "index.md" ? "1.0" : "0.8"}</priority>
  </url>`;
    })
    .join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  await fs.writeFile(path.join(DIST_DIR, "sitemap.xml"), sitemap, "utf8");
}

async function generateRobotsTxt() {
  const robots = `User-agent: *
Allow: /

Sitemap: https://entaticspiral.com/sitemap.xml
`;

  await fs.writeFile(path.join(DIST_DIR, "robots.txt"), robots, "utf8");
}

async function handle404Page(pages, urlSet) {
  const page404 = pages.find((p) => p.srcRel === "404.md");
  if (!page404) return;

  const baseLayout = await loadLayout("BaseLayout.html");
  const htmlBody = md.render(page404.body);
  const breadcrumb = makeBreadcrumb(page404);
  const citation = makeCitation(page404);

  const fullContent = `${htmlBody}\n${citation}`;
  const vars = {
    title: escapeHtml(page404.fm.title ?? ""),
    content: fullContent,
    breadcrumb,
    citation,
    canonical: `https://entaticspiral.com${page404.urlPath}`,
    last_updated: escapeHtml(page404.fm.last_updated ?? ""),
    subtitle: "",
  };

  let html = applyTemplate(baseLayout, vars);
  html = injectCanonicalLink(html, `https://entaticspiral.com${page404.urlPath}`);

  const out404 = path.join(DIST_DIR, "404.html");
  await fs.writeFile(out404, html, "utf8");
}

async function main() {
  const errors = [];

  if (!(await exists(path.join(LAYOUT_DIR, "BaseLayout.html")))) {
    throw new Error(`Missing layouts/BaseLayout.html`);
  }
  if (!(await exists(path.join(LAYOUT_DIR, "TermLayout.html")))) {
    throw new Error(`Missing layouts/TermLayout.html`);
  }

  const pages = await readAllPages();

  // 1) Validate per page
  for (const p of pages) {
    validateFrontmatter(p, errors);
    validateTermsShape(p, errors);
    validateCitationPresence(p, errors);
    validateNoImplicitNow(p, errors);
  }

  // 2) Build slug/canonical maps
  const { urlSet } = buildMaps(pages, errors);

  // 3) Stop if errors
  if (errors.length > 0) {
    console.error("\nBUILD FAILED. Validation errors:\n");
    for (const e of errors) console.error(" - " + e);
    console.error(`\nTotal: ${errors.length}\n`);
    process.exit(1);
  }

  // 4) Clean dist and copy assets
  await ensureCleanDist();
  await copyPublicAndStyles();

  // 5) Render pages
  const renderErrors = [];
  await renderPages(pages, urlSet, renderErrors);

  // 6) Generate auto pages
  await generateAutoPages(pages);

  // 7) Generate sitemap and robots.txt
  await generateSitemap(pages);
  await generateRobotsTxt();

  // 8) Handle 404 page
  await handle404Page(pages, urlSet);

  // 9) Final link/citation check errors
  if (renderErrors.length > 0) {
    console.error("\nBUILD FAILED. Render/Link errors:\n");
    for (const e of renderErrors) console.error(" - " + e);
    console.error(`\nTotal: ${renderErrors.length}\n`);
    process.exit(1);
  }

  console.log("BUILD OK.");
  console.log(`Pages: ${pages.length}`);
  console.log(`Output: ${DIST_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


// scripts/build-index.mjs
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const OUT_SEARCH = path.join(SRC, "search", "search-index.json");
const OUT_LATEST = path.join(SRC, "latest", "generated.md");

const MAX_SUMMARY = 160;
const TOP_N = 20;

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function toUrlFromCanonical(canonical_url) {
  try {
    const u = new URL(canonical_url);
    return u.pathname.endsWith("/") ? u.pathname : (u.pathname + "/");
  } catch {
    // fallback: if user put only "/path/"
    if (typeof canonical_url === "string" && canonical_url.startsWith("/")) {
      return canonical_url.endsWith("/") ? canonical_url : (canonical_url + "/");
    }
    return null;
  }
}

function toUrlFromFile(file, data) {
  // Use slug from frontmatter if available, otherwise infer from file path
  const slug = data.slug;
  const type = data.type;
  
  if (type === "term" && slug) {
    return `/terms/${slug}/`;
  }
  if (type === "essay" && slug) {
    return `/essays/${slug}/`;
  }
  if (type === "law" && slug) {
    return `/law/${slug}/`;
  }
  
  // Fallback: infer from file path
  const rel = path.relative(SRC, file).replace(/\\/g, "/");
  if (!rel.endsWith(".md")) return null;
  const noExt = rel.slice(0, -3);
  if (noExt === "index") return "/";
  if (noExt.endsWith("/index")) return "/" + noExt.slice(0, -"index".length);
  if (noExt === "search/index") return "/search/";
  if (noExt === "index/index") return "/index/";
  return "/" + noExt + "/";
}

function extractSummary(markdownBody) {
  const lines = markdownBody
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  // remove leading H1 if present
  if (lines[0]?.startsWith("# ")) lines.shift();

  // take first paragraph-like chunk
  const first = lines.find(l => !l.startsWith(">") && !l.startsWith("- ") && !l.startsWith("* "));
  if (!first) return "";

  let s = first.replace(/\s+/g, " ").trim();
  if (s.length > MAX_SUMMARY) s = s.slice(0, MAX_SUMMARY - 1) + "…";
  return s;
}

function isValidISODate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function replaceLatestPlaceholder(latestMdPath, latestContent) {
  if (!fs.existsSync(latestMdPath)) {
    console.warn(`[build-index] ${latestMdPath} not found, skipping placeholder replacement`);
    return;
  }
  
  const content = fs.readFileSync(latestMdPath, "utf8");
  const startMarker = "<!--LATEST_START-->";
  const endMarker = "<!--LATEST_END-->";
  
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);
  
  if (startIdx === -1 || endIdx === -1) {
    console.warn(`[build-index] Placeholder markers not found in ${latestMdPath}`);
    return;
  }
  
  const before = content.slice(0, startIdx + startMarker.length);
  const after = content.slice(endIdx);
  const newContent = before + "\n" + latestContent + "\n" + after;
  
  fs.writeFileSync(latestMdPath, newContent, "utf8");
  console.log(`[build-index] Updated ${latestMdPath} with generated content`);
}

function main() {
  const files = walk(SRC)
    .filter(f => f.endsWith(".md"))
    .filter(f => !f.includes(path.join("src", "search"))); // exclude search pages

  const entries = [];

  for (const file of files) {
    const raw = fs.readFileSync(file, "utf8");
    const parsed = matter(raw);
    const data = parsed.data || {};

    const title = data.title;
    const nav = data.nav;
    const last_updated = data.last_updated;
    const canonical_url = data.canonical_url;

    // More flexible: allow pages without nav if they have other required fields
    if (!title || !isValidISODate(last_updated)) continue;
    
    // Use nav if available, otherwise infer from file path
    const section = nav || (() => {
      const rel = path.relative(SRC, file).replace(/\\/g, "/");
      if (rel.startsWith("terms/")) return "terms";
      if (rel.startsWith("law/")) return "law";
      if (rel.startsWith("essays/")) return "essays";
      if (rel.startsWith("lab/")) return "lab";
      if (rel.startsWith("links/")) return "links";
      return "overview";
    })();

    const url =
      toUrlFromCanonical(canonical_url) ||
      toUrlFromFile(file, data);

    if (!url) continue;

    const summary = extractSummary(parsed.content);

    entries.push({
      title: String(title),
      url,
      summary,
      last_updated,
      section: String(section),
    });
  }

  // write search index
  fs.mkdirSync(path.dirname(OUT_SEARCH), { recursive: true });
  fs.writeFileSync(OUT_SEARCH, JSON.stringify(entries, null, 2) + "\n", "utf8");
  console.log(`[build-index] wrote ${entries.length} entries to ${OUT_SEARCH}`);

  // latest list
  const sorted = [...entries].sort((a, b) => (b.last_updated.localeCompare(a.last_updated)));
  const latest = sorted.slice(0, TOP_N);

  const mdLines = [];
  for (const item of latest) {
    mdLines.push(`- ${item.last_updated} — [${item.title}](${item.url})`);
  }

  // Replace placeholder in src/latest.md
  const latestMdPath = path.join(SRC, "latest.md");
  replaceLatestPlaceholder(latestMdPath, mdLines.join("\n"));
}

main();


import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "dist", "public");
const outputDir = path.join(publicDir, "assets", "og");
const domain = "1jzsnsr5i6";
const endpoint = `https://${domain}.microcms.io/api/v1/news?limit=100&orders=-publishedAt`;
const apiKey = "MBWNeoQ3aihAV1yIErRAkHv3l3wnRETvU1Qj";
const origin = "https://takashiuematsu165-glitch.github.io";
const basePath = "/uematsu-homepage";

const escapeHtml = (value) => value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const toText = (value = "") => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const summary = (article) => {
  const value = toText(article.excerpt || article.summary || article.description || article.content);
  return value.length > 100 ? `${value.slice(0, 100)}…` : value || "お知らせの詳細をご覧ください。";
};
const formattedDate = (value) => value ? new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)) : "News";
const absoluteImage = (id) => `${origin}${basePath}/assets/og/news-${encodeURIComponent(id)}.png`;
const shareUrl = (id) => `${origin}${basePath}/news/${encodeURIComponent(id)}/`;

function renderImage(output, title, description, date) {
  const result = spawnSync("python3", [path.join(root, "scripts", "render-news-og.py"), output, title, description, date], { stdio: "inherit" });
  if (result.status !== 0) throw new Error(`OGP image generation failed: ${output}`);
}

function staticSharePage(article) {
  const title = article.title || "お知らせ";
  const description = summary(article);
  const canonicalUrl = shareUrl(article.id);
  const image = absoluteImage(article.id);
  const route = `${basePath}/#/news/${encodeURIComponent(article.id)}`;
  const published = article.publishedAt ? `<meta property="article:published_time" content="${escapeHtml(article.publishedAt)}" />` : "";
  return `<!doctype html>
<html lang="ja"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)} | 植松康希</title><meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${canonicalUrl}" /><meta property="og:site_name" content="植松康希 | Koki Uematsu" /><meta property="og:locale" content="ja_JP" /><meta property="og:type" content="article" /><meta property="og:title" content="${escapeHtml(title)} | 植松康希" /><meta property="og:description" content="${escapeHtml(description)}" /><meta property="og:url" content="${canonicalUrl}" /><meta property="og:image" content="${image}" /><meta property="og:image:secure_url" content="${image}" /><meta property="og:image:type" content="image/png" /><meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" /><meta property="og:image:alt" content="${escapeHtml(title)}のOGP画像" />${published}
<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${escapeHtml(title)} | 植松康希" /><meta name="twitter:description" content="${escapeHtml(description)}" /><meta name="twitter:image" content="${image}" />
<meta http-equiv="refresh" content="0;url=${route}" /><script>window.location.replace(${JSON.stringify(route)});</script></head><body><p>記事を読み込み中です。<a href="${route}">記事を開く</a></p></body></html>`;
}

async function main() {
  const response = await fetch(endpoint, { headers: { "X-MICROCMS-API-KEY": apiKey } });
  if (!response.ok) throw new Error(`microCMS request failed (${response.status})`);
  const payload = await response.json();
  const articles = Array.isArray(payload.contents) ? payload.contents.filter((article) => article?.id) : [];
  await mkdir(outputDir, { recursive: true });
  const defaultPath = path.join(outputDir, "site-default.png");
  renderImage(defaultPath, "植松康希 | Koki Uematsu", "プロフィール、お知らせ、SNS・各種リンクを掲載しています。", "OFFICIAL PROFILE SITE");
  for (const article of articles) {
    const title = article.title || "お知らせ";
    const description = summary(article);
    const date = formattedDate(article.publishedAt);
    renderImage(path.join(outputDir, `news-${article.id}.png`), title, description, date);
    const destination = path.join(publicDir, "news", article.id, "index.html");
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, staticSharePage(article), "utf8");
  }
  const manifest = articles.map((article) => ({ id: article.id, url: shareUrl(article.id), image: absoluteImage(article.id) }));
  await writeFile(path.join(outputDir, "news-share-manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  const indexHtml = await readFile(path.join(publicDir, "index.html"), "utf8");
  if (!indexHtml.includes("site-default.png")) throw new Error("Default OGP metadata was not included in the application HTML.");
  console.log(`Generated OGP pages and images for ${articles.length} News article(s).`);
}

main().catch((error) => { console.error(error); process.exit(1); });

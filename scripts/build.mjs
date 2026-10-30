import { build } from "esbuild";
import { mkdir, rm, readFile, writeFile, cp } from "node:fs/promises";
import { AD_CLIENT, AD_SLOT } from "../src/ads.js";
import { games, gameRule } from "../src/games.js";
import { translations, languages, formatSetCount } from "../src/i18n.js";
if (process.env.VERCEL && !process.env.SITE_URL)
  throw new Error(
    "Set SITE_URL to the public Vercel/custom domain before building.",
  );
const site = new URL(
  process.env.SITE_URL ||
    "https://raemerrr.github.io/3d-lotto-number-generator/",
);
if (!["https:", "http:"].includes(site.protocol) || site.search || site.hash)
  throw new Error(
    "SITE_URL must be an absolute site URL without query or hash",
  );
if (!site.pathname.endsWith("/")) site.pathname += "/";
const adMode = process.env.ADS_MODE || "off";
if (!["off", "preview", "live"].includes(adMode)) throw new Error("Invalid ADS_MODE");
if (adMode === "live" && process.env.ADS_LIVE_READY !== "true")
  throw new Error("Live ads require ADS_LIVE_READY=true after approval, Auto ads off and CMP/privacy review");
const base = site.pathname;
const escape = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const htmlLang = (lang) => (lang === "zh-hans" ? "zh-Hans" : lang);
const locales = {
  ko: "ko_KR",
  en: "en_US",
  "zh-hans": "zh_CN",
  ja: "ja_JP",
  ru: "ru_RU",
  hi: "hi_IN",
};
await rm("dist", { recursive: true, force: true });
await mkdir("dist/assets", { recursive: true });
await build({
  entryPoints: ["main.js"],
  bundle: true,
  minify: true,
  splitting: true,
  format: "esm",
  target: ["es2020"],
  outdir: "dist/assets",
  chunkNames: "[name]-[hash]",
  metafile: false,
});
await cp("assets", "dist/assets", { recursive: true });
await cp("style.css", "dist/style.css");
await cp("LICENSE", "dist/license.txt");
const template = await readFile("index.html", "utf8");
const languageOptions = Object.entries(languages)
  .map(([lang, name]) => `<option value="${lang}">${name}</option>`)
  .join("");
const languageLinks = Object.entries(languages)
  .map(
    ([lang, name]) =>
      `<a href="${base}${lang}/" hreflang="${htmlLang(lang)}" lang="${htmlLang(lang)}">${name}</a>`,
  )
  .join("");
const alternates =
  Object.keys(languages)
    .map(
      (lang) =>
        `<link rel="alternate" hreflang="${htmlLang(lang)}" href="${new URL(`${lang}/`, site)}">`,
    )
    .join("\n") +
  `\n<link rel="alternate" hreflang="x-default" href="${site}">`;
for (const lang of ["root", ...Object.keys(languages)]) {
  const root = lang === "root",
    key = root ? "ko" : lang,
    t = translations[key];
  const canonical = root ? site.href : new URL(`${key}/`, site).href;
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: t.title,
    description: t.description,
    url: canonical,
    inLanguage: htmlLang(key),
    applicationCategory: "EntertainmentApplication",
    operatingSystem: "Any",
    browserRequirements: "JavaScript and WebGL",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
  }).replace(/</g, "\\u003c");
  const plain = Object.fromEntries(
    Object.entries({
      ...t,
      base,
      lang: key,
      root: String(root),
      htmlLang: htmlLang(key),
      canonical,
      ogImage: new URL("assets/og_image.png", site).href,
      ogLocale: locales[key],
    }).map(([k, v]) => [k, escape(v)]),
  );
  const gameOptions = Object.entries(games)
    .map(
      ([id, game]) =>
        `<option value="${id}">${escape(game.name)} · ${game.region} · ${gameRule(game)}</option>`,
    )
    .join("");
  const batchOptions = [1, 2, 3, 4, 5]
    .map(
      (n) => `<option value="${n}">${escape(formatSetCount(key, n))}</option>`,
    )
    .join("");
  const adSection = root || adMode === "off" ? "" :
    `<aside id="guide-ad" class="guide-ad" aria-label="${escape(t.adLabel)}" data-mode="${adMode}" data-site="${escape(site.href)}"><p class="ad-label">${escape(t.adLabel)}</p>${adMode === "preview"
      ? `<div class="ad-preview">${escape(t.adPreview)}</div>`
      : `<ins class="adsbygoogle" style="display:block" data-ad-client="${AD_CLIENT}" data-ad-slot="${AD_SLOT}" data-ad-format="auto" data-full-width-responsive="true"></ins>`}</aside>`;
  if (adMode === "live") {
    plain.privacyText = escape(t.adPrivacy);
    for (const url of ["https://myadcenter.google.com/", "https://www.aboutads.info/choices/"])
      plain.privacyText = plain.privacyText.replace(url, `<a href="${url}">${url}</a>`);
    plain.privacyText += ' <a href="https://policies.google.com/technologies/partner-sites">Google Privacy</a>';
  }
  const data = {
    adSection,
    ...plain,
    gameOptions,
    batchOptions,
    languageOptions: languageOptions.replace(
      `value="${key}"`,
      `value="${key}" selected`,
    ),
    languageLinks,
    alternates,
    schema,
  };
  const html = template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    if (!(name in data)) throw new Error(`Missing template field ${name}`);
    return data[name];
  });
  const dir = root ? "dist" : `dist/${key}`;
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/index.html`, html);
}
const urls = [
  site.href,
  ...Object.keys(languages).map((lang) => new URL(`${lang}/`, site).href),
];
await writeFile(
  "dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escape(url)}</loc></url>`).join("")}</urlset>\n`,
);
await writeFile(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\nSitemap: ${new URL("sitemap.xml", site)}\n`,
);
await writeFile(
  "dist/404.html",
  `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Page not found · Lotto 6/45</title><body style="font:18px system-ui;background:#0c1421;color:white;padding:8vw"><h1>404 — Page not found</h1><p>페이지를 찾을 수 없습니다.</p><a style="color:#8be6cb" href="${base}">Lotto 6/45 →</a></body></html>`,
);
await writeFile("dist/.nojekyll", "");
console.log(`Built 6 languages + language entry at ${site.href}`);

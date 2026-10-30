import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { languages } from "../src/i18n.js";
const site = new URL(
  process.env.SITE_URL ||
    "https://raemerrr.github.io/3d-lotto-number-generator/",
);
if (!site.pathname.endsWith("/")) site.pathname += "/";
for (const lang of Object.keys(languages)) {
  const html = await readFile(`dist/${lang}/index.html`, "utf8");
  assert.ok(!html.includes("{{"), `unresolved template: ${lang}`);
  assert.ok(
    html.includes(`<html lang="${lang === "zh-hans" ? "zh-Hans" : lang}">`),
  );
  assert.ok(
    html.includes(`<link rel="canonical" href="${new URL(lang + "/", site)}">`),
  );
  assert.equal([...html.matchAll(/rel="alternate" hreflang=/g)].length, 7);
  const adMode = process.env.ADS_MODE || "off";
  assert.equal(html.includes('id="guide-ad"'), adMode !== "off");
  assert.equal(html.includes('data-ad-slot="7285522592"'), adMode === "live");
  if (adMode !== "off") {
    assert.ok(html.indexOf('id="guide"') < html.indexOf('id="guide-ad"'));
    assert.ok(html.indexOf('id="guide-ad"') < html.indexOf('class="faq-section"'));
  }
  if (adMode === "live") assert.ok(html.includes('https://myadcenter.google.com/'));
  assert.ok(html.includes('id="game"'));
  assert.ok(html.includes('id="batch-count"'));
  const data = JSON.parse(
    html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1],
  );
  assert.equal(data["@type"], "WebApplication");
  for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    const href = match[1];
    if (href.startsWith(site.pathname) && !href.startsWith("https:")) {
      let file = href.slice(site.pathname.length).split("?")[0];
      if (file.endsWith("/")) file += "index.html";
      await access("dist/" + file);
    }
  }
}
const sitemap = await readFile("dist/sitemap.xml", "utf8");
assert.equal([...sitemap.matchAll(/<loc>/g)].length, 7);
console.log(
  "Verified localized HTML, metadata, structured data, local links and sitemap.",
);

for (const file of ["dist/index.html", "dist/404.html"]) {
  const html = await readFile(file, "utf8");
  assert.ok(!html.includes('id="guide-ad"'));
  assert.ok(!html.includes('data-ad-slot'));
}

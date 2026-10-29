import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("dist");
const base = new URL(
  process.env.SITE_URL ||
    "https://raemerrr.github.io/3d-lotto-number-generator/",
).pathname.replace(/\/$/, "");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".JPG": "image/jpeg",
  ".xml": "application/xml",
  ".txt": "text/plain",
};
createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    if (base && path === "/") {
      res.writeHead(302, { Location: base + "/" });
      res.end();
      return;
    }
    if (base && path.startsWith(base + "/")) path = path.slice(base.length);
    let file = resolve(root, "." + path);
    if (file !== root && !file.startsWith(root + sep))
      throw new Error("Invalid path");
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(await readFile(resolve(root, "404.html")).catch(() => "404"));
  }
}).listen(4173, "127.0.0.1", () =>
  console.log(`Local: http://127.0.0.1:4173${base}/ko/`),
);

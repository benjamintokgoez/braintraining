"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("node:util");

const root = path.resolve(__dirname, "..");
const mime = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml", ".png": "image/png"
};
const publicFile = name => ["index.html", "app.js", "i18n.js", "styles.css", "sw.js", "manifest.webmanifest"].includes(name) ||
  /^(js|icons)\/[^.][\w/.-]+\.(js|svg|png)$/.test(name) && !name.split("/").some(part => part.startsWith("."));

function createStaticServer() {
  return http.createServer((request, response) => {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return;
    }
    let name;
    try { name = decodeURIComponent(new URL(request.url, "http://localhost").pathname).slice(1) || "index.html"; }
    catch { response.writeHead(400); response.end("Invalid URL"); return; }
    const file = path.resolve(root, name);
    if (!publicFile(name) || !file.startsWith(root + path.sep)) {
      response.writeHead(404); response.end("Not found"); return;
    }
    fs.readFile(file, (error, content) => {
      if (error) {
        if (error.code !== "ENOENT" && error.code !== "EISDIR") console.error("Static file read failed:", error);
        response.writeHead(error.code === "ENOENT" || error.code === "EISDIR" ? 404 : 500);
        response.end("File unavailable"); return;
      }
      response.writeHead(200, {
        "Content-Type": mime[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff"
      });
      response.end(request.method === "HEAD" ? undefined : content);
    });
  });
}

if (require.main === module) {
  const { values } = parseArgs({
    options: { host: { type: "string", default: "127.0.0.1" }, port: { type: "string", default: "4173" } }
  });
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError("Port must be between 1 and 65535");
  const server = createStaticServer();
  server.on("error", error => { console.error("Server failed:", error.message); process.exitCode = 1; });
  server.listen(port, values.host, () => console.log(`Bennys Brain Gym: http://${values.host}:${port}`));
}

module.exports = { createStaticServer };

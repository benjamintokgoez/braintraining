"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(match => match[1]);
let failed = false;
for (const script of [...scripts, "sw.js"]) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, script)], { encoding: "utf8" });
  if (result.status !== 0) { failed = true; console.error(result.stderr || `Missing script: ${script}`); }
}
process.exitCode = Number(failed);
if (!failed) console.log(`${scripts.length + 1} browser scripts passed syntax checks.`);

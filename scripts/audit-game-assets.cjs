"use strict";
const fs = require("node:fs"), path = require("node:path");
const game = path.resolve(__dirname, "../game");
function audit() {
  const sources = ["app.js", "index.html", "styles.css"].map(name => ({ name, text: fs.readFileSync(path.join(game, name), "utf8") }));
  const files = [];
  function walk(dir, prefix = "") {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (item.isSymbolicLink()) throw new Error("Asset symlinks are not supported");
      const rel = prefix + item.name, full = path.join(dir, item.name);
      if (item.isDirectory()) walk(full, rel + "/");
      else {
        const stem = path.parse(rel).name;
        const escaped = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const refs = sources.filter(s => s.text.includes(rel) || new RegExp('(?:["\x27]' + escaped + '["\x27]|\\b' + escaped + '\\s*:)').test(s.text)).map(s => s.name);
        const reason = rel.startsWith("px/") ? "px/ 동적 스프라이트·manifest 검증 유지"
          : rel.startsWith("sprites/") ? "img(name)의 동적 fallback 경로 유지"
          : refs.length ? refs.join(", ") + "의 파일명·도감 키 참조" : "정적·도감 키 참조 없음";
        files.push({ file: rel, bytes: fs.statSync(full).size, include: rel.startsWith("px/") || rel.startsWith("sprites/") || refs.length > 0, reason });
      }
    }
  }
  walk(path.join(game, "assets"));
  return files;
}
module.exports = { audit };
if (require.main === module) console.log(JSON.stringify(audit(), null, 2));

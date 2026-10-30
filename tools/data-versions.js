// Writes a short fingerprint of every data/**/*.json file into sw.js (const DATA_VER = {...}). Run by bump.sh.
// sw.js keeps these files on the phone and, after an app update, drops only the ones whose fingerprint changed.
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const root = path.join(__dirname, ".."), data = path.join(root, "data"), ver = {};
(function walk(dir) {
  for (const f of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith(".json")) ver[path.relative(data, p).split(path.sep).join("/")] = crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex").slice(0, 8);
  }
})(data);
const sw = path.join(root, "sw.js"), s = fs.readFileSync(sw, "utf8"), line = "const DATA_VER = " + JSON.stringify(ver) + ";";
if (!/^const DATA_VER = .*;$/m.test(s)) { console.error("sw.js has no DATA_VER line"); process.exit(1); }
fs.writeFileSync(sw, s.replace(/^const DATA_VER = .*;$/m, line));
console.log(Object.keys(ver).length + " data files fingerprinted");

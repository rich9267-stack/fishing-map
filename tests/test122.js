// Security guard (v109): static checks that keep the app safe to share with people Richard doesn't know.
// Runs on the files only (no fake page). If one fails, the message says what to fix.
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");
let bad = 0; const ok = (c, m) => { console.log((c ? "ok   " : "FAIL ") + m); if (!c) bad++; };

const html = read("index.html");
const jsFiles = fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js")).map(f => "js/" + f);
const js = Object.fromEntries(jsFiles.map(f => [f, read(f)]));

// 1) Content-Security-Policy is present and strict where it matters
const m = /<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html);
ok(!!m, "index.html has a Content-Security-Policy");
const csp = m ? m[1] : "";
const dir = n => ((csp.split(";").map(x => x.trim()).find(x => x.startsWith(n + " "))) || "");
ok(!/'unsafe-inline'|'unsafe-eval'/.test(dir("script-src")), "script-src allows no inline or eval scripts");
ok(/object-src 'none'/.test(csp) && /base-uri 'self'/.test(csp) && /frame-src 'none'/.test(csp) && /form-action 'self'/.test(csp), "object/base/frame/form rules are locked down");
ok(/<meta name="referrer"/.test(html), "referrer policy is set");
ok(!/<script(?![^>]*\ssrc=)[^>]*>/i.test(html), "no inline <script> blocks in index.html");
ok(!/\son[a-z]+\s*=\s*["']/i.test(html.replace(/<!--[\s\S]*?-->/g, "")), "no inline on...= handlers in index.html");

// 2) every outside server the code fetches / loads scripts from is listed in the policy
// (hosts that are only opened as links the person taps are listed here and need no policy entry)
const LINK_ONLY = ["myfwc.com", "www.google.com", "maps.google.com", "www.w3.org", "www.weather.gov", "www.inaturalist.org", "tidesandcurrents.noaa.gov", "coastwatch.noaa.gov"];
const hosts = new Set();
for (const [f, src] of Object.entries(js)) for (const h of src.match(/https?:\/\/[a-zA-Z0-9.-]+/g) || []) hosts.add(h.replace(/^https?:\/\//, ""));
for (const h of html.match(/https?:\/\/[a-zA-Z0-9.-]+/g) || []) hosts.add(h.replace(/^https?:\/\//, ""));
const missing = [...hosts].filter(h => !LINK_ONLY.includes(h) && !csp.includes(h) && !/^(www\.w3\.org|rich9267-stack\.github\.io|localhost)$/.test(h));
ok(missing.length === 0, "every outside server in the code is in the Content-Security-Policy" + (missing.length ? " — missing: " + missing.join(", ") : ""));

// 3) typed-in text must never go into HTML: map popups and innerHTML templates
const popupBad = [];
for (const [f, src] of Object.entries(js)) {
  const re = /(bindPopup|bindTooltip|setContent)\(\s*([`"'])([\s\S]*?)\2/g; let x;
  while ((x = re.exec(src))) { const after = src.slice(x.index, x.index + x[0].length + 6); if (/\$\{/.test(x[3]) || /^\s*\+/.test(src.slice(x.index + x[0].length, x.index + x[0].length + 6)) || /\+\s*$/.test(x[3])) popupBad.push(f + ": " + x[0].slice(0, 60)); }
  // a popup built as "text" + variable
  const re2 = /(bindPopup|bindTooltip|setContent)\(\s*["'][^"']*["']\s*\+/g;
  while ((x = re2.exec(src))) popupBad.push(f + ": " + x[0].slice(0, 60));
}
ok(popupBad.length === 0, "map popups are built as page elements, never HTML strings with variables" + (popupBad.length ? " — " + popupBad.join(" | ") : ""));

const RISKY = /\$\{[^}]*\b(name|bio|note|notes|title|handle|display_name|species|label|message|body|text|about|caption|comment)\b/;
const innerBad = [];
for (const [f, src] of Object.entries(js)) {
  const re = /\.innerHTML\s*\+?=\s*`([^`]*(?:\$\{[^}]*\}[^`]*)*)`/g; let x;
  while ((x = re.exec(src))) {
    const block = x[1].replace(/\$\{hostPage\.name\.replace\(\/\[<>&\]\/g, ""\)\}/g, "");   // that one strips < > & first
    if (RISKY.test(block)) innerBad.push(f + ": " + block.slice(0, 70).replace(/\s+/g, " "));
  }
}
ok(innerBad.length === 0, "no innerHTML template inserts typed-in text" + (innerBad.length ? " — " + innerBad.join(" | ") : ""));

const evil = [];
for (const [f, src] of Object.entries(js)) {
  if (/javascript:/i.test(src.replace(/\/\/.*$/gm, ""))) evil.push(f + " javascript:");
  if (/\beval\s*\(|new Function\s*\(|document\.write\s*\(|insertAdjacentHTML|outerHTML\s*=/.test(src)) evil.push(f + " eval/write/outerHTML");
}
ok(evil.length === 0, "no eval, document.write, insertAdjacentHTML or javascript: links" + (evil.length ? " — " + evil.join(", ") : ""));

const noopen = [];
for (const [f, src] of Object.entries(js)) src.split("\n").forEach((ln, i) => { if (/target\s*=\s*["']_blank["']/.test(ln) && !/noopener/.test(ln)) noopen.push(f + ":" + (i + 1)); });
ok(noopen.length === 0, "every link that opens a new tab says rel=noopener" + (noopen.length ? " — " + noopen.join(", ") : ""));

// 4) outside links/pictures taken from other people's servers are https-only
ok(/safeHttps/.test(js["js/02-spots.js"]) && /safeHttps\(o\.url\)/.test(js["js/05-seasons-records.js"]) && /safeHttps\(o\.photo\)/.test(js["js/05-seasons-records.js"]), "iNaturalist links and photos go through the https-only guard");
ok(/window\.top !== window\.self/.test(js["js/01-core.js"]), "the app hides itself if another site frames it");

// 5) edge functions that run without a login prove who is calling
const fnDir = path.join(root, "supabase", "functions");
for (const fn of fs.readdirSync(fnDir)) {
  const src = fs.readFileSync(path.join(fnDir, fn, "index.ts"), "utf8");
  ok(/x-hook-secret/.test(src) || /is_member/.test(src), `edge function ${fn} checks a secret or membership`);
}
const fish = fs.readFileSync(path.join(fnDir, "identify-fish", "index.ts"), "utf8");
ok(/fish_id_take/.test(fish) && /429/.test(fish), "Fish ID has its daily limit");
ok(/fish_id_take/.test(read("setup/66-security-hardening.sql")), "setup/66 holds the Fish ID limit");

// 6) no secrets in the repo
const secretRe = /sb_secret_[A-Za-z0-9_-]{10,}|-----BEGIN (RSA |EC )?PRIVATE KEY-----|AIza[0-9A-Za-z_-]{30,}|ghp_[0-9A-Za-z]{30,}|"role"\s*:\s*"service_role"/;
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name === "node_modules" || e.name === ".git" ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const leaks = walk(root).filter(f => /\.(js|mjs|ts|html|md|sql|json|sh|css)$/.test(f) && secretRe.test(fs.readFileSync(f, "utf8"))).map(f => path.relative(root, f));
ok(leaks.length === 0, "no secret keys in the repo" + (leaks.length ? " — " + leaks.join(", ") : ""));

console.log(bad ? "\n" + bad + " check(s) failed" : "\nall security checks passed");
process.exit(bad ? 1 : 0);

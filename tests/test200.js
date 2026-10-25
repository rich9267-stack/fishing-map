// test200: js/00-icons.js draws emoji as line icons but keeps the text, handles later changes, and leaves inputs alone.
const { JSDOM } = require("jsdom");
const fs = require("fs");
const dom = new JSDOM("<body><p id='a'>Go 🎣 now ⚠️ ok → 🥇</p><textarea id='t'>🎣</textarea><select><option>🎣 x</option></select></body>", { runScripts: "outside-only" });
const w = dom.window, d = w.document;
w.eval(fs.readFileSync(require("path").join(__dirname, "../js/00-icons.js"), "utf8"));
let bad = "";
const a = d.getElementById("a");
if (a.textContent !== "Go 🎣 now ⚠️ ok → 🥇") bad += " text changed: " + a.textContent + ";";
if (a.querySelectorAll(".ei").length !== 3) bad += " expected 3 icons, got " + a.querySelectorAll(".ei").length + ";";
if (![...a.querySelectorAll(".ei")].every(e => e.getAttribute("aria-hidden") === "true")) bad += " icons not hidden from screen readers;";
if (!/--dc/.test(a.querySelectorAll(".ei")[2].getAttribute("style") || "")) bad += " medal has no colour;";
if (d.querySelector("#t .ei") || d.querySelector("option .ei")) bad += " touched input/option;";
const p = d.createElement("p"); p.textContent = "later 🐟"; d.body.appendChild(p);
setTimeout(() => {
  if (!p.querySelector(".ei-fish")) bad += " later text not turned into an icon;";
  if (!/ei-fish/.test(d.getElementById("icon-style").textContent)) bad += " no rule for fish;";
  if (typeof w.iconSvg("fish") !== "string" || !w.iconSvg("fish").includes("<svg")) bad += " iconSvg;";
  console.log(bad ? "FAILED:" + bad : "ALL OK");
  process.exit(bad ? 1 : 0);
}, 50);

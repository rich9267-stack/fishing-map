// Quick catch: our own species suggestion chips (work even after a camera-roll photo)
const { JSDOM } = require("jsdom");
const html = require("./load")();
const dom = new JSDOM(html, { runScripts: "outside-only", url: "https://x.test/" });
const w = dom.window;
try {
  // run only the helper pieces: evaluate the page scripts is heavy, so test the markup + code presence
  const src = require("fs").readFileSync(__dirname + "/../js/06-catching.js", "utf8");
  console.log("helper present:", /function speciesSuggestFor/.test(src));
  console.log("hooked to quick catch:", /speciesSuggestFor\(\$\("qc-species-other"\)\)/.test(src));
  const inp = w.document.getElementById("qc-species-other");
  console.log("input exists:", !!inp);
  // minimal harness of the helper
  const m = src.match(/const SPECIES_SUGGEST = \[[\s\S]*?\];/)[0];
  const h = src.match(/function speciesSuggestFor[\s\S]*?\n  }\n/)[0];
  w.eval(`function el(t,c,x){const e=document.createElement(t);if(c)e.className=c;if(x)e.textContent=x;return e;} ${m} ${h} speciesSuggestFor(document.getElementById("qc-species-other"));`);
  inp.value = "flo"; inp.dispatchEvent(new w.Event("input", { bubbles: true }));
  const chips = [...w.document.querySelectorAll(".sp-sugg .fchip")].map(b => b.textContent);
  console.log("flo ->", chips.join(", "));
  const fl = [...w.document.querySelectorAll(".sp-sugg .fchip")].find(b => b.textContent === "Flounder");
  fl.click();
  console.log("after tap:", inp.value, "chips left:", w.document.querySelectorAll(".sp-sugg .fchip").length);
  console.log(chips.includes("Flounder") && inp.value === "Flounder" ? "OK" : "FAIL");
} catch (e) { console.log("FAIL", e.message); process.exit(1); }
process.exit(0);

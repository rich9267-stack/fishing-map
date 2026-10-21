// test167: outside Florida the app says "We don't have <State> rules yet" and points to the state agency (js/54, js/31; US plan step 2)
const fs = require("fs");
const read = f => fs.readFileSync(__dirname + "/../" + f, "utf8");
let bad = 0; const ok = (n, c) => { console.log((c ? "ok   " : "FAIL ") + n); if (!c) bad++; };
const s31 = read("js/31-regional-rules.js"), ri = s31.slice(s31.indexOf("function regionInfo"), s31.indexOf("// The place whose rules are on screen"));
const S = new Function(read("js/53-us-states.js") + "\n" + read("js/54-state-agencies.js") + "\n" + ri + "; return { stateOf, STATE_NAMES, STATE_AGENCIES, stateAgency, agencyShort, stateRulesGate, regionInfo };")();

// 1. the table: every state + DC, real https links, readable names
const codes = Object.keys(S.STATE_NAMES);
ok("an agency for all 49 outlines", codes.length === 49 && codes.every(c => S.STATE_AGENCIES[c]));
ok("exactly those 49", Object.keys(S.STATE_AGENCIES).length === 49);
ok("every row has name, short name and two https links", Object.values(S.STATE_AGENCIES).every(a => a.length === 4 && a[0] && a[1] && /^https:\/\/[^ ]+$/.test(a[2]) && /^https:\/\/[^ ]+$/.test(a[3])));
ok("Florida still says FWC", S.agencyShort("FL") === "FWC" && S.agencyShort() === "FWC" && S.agencyShort(null) === "FWC");
ok("Georgia → Georgia DNR", S.agencyShort("GA") === "Georgia DNR");

// 2. the message
const ga = S.stateRulesGate({ outside: true, state: "GA" });
ok("Georgia: We don't have Georgia rules yet", /^We don't have Georgia rules yet\./.test(ga.text));
ok("Georgia: agency and licence buttons", ga.links.length === 2 && /georgiawildlife/.test(ga.links[0].url) && /licenses/.test(ga.links[1].url));
ok("D.C. is named properly", /We don't have Washington, D\.C\. rules yet/.test(S.stateRulesGate({ outside: true, state: "DC" }).text));
const abroad = S.stateRulesGate({ outside: true, state: null });
ok("abroad: no state buttons, says outside the US", /outside the United States/.test(abroad.text) && abroad.links.length === 0);
ok("the message never names Florida or FWC", !/Florida|FWC/.test(ga.text + S.stateRulesGate({ outside: true, state: "AL" }).text));

// 3. regionInfo: Florida is exactly as before, everything else is "outside" with its state
const fl = [["Pompano", 26.24, -80.10], ["Key West", 24.55, -81.78], ["Naples", 26.14, -81.8], ["Pensacola", 30.42, -87.2], ["Jacksonville", 30.33, -81.66], ["Gulf Stream off Pompano", 26.23, -79.9]];
fl.forEach(([n, a, b]) => ok(`${n} is Florida (not outside)`, !S.regionInfo(a, b).outside));
ok("Pompano keeps its label", S.regionInfo(26.24, -80.10).label === "Atlantic coast (Southeast Florida)");
[["Savannah", 32.08, -81.09, "GA"], ["Cumberland Island (inside the old Florida box)", 30.85, -81.45, "GA"], ["Mobile Bay", 30.5, -88.0, "AL"], ["Galveston", 29.3, -94.8, "TX"], ["San Diego", 32.68, -117.2, "CA"]]
  .forEach(([n, a, b, st]) => { const i = S.regionInfo(a, b); ok(`${n} → outside, ${st}`, i.outside === true && i.state === st); });
ok("Bimini → outside, no state", S.regionInfo(25.73, -79.27).outside === true && S.regionInfo(25.73, -79.27).state === null);
ok("no position → home (Florida)", !S.regionInfo(NaN, NaN).outside);

// 4. wired in: every screen asks before showing a Florida rule
const t10 = read("js/10-tools-safety.js"), t18 = read("js/18-species.js"), t17 = read("js/17-license-help.js"), t29 = read("js/29-home-waters.js"), t09 = read("js/09-map-forecast.js");
ok("keeper check uses the gate", /here\.outside && !outsideRule && typeof stateRulesGate/.test(t10) && /gateLinks\(box, k\.gate\)/.test(t10));
ok("Seasons cards use the gate", /seasonView[\s\S]{0,200}here\.outside/.test(s31) && /gateLinks\(note, gate\)/.test(s31));
ok("species page uses the gate", /outside = !!\(inf && inf\.outside/.test(t18));
ok("licence card + renew button use the state agency", /function licHelp/.test(t17) && /ag\.license/.test(t17));
ok("header says 'Your area' outside Florida", /Your area · home waters/.test(t29));
ok("satellite box follows the map outside Florida", /function satBoxFor/.test(t09) && /SAT_BOX_FL/.test(t09));
const box = new Function(t09.slice(t09.indexOf("const SAT_BOX_FL"), t09.indexOf("const SAT_LAYERS")) + "; return { satBoxFor, SAT_BOX_FL };")();
ok("Florida box unchanged", JSON.stringify(box.satBoxFor({ lat: 26.2, lng: -80.1 })) === JSON.stringify({ s: 24.3, n: 31.0, w: -87.7, e: -79.6 }));
const ca = box.satBoxFor({ lat: 34, lng: -119 }), ne = box.satBoxFor({ lat: 41, lng: -70 });
ok("California / New England boxes sit over their coast, same size as Florida's", ca.s < 34 && ca.n > 34 && ca.w < -119 && ca.e > -119 && ne.s < 41 && ne.n > 41 && ne.w < -70 && ne.e > -70 && Math.abs((ca.n - ca.s) - 6.7) < 1e-9);
ok("js/54 loaded by the page and kept offline", /<script src="js\/54-state-agencies\.js\?v=\d+"><\/script>/.test(read("index.html")) && read("sw.js").includes('"./js/54-state-agencies.js"'));

console.log(bad ? `test167 FAILED (${bad})` : "test167 OK");
process.exit(bad ? 1 : 0);

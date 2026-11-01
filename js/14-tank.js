  // ---- 🐠 Tank: your best catch of each species swims in a saltwater or freshwater tank; every other fish goes to the pond ----
  // "Best" = heaviest, length breaks a tie. Which tank a species lives in: the Seasons list knows (fresh vs not),
  // then a few freshwater names, then where you caught it. Brackish spots never decide it for a known species.
  const TANK_FRESH_RE = /\b(largemouth|peacock|bluegill|crappie|catfish|tilapia|oscar|bowfin|gar|snakehead|knifefish|cichlid|sunfish|panfish|carp|pickerel|bream|shiner|warmouth|redear|bullhead|hoplo|pleco|suckermouth|clarias)\b/i;
  // How each species is drawn: shape (torpedo, deep, bass, long, flat), colours and a marking.
  const TANK_LOOKS = [
    // newer fish first, so specific names win over broad ones ("amberjack" before "jack")
    // Gulf + Keys fish and sharks (Oct 15 2026): above /snapper/, /jack/, /trout/ and the general /shark/ line at the bottom
    // Porgies, grunts, whiting and a few more that were drawn in a random colour (v233)
    { m: /red porgy/, shape: "deep", body: "#d98a8a", belly: "#f4d9d6", mark: "" },
    { m: /knobbed porgy/, shape: "deep", body: "#a9a79a", belly: "#e9e6d6", mark: "" },
    { m: /jolthead/, shape: "deep", body: "#b9b8ad", belly: "#eceae0", mark: "" },
    { m: /porgy/, shape: "deep", body: "#c4a9a3", belly: "#f2e6e2", mark: "" },
    { m: /grunt/, shape: "deep", body: "#aebdc2", belly: "#f2efd0", mark: "stripe" },
    { m: /whiting|southern kingfish/, shape: "torpedo", body: "#b7bcae", belly: "#f0efe4", mark: "" },
    { m: /toadfish/, shape: "bass", body: "#8a7b5c", belly: "#cdbf9b", mark: "dots" },
    { m: /walleye/, shape: "torpedo", body: "#a39a55", belly: "#efe7bd", mark: "bars" },
    { m: /scamp/, shape: "bass", body: "#8a7a5c", belly: "#d9ccaa", mark: "dots" },
    { m: /rock hind/, shape: "bass", body: "#b5694f", belly: "#e5c3ad", mark: "dots" },
    { m: /stingray|eagle ray|manta|\bray\b|skate/, shape: "ray", body: "#8e7a5e", belly: "#d8c9ae", mark: "dots" },
    { m: /puffer|blowfish|porcupinefish|boxfish|cowfish/, shape: "puffer", body: "#b9ad7a", belly: "#f3efd8", mark: "dots" },
    { m: /\beel\b|moray|conger/, shape: "eel", body: "#6c7a58", belly: "#c9cfa8", mark: "" },
    { m: /\bgar\b/, shape: "gar", body: "#7c8d5b", belly: "#dcdcb2", mark: "dots" },
    { m: /needlefish/, shape: "gar", body: "#8d9aa3", belly: "#e4e9ec", mark: "stripe" },
    { m: /lionfish/, shape: "deep", body: "#a8452f", belly: "#ecd2b4", mark: "bars" },
    { m: /bonefish/, shape: "torpedo", body: "#c3ccd1", belly: "#f4f6f7", mark: "" },
    { m: /yellowfin tuna/, shape: "torpedo", body: "#4f7391", belly: "#e8e8d0", mark: "stripe" },
    { m: /blackfin tuna/, shape: "torpedo", body: "#46627c", belly: "#e4e9ee", mark: "" },
    { m: /cubera/, shape: "deep", body: "#8a4a3a", belly: "#d9b3a0", mark: "" },
    { m: /bar jack/, shape: "deep", body: "#8fa6b0", belly: "#eef1f2", mark: "stripe" },
    { m: /horse-eye|horse eye/, shape: "deep", body: "#9aa9a3", belly: "#ece9c2", mark: "" },
    { m: /sand seatrout|sand trout|white trout/, shape: "torpedo", body: "#b9bfb0", belly: "#f1efe6", mark: "" },
    { m: /blacktip/, shape: "shark", body: "#7d8a94", belly: "#eef1f2", mark: "" },
    { m: /bull shark/, shape: "shark", body: "#76828b", belly: "#e9edef", mark: "" },
    { m: /bonnethead/, shape: "shark", body: "#8d979c", belly: "#e7eaeb", mark: "" },
    { m: /nurse shark/, shape: "shark", body: "#8a7a62", belly: "#d9cdb4", mark: "" },
    { m: /lemon shark/, shape: "shark", body: "#b8a466", belly: "#efe6c4", mark: "" },
    // catfish first: "walking" contains "king", which would otherwise draw it as a mackerel
    { m: /walking catfish|clarias/, shape: "long", body: "#5f5a52", belly: "#b9b2a4", mark: "dots" },
    { m: /sailfin catfish|suckermouth|pleco/, shape: "bass", body: "#4e4a3f", belly: "#a8a08a", mark: "dots" },
    { m: /hoplo/, shape: "bass", body: "#5b4a3a", belly: "#b5a38c", mark: "dots" },
    { m: /gafftop/, shape: "torpedo", body: "#7f8e9b", belly: "#eef1f3", mark: "" },
    { m: /hardhead/, shape: "torpedo", body: "#8a8f86", belly: "#e7e8e1", mark: "" },
    { m: /blue cat/, shape: "bass", body: "#6f8aa0", belly: "#e1e8ee", mark: "" },
    { m: /flathead cat|shovelhead/, shape: "bass", body: "#7a6a3f", belly: "#ddd0a2", mark: "dots" },
    { m: /channel cat/, shape: "bass", body: "#7d8d98", belly: "#e3e8eb", mark: "dots" },
    { m: /white cat/, shape: "bass", body: "#9aa3a8", belly: "#f1f3f4", mark: "" },
    { m: /black bullhead/, shape: "bass", body: "#3c3f3a", belly: "#b8b59c", mark: "" },
    { m: /yellow bullhead/, shape: "bass", body: "#9a8540", belly: "#ecd98a", mark: "" },
    { m: /spotted bullhead/, shape: "bass", body: "#5d5747", belly: "#cfc6ae", mark: "dots" },
    { m: /bullhead|headwater cat/, shape: "bass", body: "#6b5a40", belly: "#cdbb98", mark: "dots" },
    { m: /tripletail/, shape: "deep", body: "#8a7b4f", belly: "#cdbf93", mark: "dots" },
    { m: /flounder/, shape: "flat", body: "#9a8461", belly: "#e5d9bd", mark: "dots" },
    { m: /hogfish|hog snapper/, shape: "deep", body: "#c9805f", belly: "#f1d3c1", mark: "" },
    { m: /amberjack/, shape: "torpedo", body: "#8f8a58", belly: "#e7e2bd", mark: "stripe" },
    { m: /spadefish/, shape: "deep", body: "#9aa3a8", belly: "#e6eaec", mark: "bars" },
    { m: /blue runner|hardtail/, shape: "torpedo", body: "#5f8fa6", belly: "#dfeaee", mark: "" },
    { m: /little tunny|bonito|false albacore/, shape: "torpedo", body: "#5f7f94", belly: "#e6edf0", mark: "dots" },
    { m: /pinfish/, shape: "deep", body: "#b9b27a", belly: "#ece8c4", mark: "stripe" },
    { m: /mullet/, shape: "torpedo", body: "#8d9c9e", belly: "#eef1f0", mark: "stripe" },
    { m: /mojarra|silver jenny/, shape: "deep", body: "#b9c4c8", belly: "#f3f5f5", mark: "" },
    { m: /sardine|pilchard|greenback|whitebait/, shape: "torpedo", body: "#6f93a0", belly: "#e9eff1", mark: "dots" },
    { m: /herring/, shape: "torpedo", body: "#7d9aa6", belly: "#eef2f3", mark: "" },
    { m: /menhaden|pogy|pogie|bunker/, shape: "deep", body: "#79929c", belly: "#e6ebec", mark: "dots" },
    { m: /ballyhoo|halfbeak/, shape: "long", body: "#8fb0b8", belly: "#eef3f4", mark: "stripe" },
    { m: /anchov|glass minnow/, shape: "long", body: "#b9c6c2", belly: "#f4f6f5", mark: "stripe" },
    { m: /cigar minnow|round scad|cigarfish/, shape: "long", body: "#5f8f88", belly: "#e8efec", mark: "stripe" },
    { m: /golden shiner/, shape: "deep", body: "#c9a640", belly: "#f1e3a6", mark: "" },
    { m: /gizzard shad|threadfin shad/, shape: "deep", body: "#8fa3ad", belly: "#eef2f4", mark: "dots" },
    { m: /mosquitofish|gambusia/, shape: "long", body: "#a9a98d", belly: "#eeeedb", mark: "" },
    { m: /fathead minnow/, shape: "torpedo", body: "#8a8f64", belly: "#e6e6c8", mark: "stripe" },
    { m: /emerald shiner/, shape: "long", body: "#9db8a4", belly: "#f1f5f1", mark: "stripe" },
    { m: /alewife/, shape: "torpedo", body: "#7a9a96", belly: "#edf1ef", mark: "dots" },
    { m: /creek chub/, shape: "torpedo", body: "#8a8453", belly: "#e8e2bd", mark: "stripe" },
    // not fish: drawn with the nearest fish shape until the tank artist makes real ones (plans/bait-collections-plan.md)
    { m: /shrimp/, shape: "shrimp", body: "#e8a58a", belly: "#f8e3d8", mark: "stripe" },
    { m: /blue crab/, shape: "crab", body: "#4f86a8", belly: "#d8e6ee", mark: "dots" },
    { m: /fiddler crab/, shape: "crab", body: "#a98a5f", belly: "#ecdcbc", mark: "" },
    { m: /sand flea|mole crab|sand crab/, shape: "egg", body: "#b5ab97", belly: "#ece6d8", mark: "" },
    { m: /hermit crab/, shape: "crab", body: "#c8805a", belly: "#f0d4bf", mark: "bars" },
    { m: /crayfish|crawfish|crawdad/, shape: "shrimp", body: "#a8412f", belly: "#e6b6a8", mark: "stripe" },
    { m: /squid/, shape: "squid", body: "#d9b3b0", belly: "#f6ecea", mark: "" },
    { m: /crappie|speckled perch/, shape: "deep", body: "#a6aa8a", belly: "#eef0dc", mark: "dots" },
    { m: /\boscar\b/, shape: "deep", body: "#55503f", belly: "#d98a3d", mark: "bars" },
    { m: /tilapia/, shape: "deep", body: "#8fa3a5", belly: "#e3ecea", mark: "bars" },
    { m: /snook/, shape: "torpedo", body: "#bcbf78", belly: "#f3f1d2", mark: "stripe" },
    { m: /tarpon/, shape: "deep", body: "#a9b6c0", belly: "#eef2f5", mark: "scales" },
    { m: /redfish|red drum/, shape: "torpedo", body: "#c8683a", belly: "#f2cbaa", mark: "spot" },
    { m: /trout/, shape: "torpedo", body: "#9aa88c", belly: "#ecebdf", mark: "speckle" },
    { m: /jack|permit|pompano/, shape: "deep", body: "#c4ad55", belly: "#f0e7bd", mark: "" },
    { m: /snapper/, shape: "deep", body: "#b7542f", belly: "#ebb494", mark: "" },
    { m: /sheepshead/, shape: "deep", body: "#aeb4b7", belly: "#e8ebec", mark: "bars" },
    { m: /drum/, shape: "deep", body: "#6d7176", belly: "#bbbec0", mark: "bars" },
    { m: /barracuda|needlefish|ladyfish|wahoo|cobia/, shape: "long", body: "#8d9aa3", belly: "#e4e9ec", mark: "stripe" },
    { m: /mackerel|bluefish|mahi|dolphin|sailfish|king/, shape: "torpedo", body: "#6f95a8", belly: "#e3edf2", mark: "stripe" },
    { m: /grouper/, shape: "bass", body: "#7b5b3b", belly: "#c8ab8c", mark: "dots" },
    { m: /peacock/, shape: "bass", body: "#c7a02a", belly: "#f1e3a2", mark: "bars+ocellus" },
    { m: /largemouth|bass/, shape: "bass", body: "#5f8a3e", belly: "#dbe7b4", mark: "stripe" },
    { m: /bluegill|sunfish|panfish|tilapia|cichlid|oscar|bream|crappie|warmouth|redear/, shape: "deep", body: "#4f8ca6", belly: "#e8a449", mark: "bars" },
    { m: /\bgar\b|snakehead|knifefish|bowfin/, shape: "long", body: "#7c8d5b", belly: "#dcdcb2", mark: "dots" },
    { m: /catfish|bullhead/, shape: "bass", body: "#6e7c87", belly: "#c5cdd2", mark: "" },
    { m: /shark/, shape: "shark", body: "#7d8b97", belly: "#e7ecef", mark: "" },
    { m: /ray|flounder|skate/, shape: "flat", body: "#8e7a5e", belly: "#d8c9ae", mark: "dots" }
  ];
  const TANK_SHAPES = {
    torpedo: { body: "M18 30 C34 12 86 8 114 30 C86 52 34 48 18 30 Z", tail: "M22 30 L2 13 L2 47 Z", fin: "M48 17 L62 7 L80 17 Z", fin2: "M62 45 L72 53 L84 44 Z" },
    deep: { body: "M24 30 C34 3 92 1 112 30 C92 59 34 57 24 30 Z", tail: "M27 30 L6 11 L6 49 Z", fin: "M42 11 L64 -1 L88 11 Z", fin2: "M58 51 L72 59 L86 50 Z" },
    bass: { body: "M20 30 C34 9 90 5 114 27 C113 41 100 51 70 51 C40 53 26 45 20 30 Z", tail: "M23 30 L3 14 L3 46 Z", fin: "M44 13 L62 3 L86 12 Z", fin2: "M60 48 L72 56 L84 48 Z" },
    long: { body: "M10 30 C30 21 92 19 117 28 L117 33 C92 41 30 39 10 30 Z", tail: "M14 30 L0 19 L0 41 Z", fin: "M30 24 L40 17 L52 23 Z", fin2: "M34 37 L42 43 L52 38 Z" },
    flat: { body: "M8 30 C28 4 96 4 116 30 C96 56 28 56 8 30 Z", tail: "M10 30 L-2 28 L-2 32 Z", fin: "M52 10 L62 6 L72 10 Z", fin2: "M52 50 L62 54 L72 50 Z" },
    // More fish bodies (v234): shark (pointed nose, tall tail), gar (long beak, fins far back), ray (diamond wings, thin tail), puffer (round), eel (wavy)
    shark: { body: "M10 31 C30 24 70 14 112 29 C116 31 116 33 112 34 C80 46 36 42 10 31 Z", tail: "M18 31 L2 4 L12 29 L4 46 Z", fin: "M54 21 L66 2 L78 20 Z", fin2: "M80 36 L70 56 L92 40 Z", eye: [100, 28], er: 2.4, gill: false },
    gar: { body: "M12 30 C30 25 80 25 100 28 L124 29 L124 31 L100 33 C80 36 30 36 12 30 Z", tail: "M16 30 L4 22 L0 30 L4 38 Z", fin: "M24 27 L30 19 L42 27 Z", fin2: "M24 33 L30 41 L42 33 Z", eye: [94, 28], er: 2.4, gill: false },
    ray: { body: "M8 30 C24 24 44 6 64 4 C84 6 98 22 118 30 C98 38 84 54 64 56 C44 54 24 36 8 30 Z", tail: "M12 30 L-6 29.2 L-6 30.8 Z", fin: "M50 28 L56 24 L60 28 Z", fin2: "M52 32 L58 36 L62 32 Z", eyes: [[92, 24], [92, 36]], er: 2.4, gill: false },
    puffer: { body: "M22 30 C22 6 100 4 108 30 C100 56 22 54 22 30 Z", tail: "M26 30 L12 20 L12 40 Z", fin: "M44 12 L52 5 L60 12 Z", fin2: "M60 48 L68 56 L76 48 Z", eye: [92, 24], er: 3, gill: false },
    eel: { body: "M4 30 C20 20 36 40 52 30 C68 20 84 40 100 30 L118 28 L118 32 L100 33 C84 44 68 24 52 34 C36 44 20 24 4 32 Z", tail: "M6 31 L0 27 L0 35 Z", fin: "M52 26 L58 23 L63 28 Z", fin2: "M52 36 L58 39 L63 34 Z", eye: [110, 29], er: 2, gill: false },
    // Not fish (v233): same four moving parts, so the swim engine treats them alike. `eye` moves the eyes; `gill: false` hides the gill line.
    // crab (seen from above, like a crab drawing turned to face right): scalloped shell, big claws with a wrist, three bent legs each side, paddle legs at the back, eyes on stalks
    crab: { body: "M50 12 Q58 8 66 12 Q72 12 74 18 Q78 22 76 30 Q78 38 74 42 Q72 48 66 48 Q58 52 50 48 Q42 44 42 30 Q42 16 50 12 Z", tail: "M44 21 L34 16 L27 20 L31 27 L42 27 Z M44 39 L34 44 L27 40 L31 33 L42 33 Z", extra: "M64 14 L64 4 L58 -2 M56 12 L52 2 L44 0 M48 13 L40 5 L32 6 M64 46 L64 56 L58 62 M56 48 L52 58 L44 60 M48 47 L40 55 L32 54 M75 28 L79 26 M75 32 L79 34", xw: 2.6, fin: "M68.8 17.6 L72.5 12.7 L77.4 13.9 L75 20.1 Z M75 11.4 C78.7 6.5 88.6 6.5 93.6 10.2 C96 12 96 15.1 93.6 17.6 C88.6 20.1 79.9 18.9 75 15.1 Z M91.1 8.3 C96 5.2 101 8.9 99.8 13.9 C97.3 11.4 94.8 11.4 92.3 12.7 Z M92.3 16.4 C96 15.1 99.8 16.4 99.8 20.1 C96 20.1 92.3 20.1 88.6 18.9 Z", fin2: "M68.8 42.4 L72.5 47.3 L77.4 46.1 L75 39.9 Z M75 48.6 C78.7 53.5 88.6 53.5 93.6 49.8 C96 48 96 44.9 93.6 42.4 C88.6 39.9 79.9 41.1 75 44.9 Z M91.1 51.7 C96 54.8 101 51.1 99.8 46.1 C97.3 48.6 94.8 48.6 92.3 47.3 Z M92.3 43.6 C96 44.9 99.8 43.6 99.8 39.9 C96 39.9 92.3 39.9 88.6 41.1 Z", eyes: [[80, 25], [80, 35]], er: 2, gill: false, line: true },
    // shrimp / crayfish: curved body, tail fan, feelers (fin), little legs (fin2)
    shrimp: { body: "M26 36 C32 12 92 6 112 24 C114 32 106 36 98 32 C80 22 52 28 40 42 C34 46 24 42 26 36 Z", tail: "M30 38 L6 26 L2 40 L10 50 Z", fin: "M108 22 L124 12 L124 16 L111 27 Z", fin2: "M62 31 L66 46 L74 31 Z", eye: [100, 24], gill: false },
    // squid: pointed body with side fins at the back and trailing tentacles at the front
    squid: { body: "M10 30 C28 21 58 18 76 22 C86 22 92 25 92 30 C92 35 86 38 76 38 C58 42 28 39 10 30 Z", tail: "M8 30 L22 12 L40 21 L30 30 L40 39 L22 48 Z", extra: "M92 27 Q104 21 116 24 M92 29 Q106 27 120 30 M92 31 Q106 33 120 34 M92 33 Q104 39 116 38 M90 26 Q100 16 112 14 M90 34 Q100 44 112 46", xw: 2, fin: "M92 28 Q108 24 122 26 L121 29 Q108 28 92 31 Z", fin2: "M92 32 Q108 34 122 32 L121 35 Q108 36 92 33 Z", eye: [82, 27], er: 3.8, gill: false },
    // egg: small round sand flea / mole crab with feelers
    egg: { body: "M18 34 C16 16 58 8 84 20 C94 25 96 34 90 40 C78 50 34 52 18 34 Z", tail: "M20 38 L8 42 L10 34 L4 32 L16 30 Z", extra: "M34 46 L30 56 M46 48 L44 58 M58 48 L58 58 M70 46 L72 56", xw: 2.2, fin: "M90 25 L112 12 L122 15 L112 20 L122 23 L110 26 L92 29 Z", fin2: "M90 33 L106 38 L114 46 L104 44 L92 38 Z", eye: [78, 25], er: 2.8, gill: false }
  };
  function tankLook(species) {
    const name = String(species || "").toLowerCase();
    const f = TANK_LOOKS.find(l => l.m.test(name));
    if (f) return f;
    let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return { shape: "deep", body: `hsl(${h} 42% 52%)`, belly: `hsl(${h} 50% 86%)`, mark: "" };
  }
  let tankUid = 0;
  // Draw one fish as inline SVG (faces right). Returns an <svg> element.
  // `live` = the fish has moving parts (tail swish, fin flutter, body sway, blinking). Every part has its own class (fs-tail, fs-fin,
  // fs-fin2, fs-body, fs-eye) so an artist's pieces can be swapped in later. Motion is switched off for reduced-motion in the CSS.
  function fishSvg(species, px, live) {
    const NS = "http://www.w3.org/2000/svg", L = tankLook(species), S = TANK_SHAPES[L.shape], id = "tf" + (++tankUid);
    const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", "-4 -4 128 68"); svg.setAttribute("width", px); svg.setAttribute("height", Math.round(px * 68 / 128)); svg.setAttribute("aria-hidden", "true");
    const mk = (tag, a) => { const e = document.createElementNS(NS, tag); Object.keys(a).forEach(k => e.setAttribute(k, a[k])); return e; };
    const defs = mk("defs", {}); const g = mk("linearGradient", { id: id + "g", x1: 0, y1: 0, x2: 0, y2: 1 });
    [[0, L.body], [0.55, L.body], [1, L.belly]].forEach(([o, c]) => g.appendChild(mk("stop", { offset: o, "stop-color": c })));
    const cp = mk("clipPath", { id: id + "c" }); cp.appendChild(mk("path", { d: S.body })); defs.appendChild(g); defs.appendChild(cp); svg.appendChild(defs);
    const hasMark = m => String(L.mark || "").split("+").indexOf(m) >= 0;
    const dark = "rgba(20,30,35,.55)", rig = mk("g", { class: "fs-rig" });
    const ln = S.line ? { stroke: "rgba(0,0,0,.4)", "stroke-width": 0.9, "stroke-linejoin": "round" } : {}; // crabs: outlined claws and paddles, solid
    rig.appendChild(mk("path", Object.assign({ class: "fs-tail", d: S.tail, fill: L.body }, ln))); rig.appendChild(mk("path", Object.assign({ class: "fs-fin", d: S.fin, fill: L.body, opacity: S.line ? 1 : .85 }, ln))); rig.appendChild(mk("path", Object.assign({ class: "fs-fin2", d: S.fin2, fill: L.body, opacity: S.line ? 1 : .8 }, ln)));
    if (S.extra) rig.appendChild(mk("path", { class: "fs-extra", d: S.extra, fill: "none", stroke: L.body, "stroke-width": S.xw || 2.4, "stroke-linecap": "round", "stroke-linejoin": "round" })); // legs / arms
    const body = mk("g", { class: "fs-body" });
    body.appendChild(mk("path", { d: S.body, fill: `url(#${id}g)`, stroke: "rgba(0,0,0,.25)", "stroke-width": 1 }));
    const marks = mk("g", { "clip-path": `url(#${id}c)` });
    if (hasMark("stripe")) marks.appendChild(mk("path", { d: "M26 30 L112 29", stroke: dark, "stroke-width": 3.2, fill: "none" }));
    if (hasMark("bars")) [44, 58, 72, 86].forEach(x => marks.appendChild(mk("rect", { x, y: 0, width: 5, height: 60, fill: dark, opacity: .6 })));
    if (hasMark("spot")) marks.appendChild(mk("circle", { cx: 34, cy: 28, r: 4.5, fill: "#1b1b1b" }));
    if (hasMark("dots")) [[50, 22], [64, 28], [78, 21], [58, 38], [90, 30], [44, 30], [72, 36]].forEach(([x, y]) => marks.appendChild(mk("circle", { cx: x, cy: y, r: 2.4, fill: dark })));
    if (hasMark("speckle")) [[40, 24], [48, 20], [56, 23], [64, 19], [72, 22], [80, 20], [88, 23], [52, 28], [68, 27], [84, 28], [44, 30], [60, 31], [76, 31], [50, 34]].forEach(([x, y]) => marks.appendChild(mk("circle", { cx: x, cy: y, r: 1.4, fill: dark })));
    if (hasMark("ocellus")) marks.appendChild(mk("circle", { cx: 34, cy: 30, r: 6, fill: "#1f1f1f", stroke: "#f2c14e", "stroke-width": 1.6 }));
    if (hasMark("scales")) [[46, 22], [60, 22], [74, 22], [88, 24], [53, 32], [67, 32], [81, 33], [60, 42], [74, 42]].forEach(([x, y]) => marks.appendChild(mk("circle", { cx: x, cy: y, r: 6, fill: "none", stroke: "rgba(255,255,255,.55)", "stroke-width": 1 })));
    body.appendChild(marks);
    if (S.gill !== false) body.appendChild(mk("path", { class: "fs-gill", d: "M92 18 C98 26 98 36 92 44", stroke: "rgba(0,0,0,.25)", "stroke-width": 1.4, fill: "none" })); // gill
    const eye = mk("g", { class: "fs-eye" });
    (S.eyes || [S.eye || [102, 27]]).forEach(ey => { const r = S.er || 3.4;
      eye.appendChild(mk("circle", { cx: ey[0], cy: ey[1], r, fill: "#fff" })); eye.appendChild(mk("circle", { cx: ey[0] + 1, cy: ey[1], r: r * 0.56, fill: "#101010" })); });
    body.appendChild(eye); rig.appendChild(body); svg.appendChild(rig);
    if (live) { // each fish moves a little differently: its own speed and starting point
      let h = tankUid * 37; for (let i = 0; i < species.length; i++) h = (h * 31 + species.charCodeAt(i)) % 997;
      const fast = /^(long|gar|eel)$/.test(L.shape) ? 0.7 : /^(flat|ray)$/.test(L.shape) ? 1.5 : 1;
      svg.setAttribute("class", "fish-live"); svg.style.setProperty("--fd", (fast * (0.85 + (h % 40) / 100)).toFixed(2) + "s"); svg.style.setProperty("--fo", "-" + ((h % 17) / 10).toFixed(1) + "s"); svg.style.setProperty("--bl", (4 + h % 5) + "s");
    }
    return svg;
  }
  // Pure maths: turns your catches into { salt: {fish, pond}, fresh: {fish, pond} }.
  function tankBuild(catches, spotList) {
    const spotOf = id => (spotList || []).find(s => s.id === id);
    const better = (a, b) => {
      const w = x => x.weight_lb == null ? -1 : +x.weight_lb, l = x => x.length_in == null ? -1 : +x.length_in;
      return w(a) - w(b) || l(a) - l(b) || new Date(a.caught_at) - new Date(b.caught_at);
    };
    const by = {};
    catches.forEach(c => { const sp = String(c.species || "").trim(); if (!sp) return; (by[sp.toLowerCase()] = by[sp.toLowerCase()] || []).push(c); });
    const out = { salt: { fish: [], pond: [] }, fresh: { fish: [], pond: [] } };
    Object.keys(by).forEach(key => {
      const list = by[key].slice().sort((a, b) => better(b, a)), best = list[0], name = cap(String(best.species).trim());
      const sf = typeof seasonFor === "function" ? seasonFor(name) : null;
      let home;
      if (sf) home = sf.group === "fresh" || sf.group === "baitfresh" || /crayfish|crawfish|crawdad/i.test(name) ? "fresh" : "salt";
      else if (TANK_FRESH_RE.test(name)) home = "fresh";
      else { let fr = 0, other = 0; list.forEach(c => { const s = spotOf(c.spot_id); if (s && s.water_type === "freshwater") fr++; else other++; }); home = fr > other ? "fresh" : "salt"; }
      const extra = Math.max(0, (best.how_many || 1) - 1) + list.slice(1).reduce((n, c) => n + (c.how_many || 1), 0);
      const sp = spotOf(best.spot_id);
      out[home].fish.push({ key, species: name, catchRow: best, spotName: sp ? sp.name : null, pondCount: extra, look: tankLook(name) });
      if (extra) out[home].pond.push({ species: name, n: extra });
    });
    ["salt", "fresh"].forEach(t => { out[t].fish.sort((a, b) => better(b.catchRow, a.catchRow)); out[t].pond.sort((a, b) => b.n - a.n); });
    return out;
  }
  const tankInches = c => c.length_in != null ? +c.length_in : c.weight_lb != null ? 4 + 10 * Math.cbrt(+c.weight_lb) : 14;
  const tankPx = c => Math.max(40, Math.min(118, Math.round(14 + tankInches(c) * 2)));
  function tankFishText(f) {
    const c = f.catchRow, bits = [];
    if (c.weight_lb != null) bits.push(`${(+c.weight_lb).toFixed(1)} lb`);
    if (c.length_in != null) bits.push(`${(+c.length_in).toFixed(1)} in`);
    return bits.join(" · ");
  }
  const tankReduced = () => { try { return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches); } catch (e) { return false; } };
  // ---- 🔊 Tank sound: tiny sounds made in the browser (no files). OFF until the person taps 🔊, remembered on this phone, mute button always visible ----
  const tankSnd = { on: false, ctx: null, amb: null, last: {}, timer: 0 };
  try { tankSnd.on = localStorage.getItem("fm-tank-sound") === "1"; } catch (e) { /* fine */ }
  function sndCtx() { // phones only allow sound after a tap, so this is first called from the button
    if (tankSnd.ctx) return tankSnd.ctx;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    try { tankSnd.ctx = new AC(); } catch (e) { return null; }
    return tankSnd.ctx;
  }
  function sndBlip(c, t, f0, f1, dur, vol, type) { // one short tone that glides from f0 to f1 Hz
    const o = c.createOscillator(), g = c.createGain(); o.type = type || "sine";
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function sndNoise(c, secs) { const n = Math.floor(c.sampleRate * secs), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; return b; }
  const SND = {
    bubble(c, t) { const f = 300 + Math.random() * 500; sndBlip(c, t, f, f * 1.8, 0.09, 0.07); },
    plop(c, t) { sndBlip(c, t, 420, 110, 0.14, 0.16); },
    nibble(c, t) { sndBlip(c, t, 900 + Math.random() * 300, 500, 0.035, 0.05, "triangle"); },
    splash(c, t) { const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = sndNoise(c, 0.3); f.type = "bandpass"; f.frequency.value = 900; f.Q.value = 0.7;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28); s.connect(f); f.connect(g); g.connect(c.destination); s.start(t); s.stop(t + 0.3); },
    chest(c, t) { sndBlip(c, t, 130, 90, 0.35, 0.09, "sawtooth"); [0, 1, 2, 3].forEach(i => sndBlip(c, t + 0.28 + i * 0.07, 520 + i * 160, 700 + i * 160, 0.12, 0.05)); },
    coin(c, t) { sndBlip(c, t, 988, 988, 0.1, 0.09, "square"); sndBlip(c, t + 0.09, 1319, 1319, 0.22, 0.09, "square"); }
  };
  const SND_GAP = { bubble: 60, plop: 120, nibble: 140, splash: 150, chest: 800, coin: 400 }; // so a crowd of events cannot turn into noise
  function snd(name) {
    if (!tankSnd.on) return;
    const now = Date.now(); if (now - (tankSnd.last[name] || 0) < (SND_GAP[name] || 100)) return; tankSnd.last[name] = now;
    const c = sndCtx(); if (!c || !SND[name]) return;
    try { if (c.state === "suspended") c.resume(); SND[name](c, c.currentTime + 0.01); } catch (e) { /* sound is never worth a crash */ }
  }
  function sndAmbience(play) { // a very quiet water hum while the Tank tab is open
    const c = tankSnd.ctx; if (!c) return;
    if (!tankSnd.amb) {
      const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      s.buffer = sndNoise(c, 3); s.loop = true; f.type = "lowpass"; f.frequency.value = 380; g.gain.value = 0;
      lfo.frequency.value = 0.15; lg.gain.value = 120; lfo.connect(lg); lg.connect(f.frequency);
      s.connect(f); f.connect(g); g.connect(c.destination); s.start(); lfo.start(); tankSnd.amb = g;
    }
    try { tankSnd.amb.gain.setTargetAtTime(play ? 0.06 : 0, c.currentTime, 0.4); } catch (e) { /* fine */ }
  }
  function sndWatch() { // keeps the hum on only while sound is on, the page is showing, and the Tank tab is open
    const v = document.getElementById("view-tank");
    sndAmbience(tankSnd.on && !document.hidden && !!v && !v.hidden);
  }
  function sndSet(on) {
    tankSnd.on = on; try { localStorage.setItem("fm-tank-sound", on ? "1" : "0"); } catch (e) { /* fine */ }
    if (on) { const c = sndCtx(); if (c && c.state === "suspended") c.resume(); if (!tankSnd.timer) tankSnd.timer = setInterval(sndWatch, 1500); sndWatch(); snd("bubble"); }
    else { sndAmbience(false); if (tankSnd.timer) { clearInterval(tankSnd.timer); tankSnd.timer = 0; } }
    sndButtons();
  }
  function sndButtons() { document.querySelectorAll(".snd-btn").forEach(b => { const ic = b.classList.contains("snd-icon"); b.textContent = ic ? (tankSnd.on ? "🔊" : "🔇") : tankSnd.on ? "🔊 Sound on" : "🔇 Sound off"; if (ic) b.setAttribute("aria-label", "Tank sound"); b.setAttribute("aria-pressed", String(tankSnd.on)); }); }
  function sndButton() { // a mute button (also used inside full screen)
    const b = el("button", "btn small ghost snd-btn"); b.type = "button"; b.addEventListener("click", () => sndSet(!tankSnd.on)); b.textContent = tankSnd.on ? "🔊 Sound on" : "🔇 Sound off"; b.setAttribute("aria-pressed", String(tankSnd.on)); return b;
  }
  if (tankSnd.on) tankSnd.timer = setInterval(sndWatch, 1500); // returning visitors who turned it on: it only makes noise after their first tap (phones insist)

  // ---- 🪙 Coins & 💎 gems: earned from photographed catches, new species/bests, finished collections and official tournaments ----
  // All the rules and the daily limit live in the database (setup/41); the app only asks "claim_coins" and shows the result.
  // Gems are earned only. The shop that spends them comes next (simulator step 7).
  let tankMode = "tanks";   // which Play › Tank view shows (tanks, pond, lagoon, shop); js/73 draws it
  let wallet = null, walletBusy = false, walletAt = 0;
  const COIN_WHY = { catch: "photographed catch", measured: "measured it", species: "new species", sighting: "sighting with a photo", best: "new personal best", collection: "finished a collection", tournament: "tournament placing", purchase: "bought", race: "won a fish race", race_fee: "race entry fee", race_prize: "race prize", race_refund: "race fee back", challenge: "weekly challenge", challenge_week: "all weekly challenges done" };
  const COIN_GROUPS = { inshore: "Inshore", beach: "Beach & pier", offshore: "Offshore", fresh: "Freshwater", bait: "Saltwater bait", baitfresh: "Freshwater bait", baitother: "Shrimp, crabs & other bait" };
  function walletToast(added) {
    if (!added || !added.length) return;
    const coins = added.reduce((a, x) => a + (x.coins || 0), 0), gems = added.reduce((a, x) => a + (x.gems || 0), 0);
    const why = [...new Set(added.map(x => COIN_WHY[x.reason] || x.reason))].join(", ");
    snd("coin");
    if (typeof toast === "function") toast(`🪙 +${coins}${gems ? " · 💎 +" + gems : ""} — ${why}`, 5000);
  }
  // After a tournament placing: say which trophy cup just landed (it is in the user's items, created in the last 2 minutes)
  async function cupToast() {
    try {
      if (!me || !db || typeof toast !== "function") return;
      await needCode("tank").catch(() => {});   // the cup names live with the Shop (js/73)
      const since = new Date(Date.now() - 120000).toISOString();
      const { data, error } = await db.from("user_items").select("item_key").eq("user_id", me.id).gte("created_at", since);
      if (error) return;
      const cups = (data || []).map(x => x.item_key).filter(k => /^trophy_/.test(k));
      if (!cups.length) return;
      const nm = k => (typeof SHOP_ART !== "undefined" && SHOP_ART[k] && SHOP_ART[k].n) || "trophy cup";
      toast("🏆 You won the " + cups.map(nm).join(" and the ") + "! Place it with 🎨 Customize on a tank.", 6000);
    } catch (e) { /* the cup is still in the shop list; the message is only a bonus */ }
  }
  async function tankClaim(force) {
    if (walletBusy || !me || !db || !db.rpc) return;
    if (!force && Date.now() - walletAt < 45000) return;
    walletBusy = true;
    try {
      const r = await db.rpc("claim_coins"); if (r.error || !r.data || typeof r.data.coins !== "number") throw (r.error || new Error("no wallet"));
      wallet = r.data; walletAt = Date.now(); walletToast(wallet.added); walletDraw();
      if (typeof chClaim === "function") chClaim();   // weekly challenges (js/68) pay out on the same check
      if ((wallet.added || []).some(x => x.reason === "tournament")) { if (typeof shop !== "undefined") shop.ready = false; setTimeout(cupToast, 5200); } // a trophy cup may have arrived: reload what you own + tell the winner
      // finished collection groups: ask once per group (the server checks every species has a photographed catch)
      const mine = Object.values(catchesBySpot || {}).flat().filter(c => c.created_by === me.id && !c.deleted_at);
      for (const g of tankCollection(mine)) {
        if (g.total < 5 || g.got.length !== g.total || (wallet.collections || []).includes(g.key)) continue;
        const alts = g.got.map(n => [...new Set(mine.filter(c => { const f = seasonFor(c.species); return f && f.name === n; }).map(c => c.species))]);
        const c2 = await db.rpc("claim_collection", { p_group: g.key, p_species: alts });
        if (!c2.error && c2.data && typeof c2.data.coins === "number") { wallet = c2.data; walletToast(wallet.added); walletDraw(); }
      }
    } catch (e) { /* offline, or not signed in yet: no coins right now, nothing is lost — they are claimed next time */ }
    walletBusy = false;
  }
  function walletDraw() {
    const box = $("wallet-box"); if (!box) return; box.innerHTML = "";
    const more = $("wallet-more") || box; if (more !== box) more.innerHTML = "";   // Play: the pills sit in the title line, the rest inside ⓘ
    if (!wallet) return;
    const row = el("div", "wallet-row");
    const chip = (e, n, t) => { const c = el("span", "coin-chip"); c.title = t; c.setAttribute("role", "img"); c.setAttribute("aria-label", `${n} ${e === "💎" ? "gems" : "coins"}`); c.appendChild(el("span", "", e)); c.appendChild(el("b", "", String(n))); return c; };
    row.appendChild(chip("🪙", wallet.coins, "Coins")); row.appendChild(chip("💎", wallet.gems, "Gems — earned only, never sold"));
    box.appendChild(row);
    more.appendChild(el("div", "spot-meta", `Today: ${wallet.today} of ${wallet.cap} catch coins`));
    const det = el("details", "wallet-more"); det.appendChild(el("summary", "", "How do I earn coins and gems?"));
    ["🪙 2 for every catch you log with a photo (+1 if you measure it) — up to 50 a day.",
      "🪙 1 for a 🌎 Public sighting with a photo you just took (10 a day at most).",
      "🪙 40 the first time you catch a species · 🪙 25 for a new personal best (3 a day at most).",
      "🪙 150 + 💎 2 when you finish a collection.",
      "🏆 Official tournaments, top 3: 🪙 200 / 120 / 80 and 💎 3 / 2 / 1.",
      "🎯 Weekly challenges (on Compete): 🪙 20–40 each, and 💎 2 when you finish all of them before the week ends.",
      "💎 Gems can only be earned — they are never for sale. The shop where you spend them is coming soon."].forEach(t => det.appendChild(el("div", "spot-meta", t)));
    if ((wallet.recent || []).length) {
      det.appendChild(el("div", "label wallet-h", "Recent"));
      wallet.recent.forEach(r => det.appendChild(el("div", "spot-meta", `${r.currency === "gems" ? "💎" : "🪙"} ${r.amount > 0 ? "+" : "−"}${Math.abs(r.amount)} — ${r.reason === "collection" || r.reason === "tournament" ? (COIN_WHY[r.reason] + (r.note ? ": " + (COIN_GROUPS[r.note] || r.note) : "")) : (COIN_WHY[r.reason] || r.reason) + (r.note ? " · " + r.note : "")}`)));
    }
    more.appendChild(det);
  }
  // 🏆 Collections count (the Collections card itself is drawn by js/73): how many of each Seasons group you have caught
  function tankCollection(catches) {
    const seen = new Set();
    (catches || []).forEach(c => { if (c.deleted_at) return; const f = seasonFor(c.species); if (f) seen.add(f.name); });
    return SEASON_GROUPS.map(([key, label]) => {
      const all = SEASONS.filter(f => (f.group === key || (key === "bait" && f.alsoBait)) && (!f.far || key === "baitfresh") && !/mullet run/i.test(f.name)).map(f => f.name);   // only fish that live here
      const got = all.filter(n => seen.has(n));
      return { key, label, total: all.length, got, missing: all.filter(n => !seen.has(n)) };
    }).filter(g => g.total);
  }
  // ---- ✨ New best! When a fresh catch beats the best of its species (or is the first of its kind), a small celebration shows. ----
  // Called right after a catch is saved, before the lists reload, so "your tank before" is still the old one. Never throws.
  function tankCheck(row) {
    try {
      if (!me || !row || !String(row.species || "").trim()) return null;
      const mine = Object.values(catchesBySpot).flat().filter(c => c.created_by === me.id && !c.deleted_at && c.id !== row.id);
      const nr = Object.assign({}, row, { id: row.id || "new-catch", created_by: me.id, how_many: row.how_many || 1 });
      const key = String(row.species).trim().toLowerCase();
      const find = t => { for (const k of ["salt", "fresh"]) { const f = t[k].fish.find(x => x.key === key); if (f) return { f, kind: k }; } return null; };
      const after = find(tankBuild(mine.concat(nr), spots)), before = find(tankBuild(mine, spots));
      if (!after || after.f.catchRow !== nr) return null;
      if (before) {
        const w = x => x.weight_lb == null ? -1 : +x.weight_lb, l = x => x.length_in == null ? -1 : +x.length_in;
        if (!(((w(nr) - w(before.f.catchRow)) || (l(nr) - l(before.f.catchRow))) > 0)) return null; // a tie is not a new best
      }
      let goal = "";
      if (!before) {
        const sf = seasonFor(row.species), g = sf && tankCollection(mine.concat(nr)).find(x => x.key === sf.group);
        if (g) goal = g.got.length === g.total ? `🏅 That completes your ${g.label.toLowerCase()} collection!` : `That's ${g.got.length} of ${g.total} in your ${g.label.toLowerCase()} collection.`;
      }
      return { species: after.f.species, kind: after.kind, first: !before, now: tankFishText(after.f), old: before ? tankFishText(before.f) : "", goal };
    } catch (e) { return null; }
  }
  function tankPop(r) {
    if (!r) return;
    const salt = r.kind === "salt", prev = document.activeElement;
    const bg = el("div", "ask-bg"), box = el("div", "ask-box best-pop");
    box.setAttribute("role", "alertdialog"); box.setAttribute("aria-modal", "true");
    for (let i = 0; i < 14; i++) { const c = el("span", "confetti"); c.style.left = (4 + i * 7) + "%"; c.style.animationDelay = (i % 5) * 0.15 + "s"; c.style.background = ["#f2b134", "#e4572e", "#29a3a3", "#7bbf4a", "#c25ea8"][i % 5]; box.appendChild(c); }
    const fw = el("div", "best-fish"); fw.appendChild(fishSvg(r.species, 150, true)); box.appendChild(fw);
    box.appendChild(el("div", "best-t", r.first ? `🐠 New fish for your ${salt ? "saltwater" : "freshwater"} tank!` : `✨ New best ${r.species}!`));
    const lines = [];
    if (r.first) lines.push(`Your first ${r.species}${r.now ? " — " + r.now : ""}. It's swimming in the ${salt ? "saltwater" : "freshwater"} tank now.`);
    if (r.first && r.goal) lines.push(r.goal);
    else if (!r.first) { lines.push(`${r.now || "This one"} beats your old ${r.old || "best"}.`); lines.push(`The old fish moved to the ${salt ? "lagoon" : "pond"}.`); }
    lines.forEach(t => box.appendChild(el("div", "ask-text", t)));
    const row = el("div", "ask-btns"), bOk = el("button", "btn", "Nice!"), bSee = el("button", "btn ghost", "See my tank");
    bOk.type = bSee.type = "button"; row.appendChild(bSee); row.appendChild(bOk); box.appendChild(row); bg.appendChild(box);
    const end = () => { document.removeEventListener("keydown", key, true); bg.remove(); if (prev && prev.focus) { try { prev.focus(); } catch (e) { /* fine */ } } };
    const key = e => { if (e.key === "Escape") { e.preventDefault(); end(); } };
    document.addEventListener("keydown", key, true);
    bOk.addEventListener("click", end); bg.addEventListener("click", e => { if (e.target === bg) end(); });
    bSee.addEventListener("click", () => { end(); tankMode = "tanks"; $("tab-tank").click(); });
    document.body.appendChild(bg); bOk.focus();
  }


  // ---- Length and weight ----
  // Weight from length: weight grows with the cube of length, so each fish has one reference point
  // ("a typical 30-inch snook weighs about 8.7 lb") and weight = ref lb × (length ÷ ref length)³.
  // Rough averages for Florida fish — a fat or skinny fish can be 20% off either way.
  const WEIGHT_REF = [
    [["snook"], 30, 8.7], [["tarpon"], 60, 85], [["redfish", "red drum"], 27, 7.5], [["seatrout", "speckled trout", "trout"], 20, 3],
    [["crevalle", "jack"], 30, 16], [["mangrove", "gray snapper"], 16, 2.4], [["mutton"], 24, 7.8], [["yellowtail"], 16, 1.7],
    [["lane snapper"], 12, 1], [["red snapper"], 24, 8], [["pompano"], 15, 2.1], [["permit"], 30, 20], [["spanish"], 20, 2.2],
    [["bluefish"], 20, 2.7], [["sheepshead"], 16, 3.2], [["whiting", "kingcroaker"], 14, 0.95], [["kingfish", "king mackerel"], 40, 15.7],
    [["mahi", "dolphin"], 40, 19.6], [["wahoo"], 60, 48], [["black grouper"], 36, 25], [["red grouper"], 24, 7], [["gag"], 30, 12],
    [["goliath"], 60, 120], [["barracuda"], 40, 14.5], [["cobia"], 40, 19], [["ladyfish"], 20, 1.5], [["black drum"], 30, 15],
    [["largemouth"], 20, 5], [["peacock"], 18, 4], [["snakehead"], 30, 10], [["bluegill", "panfish", "shellcracker"], 8, 0.5],
    [["mayan", "cichlid"], 10, 0.9], [["mullet"], 16, 1.6]
  ];
  function weightRef(species) {
    const sp = (species || "").toLowerCase();
    // more specific names first ("red snapper" before "snapper", "black drum" before "drum")
    return WEIGHT_REF.slice().sort((a, b) => Math.max(...b[0].map(w => w.length)) - Math.max(...a[0].map(w => w.length)))
      .find(r => r[0].some(w => sp.includes(w)));
  }
  function estWeight(species, lengthIn) {
    const r = weightRef(species);
    if (!r || !(lengthIn > 0)) return null;
    return r[2] * Math.pow(lengthIn / r[1], 3);
  }
  const lbText = lb => lb >= 10 ? `${Math.round(lb)} lb` : lb >= 1 ? `${lb.toFixed(1)} lb` : `${Math.round(lb * 16)} oz`;
  function sizeFields(species, lenStr, wStr) {
    const len = parseFloat(lenStr), w = parseFloat(wStr);
    const length_in = len > 0 && len < 200 ? Math.round(len * 4) / 4 : null;
    if (w > 0 && w < 2000) return { length_in, weight_lb: Math.round(w * 100) / 100, weight_est: false };
    const est = length_in ? estWeight(species, length_in) : null;
    return { length_in, weight_lb: est && est < 2000 ? Math.round(est * 100) / 100 : null, weight_est: !!est };
  }
  function sizeText(c) {
    const parts = [];
    if (c.length_in != null) parts.push(`${+Number(c.length_in).toFixed(2)}″`);
    if (c.weight_lb != null) parts.push((c.weight_est ? "≈" : "") + lbText(Number(c.weight_lb)));
    return parts.length ? ` (${parts.join(", ")})` : "";
  }
  function updateSizeNote() {
    const q = id => catchForm.querySelector(id);
    const len = parseFloat(q("#c-length").value), w = parseFloat(q("#c-weight").value), sp = q("#c-species").value;
    const note = q("#c-size-note");
    keeperShow(q("#c-keeper"), sp, len, new Date());
    if (w > 0) { note.textContent = ""; return; }
    if (!(len > 0)) { note.textContent = "Tip: lay a ruler, dollar bill or card next to the fish and shoot from straight above — then tap 📏 to measure."; return; }
    const est = estWeight(sp, len);
    note.textContent = est ? `⚖️ About ${lbText(est)} for a ${len}″ ${weightRef(sp)[0][0]} (estimated from length — type a weight if you weighed it)`
      : (sp ? "No weight estimate for this species yet — type a weight if you weighed it." : "Pick the species to get a weight estimate.");
  }
  ["#c-length", "#c-weight", "#c-species"].forEach(id => catchForm.querySelector(id).addEventListener("input", updateSizeNote));

  // ---- Tap-to-measure: live camera → freeze → drag 4 dots (fish nose/tail + something of known size) with a magnifier and a live readout ----
  // A web page can't use the iPhone's depth sensor (LiDAR/ARKit), so scale comes from a reference lying beside the fish; the level indicator helps keep the shot flat.
  const M_REFS = [["6.14", "💵 Dollar bill"], ["3.37", "💳 Card"], ["4.83", "🥤 Can"], ["ruler", "📏 Ruler / tape"], ["custom", "✏️ Other"]];
  const ms = { pts: [], drag: -1, sel: 0, z: 1, tx: 0, ty: 0, pan: null, ptrs: new Map(), pinch: null, onUse: null, onPhoto: null, onMarked: null, url: null, stream: null, ref: "3.37", refIn: "", autoMsg: "", quad: null, tilt: null, shotTilt: null, camera: false, W: 0, H: 0 };
  const mNeedsIn = () => ms.ref === "ruler" || ms.ref === "custom";
  // ---- 🔍 Auto-find the reference (dollar bill 6.14″ × 2.61″ or card 3.37″ × 2.13″) in the photo with OpenCV.js, loaded on demand (≈10 MB, kept after the first time) ----
  const CV_URL = "https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.10.0-release.1/dist/opencv.js";
  let cvReady = null;
  function loadCv() {
    if (cvReady) return cvReady;
    cvReady = new Promise((res, rej) => {
      if (window.cv && window.cv.Mat) return res({ cv: window.cv });
      const sc = document.createElement("script"); sc.src = CV_URL;
      sc.onload = () => {
        // Don't "await" window.cv: this build is thenable and resolving it loops forever. Just wait until it has Mat.
        const t0 = Date.now(), tick = () => {
          if (window.cv && window.cv.Mat) return res({ cv: window.cv });   // wrapped: the helper itself is thenable
          if (Date.now() - t0 > 90000) return rej(new Error("helper didn't start"));
          setTimeout(tick, 100);
        };
        tick();
      };
      sc.onerror = () => rej(new Error("couldn't download the helper"));
      document.head.appendChild(sc);
    });
    cvReady.catch(() => { cvReady = null; });
    return cvReady;
  }
  // Looks for a bill / card / can (side-on) / ruler-shaped rectangle. Returns { ref:"6.14"|"3.37"|"4.83"|"ruler", a, b, quad, ratio, alt } — a and b are the middles of its two short ends (a→b is its long side) — or null.
  // Shapes: bill 6.14×2.61 (2.35), card 3.37×2.13 (1.586), 12 oz can 4.83×2.6 (1.86), ruler/measuring sticker = long thin bar (≥ 5) that has tick marks.
  const CV_SHAPES = [["6.14", 2.35, "dollar bill"], ["3.37", 1.586, "card"], ["4.83", 1.86, "can"]];
  function hasTicks(cv, gray, rect) {   // straighten the bar and count light/dark flips along it: a ruler has many, a plain bar has none
    const P = cv.RotatedRect.points(rect), L = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
    const longFirst = L(P[0], P[1]) >= L(P[1], P[2]);
    const o = longFirst ? [P[0], P[1], P[2], P[3]] : [P[1], P[2], P[3], P[0]];     // o[0]→o[1] is the long side
    const W = 600, H = Math.max(8, Math.round(W * L(o[1], o[2]) / L(o[0], o[1])));
    const sm = cv.matFromArray(4, 1, cv.CV_32FC2, [o[0].x, o[0].y, o[1].x, o[1].y, o[2].x, o[2].y, o[3].x, o[3].y]);
    const dm = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, W, 0, W, H, 0, H]);
    const M = cv.getPerspectiveTransform(sm, dm), out = new cv.Mat();
    try {
      cv.warpPerspective(gray, out, M, new cv.Size(W, H));
      const col = new Float32Array(W);
      for (let x = 0; x < W; x++) { let t = 0; for (let y = 0; y < H; y++) t += out.ucharAt(y, x); col[x] = t / H; }
      let flips = 0, prev = 0;
      for (let x = 10; x < W - 10; x++) {
        let m = 0; for (let k = -10; k <= 10; k++) m += col[x + k]; m /= 21;
        const d = col[x] - m, sg = d > 6 ? 1 : d < -6 ? -1 : 0;
        if (sg && prev && sg !== prev) flips++;
        if (sg) prev = sg;
      }
      return flips;
    } finally { sm.delete(); dm.delete(); M.delete(); out.delete(); }
  }
  function detectReference(cv, canvas) {
    const k = Math.min(1, 640 / Math.max(canvas.width, canvas.height));
    const small = document.createElement("canvas"); small.width = Math.max(1, Math.round(canvas.width * k)); small.height = Math.max(1, Math.round(canvas.height * k));
    small.getContext("2d").drawImage(canvas, 0, 0, small.width, small.height);
    const src = cv.imread(small), gray = new cv.Mat(), blur = new cv.Mat(), edges = new cv.Mat(), kern = cv.Mat.ones(3, 3, cv.CV_8U), contours = new cv.MatVector(), hier = new cv.Mat();
    const frame = small.width * small.height;
    let best = null;
    try {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
      cv.Canny(blur, edges, 40, 120);
      cv.dilate(edges, edges, kern);
      cv.findContours(edges, contours, hier, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);
      for (let i = 0; i < contours.size(); i++) {
        const c = contours.get(i), area = cv.contourArea(c), approx = new cv.Mat();
        try {
          if (area / frame < 0.004 || area / frame > 0.5) continue;
          cv.approxPolyDP(c, approx, 0.03 * cv.arcLength(c, true), true);
          if (approx.rows !== 4 || !cv.isContourConvex(approx)) continue;
          const rect = cv.minAreaRect(c), w = rect.size.width, h = rect.size.height;
          if (!w || !h) continue;
          const ratio = Math.max(w, h) / Math.min(w, h), fill = area / (w * h);
          if (fill < 0.78) continue;
          let ref, d, alt = null;
          if (ratio >= 5) {                                   // long thin bar: only if it has tick marks
            if (hasTicks(cv, gray, rect) < 12) continue;
            ref = "ruler"; d = 0;
          } else {
            const ds = CV_SHAPES.map(([v, r, nm]) => ({ v, nm, d: Math.abs(ratio - r) / r })).sort((p, q) => p.d - q.d);
            if (ds[0].d > 0.14) continue;
            ref = ds[0].v; d = ds[0].d; if (ds[1].d <= 0.14) alt = ds[1].nm;
          }
          const score = d + (1 - Math.min(1, fill)) * 1.5 - (ref === "ruler" ? 0.2 : 0);
          if (best && best.score <= score) continue;
          best = { score, ref, pts: cv.RotatedRect.points(rect), fill, ratio, alt };
        } finally { approx.delete(); c.delete(); }
      }
      if (best && best.ref === "ruler") { /* keep */ }
    } finally { src.delete(); gray.delete(); blur.delete(); edges.delete(); kern.delete(); contours.delete(); hier.delete(); }
    if (!best) return null;
    const P = best.pts.map(p => ({ x: p.x / k, y: p.y / k })), mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    const longFirst = Math.hypot(P[0].x - P[1].x, P[0].y - P[1].y) >= Math.hypot(P[1].x - P[2].x, P[1].y - P[2].y);
    const a = longFirst ? mid(P[1], P[2]) : mid(P[0], P[1]), b = longFirst ? mid(P[3], P[0]) : mid(P[2], P[3]);
    return { ref: best.ref, a, b, quad: P, ratio: best.ratio, alt: best.alt };
  }
  async function mAutoRef(automatic) {
    const img = $("m-img"); if (!img.naturalWidth || ms.camera) return;
    const btn = $("m-detect"); btn.disabled = true;
    ms.autoMsg = "🔍 Looking for a bill, card, can or ruler…" + (window.cv && window.cv.Mat ? "" : " (the first time this downloads a ~10 MB helper)"); ms.quad = null; mDraw();
    try {
      const cv = (await loadCv()).cv;
      const cvs = document.createElement("canvas"); cvs.width = img.naturalWidth; cvs.height = img.naturalHeight;
      cvs.getContext("2d").drawImage(img, 0, 0);
      const r = detectReference(cv, cvs);
      if (!r) { ms.autoMsg = "Couldn't spot a bill, card, can or ruler — drag the blue dots onto its two ends yourself. (Lay it flat or upright, on a plain background, fully in the picture.)"; ms.quad = null; }
      else {
        ms.ref = r.ref; mBuildRefs(); ms.pts[2] = r.a; ms.pts[3] = r.b; ms.sel = 2; ms.quad = r.quad;
        const nm = { "6.14": "dollar bill", "3.37": "card", "4.83": "can", ruler: "ruler / measuring sticker" }[r.ref];
        ms.autoMsg = r.ref === "ruler"
          ? "✅ Found a ruler or measuring sticker. Slide the blue dots to the 0 mark and to a number you can read (like 12), type that number below, then put the yellow dots on the fish's nose and tail."
          : `✅ Found a ${nm} — the blue dots are on its two ends.` + (r.alt ? ` (Could also be a ${r.alt} — tap the right one above if not.)` : "") + (r.ref === "4.83" ? " Stand it upright next to the fish, 12 oz size." : "") + " Check they sit right (drag to fix), then put the yellow dots on the fish's nose and tail.";
        if (r.ref === "ruler" && !$("m-ref-in").value) $("m-ref-in").value = "12";
        try { localStorage.setItem("fm-auto-ref", "1"); } catch (e) { /* fine */ }
      }
    } catch (e) { ms.autoMsg = "Couldn't run the finder (it needs internet the first time) — drag the blue dots onto the bill/card yourself."; ms.quad = null; }
    btn.disabled = false; btn.textContent = "🔍 Look again"; mDraw();
  }
  $("m-detect").addEventListener("click", () => mAutoRef(false));
  const mDist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function mOri(e) {
    if (e.beta == null || e.gamma == null) return;
    const r = Math.PI / 180;
    ms.tilt = Math.acos(Math.min(1, Math.max(-1, Math.cos(e.beta * r) * Math.cos(e.gamma * r)))) / r;   // 0° = lying flat
    mLevel(); qcLevel();
  }
  function mTiltStart() {
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && DeviceOrientationEvent.requestPermission) {
        DeviceOrientationEvent.requestPermission().then(r => { if (r === "granted") window.addEventListener("deviceorientation", mOri); }).catch(() => {});
      } else window.addEventListener("deviceorientation", mOri);
    } catch (e) { /* no tilt sensor */ }
  }
  function mLevel() {
    const L = $("m-level"); if (!ms.camera || $("m-video").hidden) return;
    L.hidden = false;
    if (ms.tilt == null) { L.className = ""; L.textContent = "Hold the phone flat above the fish"; return; }
    const t = Math.round(ms.tilt);
    L.className = t <= 7 ? "ok" : "bad";
    L.textContent = t <= 7 ? "✓ Level" : `Tilted ${t}° — hold it flat above the fish`;
  }
  // Quick catch camera: same level badge + reticle, and after the shot the 4-dot editor opens by itself
  function qcLevel() {
    const L = $("qc-level"); if (!qc.measure) { L.hidden = true; return; }
    L.hidden = false;
    if (ms.tilt == null) { L.className = "qc-pill"; L.textContent = "Hold the phone flat"; return; }
    const t = Math.round(ms.tilt);
    L.className = "qc-pill " + (t <= 7 ? "ok" : "bad");
    L.textContent = t <= 7 ? "✓ Level" : `Tilted ${t}° — hold it flat`;
  }
  function qcMeasureSet(on) {
    qc.measure = !!on;
    $("qc-mtoggle").classList.toggle("on", qc.measure);
    $("qc-mtoggle").textContent = qc.measure ? "📏 Measure: on" : "📏 Measure: off";
    $("qc-mhint").hidden = !qc.measure; $("qc-reticle").hidden = !qc.measure;
    qcLevel();
  }
  function qcSetMarked(blob) {            // "keep the lines on the photo": the marked picture replaces the quick-catch photo
    qc.blob = blob;
    try { if ($("qc-shot").src) URL.revokeObjectURL($("qc-shot").src); } catch (e) { /* fine */ }
    $("qc-shot").src = URL.createObjectURL(blob); $("qc-shot").hidden = false;
  }
  function qcAutoMeasure(fromGallery) {
    if (!qc.measure || !qc.blob) return;
    const t = fromGallery ? null : ms.tilt;
    openMeasure(qc.blob, len => { $("qc-length").value = len; updateQcSize(); }, { tilt: t, onMarked: qcSetMarked });
  }
  $("qc-mtoggle").addEventListener("click", () => {
    qcMeasureSet(!qc.measure);
    if (qc.measure) mTiltStart(); else { try { window.removeEventListener("deviceorientation", mOri); } catch (e) { /* ok */ } }
  });
  function mStopCamera() {
    if (ms.stream) { ms.stream.getTracks().forEach(t => t.stop()); ms.stream = null; }
    $("m-video").srcObject = null;
    try { window.removeEventListener("deviceorientation", mOri); } catch (e) { /* ok */ }
  }
  async function mStartCamera() {
    ms.camera = true;
    $("m-live").hidden = false; $("m-edit").hidden = true; $("m-retake").hidden = true; $("m-zoom").hidden = true; mZoomReset();
    $("m-img").hidden = true; $("m-svg").innerHTML = ""; $("m-readout").textContent = "—";
    $("m-help").textContent = "Lay a dollar bill or card flat next to the fish, hold the phone flat above both, and tap the red button.";
    const v = $("m-video");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $("m-help").textContent = "This phone won't open the camera here — tap “Choose a photo instead”."; $("m-shot").disabled = true; return; }
    try {
      ms.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false });
      v.srcObject = ms.stream; v.hidden = false; $("m-reticle").hidden = false; $("m-shot").disabled = false;
      try { await v.play(); } catch (e) { /* autoplay does it */ }
      mLevel();
    } catch (e) {
      $("m-help").textContent = "Couldn't open the camera (allow Camera for this site in your phone's settings) — tap “Choose a photo instead”.";
      $("m-shot").disabled = true;
    }
  }
  function openMeasure(src, onUse, opts) {
    opts = opts || {};
    ms.pts = []; ms.sel = 0; mZoomReset(); $("m-keep").checked = false; ms.onUse = onUse; $("m-keep-row").hidden = !opts.onMarked; ms.onPhoto = opts.onPhoto || null; ms.onMarked = opts.onMarked || null; ms.shotTilt = opts.tilt != null ? opts.tilt : null; ms.tilt = null;
    if (ms.url) { URL.revokeObjectURL(ms.url); ms.url = null; }
    let last = null; try { last = localStorage.getItem("fm-measure-ref"); } catch (e) { /* none */ }
    if (last) { const [r, i] = last.split("|"); if (M_REFS.some(x => x[0] === r)) ms.ref = r; ms.refIn = i || ""; }
    $("m-ref-in").value = ms.refIn;
    mBuildRefs();
    $("measure").hidden = false;
    if (opts.camera) { mTiltStart(); mStartCamera(); } else mShowPhoto(src, false);
  }
  function mBuildRefs() {
    const box = $("m-refs"); box.innerHTML = "";
    M_REFS.forEach(([v, label]) => {
      const b = el("button", "m-ref" + (ms.ref === v ? " on" : ""), label); b.type = "button"; b.dataset.v = v;
      b.addEventListener("click", () => { ms.ref = v; mBuildRefs(); mDraw(); });
      box.appendChild(b);
    });
    $("m-ref-in").hidden = !mNeedsIn();
  }
  // Show a still picture (a photo, or a frame frozen from the camera) with the four dots ready to drag
  function mShowPhoto(src, fromCamera) {
    ms.camera = false;
    $("m-video").hidden = true; $("m-reticle").hidden = true; $("m-level").hidden = true;
    $("m-live").hidden = true; $("m-edit").hidden = false; $("m-retake").hidden = !fromCamera; $("m-zoom").hidden = false; mZoomReset();
    const img = $("m-img"); img.hidden = false;
    img.onload = () => mPlace();
    if (src instanceof Blob) { ms.url = URL.createObjectURL(src); img.src = ms.url; } else img.src = src;
    if (img.complete && img.naturalWidth) mPlace(); else mDraw();
  }
  function mPlace() {
    const img = $("m-img"), W = img.naturalWidth || 1000, H = img.naturalHeight || 750;
    ms.W = W; ms.H = H;
    ms.pts = [{ x: W * .2, y: H * .4 }, { x: W * .8, y: H * .4 }, { x: W * .3, y: H * .75 }, { x: W * .55, y: H * .75 }];
    ms.autoMsg = ""; ms.quad = null; $("m-detect").textContent = "🔍 Find the bill / card / can / ruler for me";
    mDraw();
    let auto = false; try { auto = localStorage.getItem("fm-auto-ref") === "1"; } catch (e) { /* no */ }
    if (auto) mAutoRef(true);
  }
  function closeMeasure() { mStopCamera(); $("m-loupe").hidden = true; $("m-zoom").hidden = true; $("measure").hidden = true; }
  function refInches() { return mNeedsIn() ? parseFloat($("m-ref-in").value) : parseFloat(ms.ref); }
  function measuredLength() {
    if (ms.pts.length < 4) return null;
    const ref = refInches(), refPx = mDist(ms.pts[2], ms.pts[3]);
    if (!(ref > 0) || refPx < 3) return null;
    return mDist(ms.pts[0], ms.pts[1]) / refPx * ref;
  }
  function mDraw() {
    const img = $("m-img"), svg = $("m-svg");
    const W = ms.W || img.naturalWidth || 1000, H = ms.H || img.naturalHeight || 750, r = Math.max(W, H) / 90 / ms.z;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const P = ms.pts, len = measuredLength(), q = len ? Math.round(len * 4) / 4 : null;
    $("m-readout").textContent = q ? `${q}″` : "—";
    $("m-use").disabled = !q || q > 199;
    let out = "";
    if (P.length === 4) {
      const line = (a, b, col) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${col}" stroke-width="${r / 2.2}"/>`;
      const dot = (p, col, i) => `<circle cx="${p.x}" cy="${p.y}" r="${r * 1.7}" fill="${col}" fill-opacity="${i === ms.sel ? ".5" : ".25"}" stroke="#fff" stroke-width="${i === ms.sel ? r / 1.6 : r / 3.5}"/><circle data-i="${i}" cx="${p.x}" cy="${p.y}" r="${r / 3}" fill="#fff"/>`;
      const label = (a, b, text, col) => {
        const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2 - r * 2.4, fs = r * 2.3, w = text.length * fs * .62 + fs;
        return `<rect x="${x - w / 2}" y="${y - fs * .85}" width="${w}" height="${fs * 1.4}" rx="${fs * .4}" fill="#000" fill-opacity=".72"/><text x="${x}" y="${y + fs * .22}" font-size="${fs}" font-weight="700" fill="${col}" text-anchor="middle" font-family="-apple-system,Arial,sans-serif">${text}</text>`;
      };
      if (ms.quad) out += `<polygon points="${ms.quad.map(q => q.x + "," + q.y).join(" ")}" fill="none" stroke="#3ddc84" stroke-width="${r / 2.5}" stroke-dasharray="${r} ${r / 1.5}"/>`;
      out += line(P[0], P[1], "#ffd400") + line(P[2], P[3], "#2c9bff");
      out += label(P[0], P[1], q ? `${q}″` : "?", "#ffd400");
      const ri = refInches(); out += label(P[2], P[3], ri > 0 ? `${+ri.toFixed(2)}″ ref` : "ref?", "#6cc0ff");
      P.forEach((p, i) => { out += dot(p, i < 2 ? "#ffd400" : "#2c9bff", i); });
    }
    svg.innerHTML = out;
    $("m-sel").textContent = P.length === 4 ? `Fine-tune the ${ms.sel < 2 ? "🟡 " + (ms.sel === 0 ? "nose" : "tail") : "🔵 reference " + (ms.sel === 2 ? "start" : "end")} dot:` : "Fine-tune:";
    const note = $("m-note");
    if (ms.autoMsg) { note.className = ms.autoMsg.startsWith("✅") ? "" : "warn"; note.textContent = ms.autoMsg; }
    else if (ms.shotTilt != null && ms.shotTilt > 10) { note.className = "warn"; note.textContent = `⚠️ The phone was tilted ${Math.round(ms.shotTilt)}° — the length can be off. Retake it flat above the fish for best accuracy.`; }
    else { note.className = ""; note.textContent = mNeedsIn() && !(refInches() > 0) ? "Type the inches between the two blue dots above." : "Most accurate when the reference lies flat right beside the fish and the picture is taken from straight above (within about an inch)."; }
  }
  function mPoint(e) {
    const img = $("m-img"), b = img.getBoundingClientRect();
    return { x: (e.clientX - b.left) / b.width * (ms.W || b.width), y: (e.clientY - b.top) / b.height * (ms.H || b.height), sx: e.clientX, sy: e.clientY };
  }
  function mLoupe(p) {
    const cv = $("m-loupe"), img = $("m-img");
    if (p == null) { cv.hidden = true; return; }
    const c = cv.getContext && cv.getContext("2d"); if (!c) return;
    const S = Math.max(ms.W, ms.H) / 14;
    cv.hidden = false;
    const stage = $("m-stage").getBoundingClientRect();
    cv.style.left = (p.sx - stage.left > stage.width / 2 ? 10 : stage.width - 130) + "px";
    try { c.drawImage(img, p.x - S / 2, p.y - S / 2, S, S, 0, 0, 240, 240); } catch (e) { /* not ready */ }
    c.strokeStyle = "#fff"; c.lineWidth = 2; c.beginPath(); c.moveTo(120, 100); c.lineTo(120, 140); c.moveTo(100, 120); c.lineTo(140, 120); c.stroke();
  }
  // Zoom / pan (pinch with two fingers, or the ＋ － buttons) — dots keep their on-screen size
  const mClamp = (v, a, b) => Math.min(b, Math.max(a, v));
  function mApplyZoom() {
    const bw = $("m-img").offsetWidth || 500, bh = $("m-img").offsetHeight || 375, lx = (ms.z - 1) * bw / 2, ly = (ms.z - 1) * bh / 2;
    ms.tx = mClamp(ms.tx, -lx, lx); ms.ty = mClamp(ms.ty, -ly, ly);
    $("m-wrap").style.transform = ms.z === 1 && !ms.tx && !ms.ty ? "" : `translate(${ms.tx}px, ${ms.ty}px) scale(${ms.z})`;
    mDraw();
  }
  function mZoomReset() { ms.z = 1; ms.tx = 0; ms.ty = 0; ms.pan = null; ms.pinch = null; ms.ptrs.clear(); mApplyZoom(); }
  function mZoomBy(f) { const z = mClamp(ms.z * f, 1, 8), k = z / ms.z; ms.tx *= k; ms.ty *= k; ms.z = z; mApplyZoom(); }
  $("m-zin").addEventListener("click", () => mZoomBy(1.6));
  $("m-zout").addEventListener("click", () => mZoomBy(1 / 1.6));
  $("m-zreset").addEventListener("click", mZoomReset);
  const mMid = () => { const v = [...ms.ptrs.values()]; return { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2, d: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) }; };
  $("m-svg").addEventListener("pointerdown", e => {
    if (ms.camera || ms.pts.length < 4) return;
    e.preventDefault();
    ms.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ms.ptrs.size === 2) {                                   // second finger: pinch instead of dragging a dot
      ms.drag = -1; ms.pan = null; mLoupe(null);
      const m = mMid(); ms.pinch = { d0: Math.max(1, m.d), z0: ms.z, x0: m.x, y0: m.y, tx0: ms.tx, ty0: ms.ty };
      return;
    }
    const p = mPoint(e), b = $("m-img").getBoundingClientRect(), scale = (ms.W || 1) / b.width;
    const near = ms.pts.map((q, i) => ({ i, d: mDist(p, q) })).sort((a, b2) => a.d - b2.d)[0];
    if (near && near.d < 56 * scale) {
      ms.drag = near.i; ms.sel = near.i; $("m-svg").setPointerCapture && $("m-svg").setPointerCapture(e.pointerId);
      mLoupe(ms.pts[near.i] && Object.assign({}, ms.pts[near.i], { sx: p.sx, sy: p.sy })); mDraw();
    } else if (ms.z > 1) ms.pan = { x: e.clientX, y: e.clientY, tx: ms.tx, ty: ms.ty };
  });
  $("m-svg").addEventListener("pointermove", e => {
    if (ms.ptrs.has(e.pointerId)) ms.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ms.pinch && ms.ptrs.size >= 2) {
      const m = mMid(), z = mClamp(ms.pinch.z0 * m.d / ms.pinch.d0, 1, 8), k = z / ms.pinch.z0;
      ms.z = z; ms.tx = ms.pinch.tx0 * k + (m.x - ms.pinch.x0); ms.ty = ms.pinch.ty0 * k + (m.y - ms.pinch.y0); mApplyZoom();
      return;
    }
    if (ms.pan) { ms.tx = ms.pan.tx + (e.clientX - ms.pan.x); ms.ty = ms.pan.ty + (e.clientY - ms.pan.y); mApplyZoom(); return; }
    if (ms.drag < 0) return;
    const p = mPoint(e); ms.pts[ms.drag] = { x: Math.min(ms.W, Math.max(0, p.x)), y: Math.min(ms.H, Math.max(0, p.y)) };
    mDraw(); mLoupe(Object.assign({}, ms.pts[ms.drag], { sx: p.sx, sy: p.sy }));
  });
  ["pointerup", "pointercancel"].forEach(t => $("m-svg").addEventListener(t, e => {
    ms.ptrs.delete(e.pointerId);
    if (ms.ptrs.size < 2) ms.pinch = null;
    if (!ms.ptrs.size) { ms.drag = -1; ms.pan = null; mLoupe(null); }
  }));
  // Nudge the selected dot by one on-screen pixel (finer when zoomed in)
  function mNudge(dx, dy) {
    if (ms.pts.length < 4) return;
    const rw = $("m-img").getBoundingClientRect().width || 500, step = (ms.W || rw) / rw, p = ms.pts[ms.sel];
    ms.pts[ms.sel] = { x: mClamp(p.x + dx * step, 0, ms.W), y: mClamp(p.y + dy * step, 0, ms.H) };
    mDraw();
  }
  $("m-nl").addEventListener("click", () => mNudge(-1, 0)); $("m-nr").addEventListener("click", () => mNudge(1, 0));
  $("m-nu").addEventListener("click", () => mNudge(0, -1)); $("m-nd").addEventListener("click", () => mNudge(0, 1));
  // The photo with the lines and size drawn on it
  function mMarkedBlob() {
    return new Promise(res => {
      try {
        const img = $("m-img"), W = ms.W, H = ms.H, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
        const c = cv.getContext("2d"); c.drawImage(img, 0, 0, W, H);
        const r = Math.max(W, H) / 90, P = ms.pts, q = Math.round(measuredLength() * 4) / 4, ri = refInches();
        const line = (a, b, col) => { c.strokeStyle = col; c.lineWidth = r / 2.2; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); };
        const dot = (p, col) => { c.globalAlpha = .35; c.fillStyle = col; c.beginPath(); c.arc(p.x, p.y, r * 1.7, 0, 6.2832); c.fill(); c.globalAlpha = 1; c.strokeStyle = "#fff"; c.lineWidth = r / 3.5; c.stroke(); c.fillStyle = "#fff"; c.beginPath(); c.arc(p.x, p.y, r / 3, 0, 6.2832); c.fill(); };
        const label = (a, b, text, col) => { const fs = r * 2.3; c.font = `700 ${fs}px sans-serif`; const w = c.measureText(text).width + fs, x = (a.x + b.x) / 2, y = (a.y + b.y) / 2 - r * 2.4;
          c.fillStyle = "rgba(0,0,0,.72)"; c.fillRect(x - w / 2, y - fs * .85, w, fs * 1.4); c.fillStyle = col; c.textAlign = "center"; c.fillText(text, x, y + fs * .22); };
        line(P[0], P[1], "#ffd400"); line(P[2], P[3], "#2c9bff");
        label(P[0], P[1], q ? `${q}″` : "?", "#ffd400"); label(P[2], P[3], ri > 0 ? `${+ri.toFixed(2)}″ ref` : "ref", "#6cc0ff");
        P.forEach((p, i) => dot(p, i < 2 ? "#ffd400" : "#2c9bff"));
        cv.toBlob(b => res(b), "image/jpeg", 0.9);
      } catch (e) { res(null); }
    });
  }
  // Freeze the live picture
  $("m-shot").addEventListener("click", () => {
    const v = $("m-video"); if (!v.videoWidth) return;
    const k = Math.min(1, 1600 / Math.max(v.videoWidth, v.videoHeight)), cv = document.createElement("canvas");
    cv.width = Math.round(v.videoWidth * k); cv.height = Math.round(v.videoHeight * k);
    cv.getContext("2d").drawImage(v, 0, 0, cv.width, cv.height);
    ms.shotTilt = ms.tilt;
    cv.toBlob(blob => {
      if (!blob) { $("m-help").textContent = "Couldn't capture the picture — try again."; return; }
      mStopCamera();
      keepAppPhoto(blob);
      mShowPhoto(blob, true);
      if (ms.onPhoto) { try { ms.onPhoto(blob); } catch (e) { /* optional */ } }
    }, "image/jpeg", 0.9);
  });
  $("m-retake").addEventListener("click", () => { ms.pts = []; ms.shotTilt = null; mTiltStart(); mStartCamera(); });
  $("m-pick").addEventListener("click", () => $("m-file").click());
  $("m-file").addEventListener("change", () => {
    const f = $("m-file").files && $("m-file").files[0]; $("m-file").value = "";
    if (!f) return;
    mStopCamera(); ms.shotTilt = null; mShowPhoto(f, false);
    if (ms.onPhoto) { try { ms.onPhoto(f); } catch (e) { /* optional */ } }
  });
  $("m-cancel").addEventListener("click", closeMeasure);
  $("m-ref-in").addEventListener("input", () => { ms.refIn = $("m-ref-in").value; mDraw(); });
  $("m-use").addEventListener("click", async () => {
    const len = measuredLength();
    if (!len) return;
    const marked = $("m-keep").checked && ms.onMarked ? await mMarkedBlob() : null;
    try { localStorage.setItem("fm-measure-ref", ms.ref + "|" + $("m-ref-in").value); } catch (e) { /* fine */ }
    closeMeasure();
    if (ms.onUse) ms.onUse(Math.round(len * 4) / 4);
    if (marked && ms.onMarked) { try { ms.onMarked(marked); } catch (e) { /* optional */ } }
  });

  function catchFormPhoto() {
    const f = catchForm.querySelector("#c-photo").files;
    if (f && f[0]) return f[0];
    if (editingCatch) {
      const ph = (photosBySpot[editingCatch.spot_id] || []).find(p => p.catch_id === editingCatch.id);
      if (ph && photoUrls[ph.path]) return photoUrls[ph.path];
    }
    return null;
  }
  catchForm.querySelector("#c-identify").addEventListener("click", () => {
    const q = id => catchForm.querySelector(id);
    const src = catchFormPhoto();
    if (!src) { q("#c-id-msg").textContent = "📷 Choose the catch photo first (above), then tap 🔍 again."; return; }
    const sp = (spots || []).find(x => x.id === openCatchSpot);
    identifyFish(src, sp && sp.water_type, q("#c-id-msg"), q("#c-id-sugg"), name => {
      q("#c-species").value = name; updateSizeNote();
      idNext(q("#c-id-sugg"), parseFloat(q("#c-length").value) > 0, () => q("#c-measure").click());   // identify → measure → keeper verdict
    });
  });
  catchForm.querySelector("#c-measure").addEventListener("click", () => {
    const q = id => catchForm.querySelector(id);
    const file = q("#c-photo").files && q("#c-photo").files[0];
    let src = file || null;
    if (!src && editingCatch) {
      const ph = (photosBySpot[editingCatch.spot_id] || []).find(p => p.catch_id === editingCatch.id);
      if (ph && photoUrls[ph.path]) src = photoUrls[ph.path];
    }
    // With a photo: measure it. Without: open the live camera, and the frozen picture becomes the catch photo.
    const setPhoto = blob => {
      try {
        const f = new File([blob], "measure-" + Date.now() + ".jpg", { type: blob.type || "image/jpeg" }), dt = new DataTransfer();
        dt.items.add(f); q("#c-photo").files = dt.files; q("#c-photo").dispatchEvent(new Event("change", { bubbles: true }));
      } catch (e) { /* the length still works without attaching */ }
    };
    openMeasure(src, len => { q("#c-length").value = len; updateSizeNote(); }, src ? { onMarked: setPhoto } : { camera: true, onPhoto: setPhoto, onMarked: setPhoto });
  });

  // ---- 🔍 Fish ID: one photo → Google Gemini (free tier) via our Supabase function → up to 3 suggestions ----
  const ID_NOTE = "Sends just this photo (no location) to Google's Gemini AI — free, but Google may use it to improve its products. It's a suggestion: check it.";
  async function photoB64(src) {
    const blob = typeof src === "string" ? await (await fetch(src)).blob() : src;
    let img;
    try { img = await createImageBitmap(blob, { imageOrientation: "from-image" }); }
    catch (e) { img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(blob); }); }
    const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85).split(",")[1]; // a fresh picture: no hidden photo details travel with it
  }
  // After a species is picked from the ID suggestions: if there's no length yet, offer the next step (measure → the keeper check shows itself)
  function idNext(suggEl, haveLen, go) {
    const old = suggEl.querySelector(".id-next"); if (old) old.remove();
    if (haveLen) return;
    const b = el("button", "btn small id-next", "📏 Next: measure it for the keeper check"); b.type = "button"; b.style.marginTop = "8px";
    b.addEventListener("click", go); suggEl.appendChild(b);
  }
  async function identifyFish(src, water, msgEl, suggEl, onPick) {
    suggEl.innerHTML = "";
    if (!navigator.onLine) { msgEl.textContent = "Fish ID needs a signal — you can identify it later with Edit."; return; }
    msgEl.textContent = "🔍 Looking at the photo… " + ID_NOTE;
    try {
      const image = await photoB64(src);
      const { data, error } = await db.functions.invoke("identify-fish", { body: { image, water } });
      let out = data;
      if (error) {
        try { out = error.context && typeof error.context.json === "function" ? await error.context.json() : null; } catch (e) { out = null; }
        throw new Error(((out && out.error) || error.message || "Fish ID didn't answer") + (out && out.detail ? ` (details: ${out.detail})` : ""));
      }
      if (!out || !out.fish_visible || !(out.suggestions || []).length) { msgEl.textContent = "Couldn't spot a fish clearly in this photo — try one with the whole fish showing."; return; }
      msgEl.textContent = "Tap the right one (or type your own):";
      out.suggestions.forEach(sg => {
        const b = document.createElement("button"); b.type = "button";
        b.append(sg.name + " ");
        const sm = document.createElement("small"); sm.textContent = `· ${sg.confidence}`; b.appendChild(sm);
        if (sg.clue) b.title = sg.clue;
        b.addEventListener("click", () => {
          suggEl.querySelectorAll("button").forEach(x => x.classList.remove("on")); b.classList.add("on");
          onPick(sg.name);
          msgEl.textContent = sg.clue ? `✓ ${sg.name} — ${sg.clue}` : `✓ ${sg.name}`;
        });
        suggEl.appendChild(b);
      });
      if (out.suggestions[0] && out.suggestions[0].clue) msgEl.textContent += ` Best guess because: ${out.suggestions[0].clue}.`;
    } catch (e) {
      msgEl.textContent = "Fish ID: " + (e.message || e);
    }
  }
  $("qc-identify").addEventListener("click", () => {
    const sp = (spots || []).find(x => x.id === $("qc-spot").value);
    identifyFish(qc.blob, sp && sp.water_type, $("qc-id-msg"), $("qc-id-sugg"), name => {
      const chips = $("qc-species").querySelectorAll(".fchip");
      chips.forEach(x => x.classList.remove("on"));
      const match = [...chips].find(x => x.textContent.toLowerCase() === name.toLowerCase());
      if (match) { match.classList.add("on"); $("qc-species-other").value = ""; } else $("qc-species-other").value = name;
      updateQcSize();
      idNext($("qc-id-sugg"), parseFloat($("qc-length").value) > 0, () => $("qc-measure").click());   // identify → measure → keeper verdict
    });
  });

  let editingCatch = null;   // the catch being edited, or null when logging a new one

  function openCatchForm(spotId, existing) {
    const q = id => catchForm.querySelector(id);
    openCatchSpot = spotId;
    editingCatch = existing || null;
    catchForm.reset();
    catchForm.photoInfo = null;
    catchForm.querySelector("#c-photo-info").textContent = "";
    catchForm.extraPhotos = []; showExtraPhotos();
    catchForm.querySelector("#c-size-note").textContent = "";
    catchForm.querySelector("#c-id-msg").textContent = ""; catchForm.querySelector("#c-id-sugg").innerHTML = "";
    tideTouched = false;
    q("#c-msg").textContent = "";
    q("#c-title").textContent = existing ? "Edit catch" : "Log a catch";
    q("#c-save").textContent = existing ? "Save changes" : "Save catch";
    if (existing) {
      // Fill in what was saved; keep its conditions unless the time is changed
      q("#c-species").value = existing.species || "";
      q("#c-count").value = existing.how_many || 1;
      q("#c-bait").value = existing.bait || "";
      q("#c-when").value = localInputValue(new Date(existing.caught_at));
      q("#c-tide").value = existing.tide_stage || "";
      q("#c-by").value = existing.caught_by || "";
      q("#c-notes").value = existing.notes || "";
      q("#c-vis").value = existing.visibility || "friends";
      q("#c-length").value = existing.length_in != null ? +Number(existing.length_in).toFixed(2) : "";
      q("#c-weight").value = existing.weight_lb != null && !existing.weight_est ? +Number(existing.weight_lb).toFixed(2) : "";
      updateSizeNote();
      condRequest++;
      catchCond = {
        tideStage: existing.tide_stage, pressure: existing.pressure_inhg != null ? Number(existing.pressure_inhg) : null,
        trend: existing.pressure_trend, windDir: existing.wind_dir, windMph: existing.wind_mph, tempF: existing.air_temp_f,
        waterF: existing.water_temp_f != null ? Number(existing.water_temp_f) : null, waterSource: existing.water_temp_source,
        moon: existing.moon_phase ? { phase: existing.moon_phase, illum: existing.moon_illum, emoji: MOON_EMOJI[existing.moon_phase] } : null,
        solunar: existing.solunar, source: existing.conditions_source
      };
      condPromise = Promise.resolve();
      q("#c-cond").textContent = condSummary(catchCond) + " — change the time to reload conditions.";
      renderSpots();
    } else {
      q("#c-when").value = localInputValue(new Date());
      const sp = (spots || []).find(x => x.id === spotId);
      q("#c-tide").value = sp && sp.water_type === "freshwater" ? "" : (cond.tideStage || "");
      q("#c-by").value = (me && me.name) || "";
      q("#c-vis").value = (sp && sp.visibility) || (sp && sp.is_private ? "private" : "friends"); // starts at the spot's level
      renderSpots();
      lookupCatchConditions();
    }
    q("#c-species").focus();
  }
  function closeCatchForm() { openCatchSpot = null; editingCatch = null; renderSpots(); }
  catchForm.querySelector("#c-cancel").addEventListener("click", closeCatchForm);

  // A deleted catch takes its photos with it: the rows and the stored files go (the database already hides them from everyone else the moment the catch is deleted)
  async function purgePhotosOfCatches(ids) {
    try {
      if (!db || !me || !ids.length) return;
      const { data } = await db.from("photos").select("id,path,catch_id").in("catch_id", ids).eq("created_by", me.id);
      const rows = data || [];
      if (!rows.length) return;
      await db.storage.from("photos").remove(rows.map(r => r.path));
      for (const r of rows) { await db.from("photos").delete().eq("id", r.id); delete photoUrls[r.path]; }
      await loadPhotos();
    } catch (e) { /* the sweep at next start-up tries again */ }
  }
  // At start-up: clear photos still left from catches deleted earlier (e.g. the app was closed during the Undo window)
  let photoSweepDone = false;
  async function sweepDeletedCatchPhotos() {
    if (photoSweepDone || !db || !me) return; photoSweepDone = true;
    try {
      const cutoff = new Date(Date.now() - 2 * 60000).toISOString();
      const { data } = await db.from("catches").select("id").eq("created_by", me.id).lt("deleted_at", cutoff).limit(200);
      await purgePhotosOfCatches((data || []).map(r => r.id));
    } catch (e) { /* try again next time */ }
  }
  async function deleteCatch(c) {
    const label = `${c.how_many > 1 ? c.how_many + " " : ""}${c.species}`;
    try {
      // Soft delete: hidden from the app; the "Undo" button (8 seconds) brings it straight back
      const { error } = await db.from("catches").update({ deleted_at: new Date().toISOString() }).eq("id", c.id);
      if (error) throw error;
      await loadCatches();
      // its photos disappear from view now; they're removed for good when the Undo window passes
      photosBySpot[c.spot_id] = (photosBySpot[c.spot_id] || []).filter(p => p.catch_id !== c.id); renderSpots();
      let undone = false;
      setTimeout(() => { if (!undone) purgePhotosOfCatches([c.id]); }, 9000);
      undoToast(`Deleted ${label}.`, async () => {
        undone = true;
        const { error: e2 } = await db.from("catches").update({ deleted_at: null }).eq("id", c.id);
        if (e2) { undone = false; toast("Couldn't undo — " + (e2.message || e2), 5000); return; }
        await loadCatches(); loadPhotos(); toast("✓ Catch restored");
      });
    } catch (err) {
      alert("Couldn't delete: " + (err.message || err));
    }
  }

  catchForm.addEventListener("submit", async e => {
    e.preventDefault();
    const q = id => catchForm.querySelector(id);
    const msg = q("#c-msg");
    msg.className = "msg"; msg.textContent = "Saving…";
    q("#c-save").disabled = true;
    const txt = id => { const v = q(id).value.trim(); return v === "" ? null : v; };
    const when = catchWhen();
    if (when - Date.now() > 15 * 60000) {
      msg.className = "msg err"; msg.textContent = "That time is in the future — pick when you caught it.";
      q("#c-save").disabled = false;
      return;
    }
    try { await condPromise; } catch (e3) {}
    const c = catchCond || {};
    const row = {
      spot_id: openCatchSpot,
      caught_at: when.toISOString(),
      species: txt("#c-species"),
      how_many: Math.max(1, Math.min(500, parseInt(q("#c-count").value, 10) || 1)),
      bait: txt("#c-bait"),
      tide_stage: q("#c-tide").value || null,
      notes: txt("#c-notes"),
      visibility: q("#c-vis").value,
      caught_by: txt("#c-by"),
      pressure_inhg: c.pressure != null ? c.pressure : null,
      pressure_trend: c.trend || null,
      wind_dir: c.windDir || null,
      wind_mph: c.windMph != null ? c.windMph : null,
      air_temp_f: c.tempF != null ? c.tempF : null,
      moon_phase: c.moon ? c.moon.phase : null,
      moon_illum: c.moon ? c.moon.illum : null,
      solunar: c.solunar || null,
      conditions_source: c.source || null,
      water_temp_f: c.waterF != null ? c.waterF : null,
      water_temp_source: c.waterSource || null,
      ...sizeFields(txt("#c-species"), q("#c-length").value, q("#c-weight").value)
    };
    const trip = activeSession();
    if (!editingCatch && trip && trip.spot_id === openCatchSpot && Math.abs(when - new Date()) < 3 * 3600000) { row.session_id = trip.id; await syncSessions(); }
    try {
      if (!db) throw new Error("Not connected to the database");
      const { data: savedRow, error } = editingCatch
        ? await db.from("catches").update(row).eq("id", editingCatch.id).select("id").single()
        : await db.from("catches").insert(row).select("id").single();
      if (error) throw error;
      if (!editingCatch) { const gp = await liveGeoIfNeeded(); await saveCatchGeo(savedRow.id, gp); }
      const photoFile = q("#c-photo").files && q("#c-photo").files[0];
      if (photoFile) {
        msg.textContent = "Uploading photo…";
        try { await uploadPhoto(photoFile, row.spot_id, savedRow.id, catchForm.photoInfo); }
        catch (pe) { alert("The catch was saved, but the photo didn't upload: " + (pe.message || pe)); }
      }
      const extras = (catchForm.extraPhotos || []).slice();
      if (extras.length) {
        let done = 0, bad = 0, next = 0;
        const worker = async () => {
          while (next < extras.length) {
            const f = extras[next++];
            msg.textContent = `Uploading photo ${Math.min(done + 2, extras.length + 1)} of ${extras.length + 1}…`;
            try { await uploadPhoto(f, row.spot_id, savedRow.id, null, true); } catch (pe) { bad++; }
            done++;
          }
        };
        await Promise.all([worker(), worker(), worker()]);
        await loadPhotos();
        if (bad) alert(`The catch was saved, but ${bad} of the extra photos didn't upload.`);
      }
      try { if (row.caught_by) localStorage.setItem("fm-name", row.caught_by); } catch (e2) {}
      expanded.add(openCatchSpot);
      openCatchSpot = null;
      editingCatch = null;
      await loadCatches();
    } catch (err) {
      msg.className = "msg err";
      msg.textContent = "Couldn't save: " + (err.message || err);
    } finally {
      q("#c-save").disabled = false;
    }
  });

  async function loadCatches() {
    try {
      const { data: rawCatches, error } = await db.from("catches").select("*").is("deleted_at", null).order("caught_at", { ascending: false }).limit(1000);
      if (error) throw error;
      const circle = await getCircle();
      const data = rawCatches.filter(c => inCircle(circle, c.created_by));
      catchesBySpot = {};
      data.forEach(c => (catchesBySpot[c.spot_id] = catchesBySpot[c.spot_id] || []).push(c));
      saveCopy("catches", data);
      renderInsights();
      renderBest();
      setTimeout(backfillWaterTemps, 3000);
    } catch (err) {
      const copy = isNetErr(err) && loadCopy("catches");
      catchesBySpot = {}; // the spots list still works without catches
      if (copy) copy.forEach(c => (catchesBySpot[c.spot_id] = catchesBySpot[c.spot_id] || []).push(c));
    }
    renderSpots();
    feedRefresh();
  }


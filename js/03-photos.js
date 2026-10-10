  // ---- Photos (private Supabase storage, shown through 1-hour signed links) ----
  let photosBySpot = {};   // spot id -> photos, newest first
  let photoUrls = {};      // storage path -> signed link

  async function loadPhotos() {
    try {
      const circle = await getCircle();
      let pq = db.from("photos").select("*");
      if (circle) pq = pq.in("created_by", [me.id, ...circle]);
      const { data, error } = await pq.order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      photosBySpot = {};
      data.forEach(p => (photosBySpot[p.spot_id] = photosBySpot[p.spot_id] || []).push(p));
      const need = data.map(p => p.path).filter(path => !photoUrls[path]);
      if (need.length) {
        const { data: links } = await db.storage.from("photos").createSignedUrls(need, 3600);
        (links || []).forEach(l => { if (l.signedUrl) photoUrls[l.path] = l.signedUrl; });
      }
    } catch (e) { /* the app works without photos */ }
    renderSpots();
    feedRefresh();
  }

  // Shrink a phone photo (often 4–8 MB) to ~300 KB before uploading
  async function compressImage(file) {
    const MAX = 1600;
    let src;
    try { src = await createImageBitmap(file, { imageOrientation: "from-image" }); }
    catch (e) {
      src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(file); });
    }
    const scale = Math.min(1, MAX / Math.max(src.width, src.height));
    const c = document.createElement("canvas");
    c.width = Math.round(src.width * scale); c.height = Math.round(src.height * scale);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error("Couldn't read that photo")), "image/jpeg", 0.8));
  }

  function newId() {
    return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
  }

  // When and where a photo was taken, from the details phones save inside the file.
  // The time is usually there; location is often removed by the phone when picked in a browser.
  async function photoInfo(file) {
    try {
      if (!window.exifr || !file) return {};
      const d = await exifr.parse(file, { gps: true }) || {};
      const when = d.DateTimeOriginal || d.CreateDate;
      const ok = n => typeof n === "number" && isFinite(n) && !(n === 0);
      return {
        when: when instanceof Date && !isNaN(when) ? when : null,
        lat: ok(d.latitude) ? +d.latitude.toFixed(5) : null,
        lng: ok(d.longitude) ? +d.longitude.toFixed(5) : null
      };
    } catch (e) { return {}; }
  }

  async function uploadPhoto(file, spotId, catchId, info, noReload) {
    info = info || await photoInfo(file);
    if (!me) throw new Error("Please sign in again");
    const blob = await compressImage(file);
    const path = `${me.id}/${newId()}.jpg`;
    const { error: upErr } = await db.storage.from("photos").upload(path, blob, { contentType: "image/jpeg" });
    if (upErr) throw upErr;
    const { error } = await db.from("photos").insert({
      spot_id: spotId, catch_id: catchId || null, path,
      taken_at: info.when ? info.when.toISOString() : null, lat: info.lat, lng: info.lng
    });
    if (error) { await db.storage.from("photos").remove([path]); throw error; }
    if (!noReload) await loadPhotos();
  }

  // ---- 📥 Keep a copy of photos taken inside the app (a web page can't write to the camera roll silently, so: Android downloads a copy,
  //      iPhone gets a one-tap "Save to Photos", and the last 14 days are also kept inside the app) ----
  const SAVEPIC_KEY = "fm-save-photos", STASH_KEEP = 40, STASH_DAYS = 14;
  const savePicOn = () => { try { return localStorage.getItem(SAVEPIC_KEY) !== "0"; } catch (e) { return true; } };
  const isApple = () => /iPhone|iPad|iPod/.test(navigator.userAgent || "") || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  function stashOpen() {
    return new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error("no indexedDB"));
      const rq = indexedDB.open("fm-stash", 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore("pics", { keyPath: "id" });
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
  }
  const idbDone = tx => new Promise((res, rej) => { tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error); });
  async function stashList() {
    try {
      const d = await stashOpen();
      const all = await new Promise((res, rej) => { const r = d.transaction("pics").objectStore("pics").getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      return all.sort((a, b) => b.at - a.at);
    } catch (e) { return []; }
  }
  async function stashAdd(blob) {
    try {
      const d = await stashOpen(), id = newId(), now = Date.now();
      const tx = d.transaction("pics", "readwrite"); tx.objectStore("pics").put({ id, at: now, blob, saved: false });
      await idbDone(tx);
      // keep it tidy: 14 days, newest 40
      const all = await stashList(); const drop = all.filter((r, i) => i >= STASH_KEEP || now - r.at > STASH_DAYS * 86400000);
      if (drop.length) { const t2 = d.transaction("pics", "readwrite"); drop.forEach(r => t2.objectStore("pics").delete(r.id)); await idbDone(t2); }
      return id;
    } catch (e) { return null; }
  }
  async function stashMarkSaved(id) {
    try {
      if (!id) return; const d = await stashOpen(), st = d.transaction("pics", "readwrite"), os = st.objectStore("pics");
      os.get(id).onsuccess = ev => { const r = ev.target.result; if (r) { r.saved = true; os.put(r); } };
      await idbDone(st);
    } catch (e) { /* fine */ }
  }
  const picName = at => { const d = new Date(at), p = n => String(n).padStart(2, "0"); return `fishing-map-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.jpg`; };
  // Save one photo to the phone. iPhone: the share sheet ("Save Image"); everything else: a normal download.
  async function savePicToPhone(blob, at, id) {
    const file = new File([blob], picName(at), { type: "image/jpeg" });
    try {
      if (isApple() && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); }
      else {
        const url = URL.createObjectURL(blob), a = document.createElement("a");
        a.href = url; a.download = file.name; a.hidden = true; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    } catch (e) { return false; } // closed the share sheet
    stashMarkSaved(id);
    return true;
  }
  // Called right after a photo is taken with the app's own camera
  async function keepAppPhoto(blob) {
    try {
      if (!blob) return;
      const at = Date.now(), id = await stashAdd(blob);
      if (!savePicOn()) return;
      if (isApple()) undoToast("📷 Photo taken.", () => savePicToPhone(blob, at, id), "💾 Save to Photos", 15000);
      else { await savePicToPhone(blob, at, id); toast("💾 Saved a copy to your phone", 2500); }
    } catch (e) { /* never get in the way of the camera */ }
  }
  async function renderPicStash() {
    const box = $("pic-stash"); box.innerHTML = "";
    const list = await stashList();
    if (!list.length) { box.appendChild(el("div", "spot-meta", "Nothing kept yet — photos you take with the app's camera show up here for 14 days.")); return; }
    list.forEach(r => {
      const row = el("div", "feed-item"); row.style.cssText = "display:flex;gap:10px;align-items:center";
      const im = document.createElement("img"); im.src = URL.createObjectURL(r.blob); im.alt = "Photo"; im.style.cssText = "width:64px;height:64px;object-fit:cover;border-radius:8px";
      row.appendChild(im);
      const mid = el("div"); mid.style.flex = "1";
      mid.appendChild(el("div", null, new Date(r.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })));
      mid.appendChild(el("div", "spot-meta", r.saved ? "💾 saved to your phone" : "not saved to your phone yet"));
      row.appendChild(mid);
      const b = el("button", "btn ghost small", isApple() ? "💾 Save to Photos" : "💾 Save"); b.type = "button";
      b.addEventListener("click", async () => { if (await savePicToPhone(r.blob, r.at, r.id)) renderPicStash(); });
      row.appendChild(b); box.appendChild(row);
    });
  }
  $("pic-stash-btn").addEventListener("click", () => { const box = $("pic-stash"); box.hidden = !box.hidden; if (!box.hidden) renderPicStash(); });
  $("save-pics").checked = savePicOn();
  $("save-pics").addEventListener("change", () => { try { localStorage.setItem(SAVEPIC_KEY, $("save-pics").checked ? "1" : "0"); } catch (e) { /* fine */ } });

  function thumbStrip(list) {
    const strip = el("div", "thumbs");
    list.forEach(ph => {
      if (!photoUrls[ph.path]) return;
      const img = document.createElement("img");
      img.src = photoUrls[ph.path]; img.alt = "Photo"; img.loading = "lazy";
      img.addEventListener("click", () => openViewer(ph));
      strip.appendChild(img);
    });
    return strip;
  }

  // The spot card has two photo places: 📷 photos OF the spot (catch_id empty, anyone can add) and 🎣 photos from catches logged here
  function photoGallery(title, list, empty, id) {
    const box = el("div"); box.style.marginTop = "6px"; if (id) box.dataset.gallery = id;
    const shown = list.filter(ph => photoUrls[ph.path]);
    box.appendChild(el("div", "spot-meta", `${title}${list.length ? " (" + list.length + ")" : ""}`));
    if (!shown.length) { box.appendChild(el("div", "spot-meta", empty)); return box; }
    const strip = thumbStrip(shown.slice(0, 12)); box.appendChild(strip);
    if (shown.length > 12) {
      const more = el("button", "linkbtn", `Show all ${shown.length}`); more.type = "button";
      more.addEventListener("click", () => { strip.replaceWith(thumbStrip(shown)); const st = box.querySelector(".thumbs"); st.style.flexWrap = "wrap"; more.remove(); });
      box.appendChild(more);
    }
    return box;
  }
  const PHOTO_BATCH_MAX = 30;
  function spotPhotoSection(s) {
    const wrap = el("div", "photo-row"); wrap.style.display = "block";
    const all = photosBySpot[s.id] || [];
    wrap.appendChild(photoGallery("📷 Photos of the spot", all.filter(p => !p.catch_id), "No photos of the spot yet — add one so friends know what it looks like.", "spot"));
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.multiple = true; input.hidden = true;
    const BTN = "📷 Add photos of the spot (up to 30 at once)";
    const btn = el("button", "btn ghost small", BTN); btn.type = "button"; btn.style.marginTop = "6px";
    btn.addEventListener("click", () => input.click());
    input.addEventListener("change", async () => {
      let files = Array.from(input.files || []);
      input.value = "";
      if (!files.length) return;
      if (files.length > PHOTO_BATCH_MAX) { toast(`Only the first ${PHOTO_BATCH_MAX} photos were added — pick the rest again afterwards.`, 4500); files = files.slice(0, PHOTO_BATCH_MAX); }
      btn.disabled = true;
      let done = 0, firstLoc = null; const failed = [];
      const show = () => { btn.textContent = `Uploading ${Math.min(done + 1, files.length)} of ${files.length}…`; };
      show();
      let next = 0;
      const worker = async () => {
        while (next < files.length) {
          const f = files[next++];
          try {
            const info = await photoInfo(f);
            await uploadPhoto(f, s.id, null, info, true);
            if (!firstLoc && info.lat != null) firstLoc = info;
          } catch (e) { failed.push(f.name || "a photo"); }
          done++; show();
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      await loadPhotos();   // one refresh at the end (this redraws the spot card)
      btn.disabled = false; btn.textContent = BTN;
      const ok = files.length - failed.length;
      if (failed.length) alert(`${ok} of ${files.length} photos were added. ${failed.length} didn't upload (${failed.slice(0, 3).join(", ")}${failed.length > 3 ? "…" : ""}). Pick them again to retry.`);
      else toast(`📷 ${ok} photo${ok === 1 ? "" : "s"} added`, 2500);
      if (firstLoc && !hasLoc(s) && isMine(s) &&
          confirm(`A photo has a location. Use it to place “${s.name}” on the map?`)) {
        const { error } = await db.from("spots").update({ lat: firstLoc.lat, lng: firstLoc.lng }).eq("id", s.id);
        if (error) alert("Couldn't set the location: " + error.message); else loadSpots();
      }
    });
    wrap.appendChild(btn); wrap.appendChild(input);
    wrap.appendChild(photoGallery("🎣 Photos from catches here", all.filter(p => p.catch_id), "No catch photos yet — they appear here when someone logs a catch with a photo.", "catches"));
    return wrap;
  }

  let viewing = null;
  function openViewer(ph) {
    viewing = ph;
    $("viewer-img").src = photoUrls[ph.path];
    const spot = (spots || []).find(x => x.id === ph.spot_id);
    const ct = ph.catch_id ? Object.values(catchesBySpot).flat().find(c => c.id === ph.catch_id) : null;
    const who = ct ? (isMine(ct) ? "you" : (typeof profName === "function" ? profName(ct.created_by) : null) || "a friend") : null;
    $("viewer-cap").textContent = `${ct ? "🎣 " + cap(ct.species || "Fish") + (ct.how_many > 1 ? " ×" + ct.how_many : "") + (ct.length_in ? " " + +Number(ct.length_in).toFixed(1) + "″" : "") + " by " + who + " · " : "📷 "}${spot ? spot.name + " · " : ""}${new Date(ph.created_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
    $("viewer-del").hidden = !isMine(ph);
    $("viewer").hidden = false;
  }
  function closeViewer() { $("viewer").hidden = true; $("viewer-img").src = ""; viewing = null; }
  $("viewer-close").addEventListener("click", closeViewer);
  $("viewer").addEventListener("click", e => { if (e.target.id === "viewer") closeViewer(); });
  $("viewer-del").addEventListener("click", async () => {
    if (!viewing || !confirm("Delete this photo?")) return;
    const ph = viewing;
    const { error } = await db.from("photos").delete().eq("id", ph.id);
    if (error) return alert("Couldn't delete: " + error.message);
    await db.storage.from("photos").remove([ph.path]);
    delete photoUrls[ph.path];
    closeViewer();
    loadPhotos();
  });


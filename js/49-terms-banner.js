// ---- One-time Terms banner for members who joined before the Terms page existed. Server: setup/89 (accept_terms).
// Shows once after sign-in until the person taps "I understand"; bump TERMS_VERSION when the Terms change and it returns.
const TERMS_VERSION = "2026-10-18";
async function termsBannerCheck() {
  const box = $("terms-banner"); if (!box || !me || !db) return;
  box.hidden = true; box.innerHTML = "";
  let row = null;
  try { const r = await db.from("members").select("terms_version").eq("email", me.email).maybeSingle(); if (r.error) return; row = r.data; } catch (e) { return; }
  if (!row || row.terms_version === TERMS_VERSION) return;
  box.appendChild(el("div", null, "📜 We added a Terms page. Please read it."));
  const row2 = el("div"); row2.style.cssText = "display:flex;gap:8px;margin-top:8px";
  const a = el("a", "btn ghost", "Read the Terms"); a.href = "terms.html"; a.target = "_blank"; a.rel = "noopener";
  const ok = el("button", "btn", "I understand"); ok.type = "button";
  ok.addEventListener("click", async () => {
    ok.disabled = true;
    try { const r = await db.rpc("accept_terms", { p_version: TERMS_VERSION }); if (r.error) throw r.error; box.hidden = true; box.innerHTML = ""; }
    catch (e) { ok.disabled = false; toast("Couldn't save that. Check your connection and try again."); }
  });
  row2.appendChild(a); row2.appendChild(ok); box.appendChild(row2); box.hidden = false;
}
window.termsBannerCheck = termsBannerCheck;

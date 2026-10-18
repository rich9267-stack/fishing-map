  // ---- 🎫 Fishing license: your licenses and their end dates (table fishing_licenses, own rows only, setup/51) ----
  // The database sends the phone alerts (cron license-reminders, daily ~9 AM New York): 14 days before and when it runs out.
  // The app shows the list in Settings and a banner on Home when one ends within 14 days or has run out (last 30 days).
  const LIC_KINDS = ["Saltwater (annual)", "Saltwater (5-year)", "Saltwater shoreline (free, renew yearly)", "Freshwater (annual)", "Freshwater (5-year)",
    "Freshwater + saltwater combo", "Sportsman's / Gold Sportsman's", "Silver Sportsman's 64+", "Snook permit", "Lobster permit", "Lifetime",
    "Don't need one (65+ resident / under 16)", "Other…"];
  let licRows = null, licBusy = false;
  const licToday = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const licDate = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };   // a plain date, no time zone shift
  const licDaysLeft = r => r.expires_on ? Math.round((licDate(r.expires_on) - licToday()) / 86400000) : null;
  const licNice = s => licDate(s).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  function licStatus(r) {
    const n = licDaysLeft(r);
    if (n === null) return { cls: "ok", text: "never runs out" };
    if (n < 0) return { cls: "bad", text: `ran out ${licNice(r.expires_on)}` };
    if (n === 0) return { cls: "bad", text: "runs out today" };
    if (n <= 14) return { cls: "warn", text: `runs out in ${n} day${n === 1 ? "" : "s"} (${licNice(r.expires_on)})` };
    return { cls: "ok", text: `good until ${licNice(r.expires_on)}` };
  }
  async function licLoad() {
    if (licBusy || !me || typeof db === "undefined" || !db) return;
    licBusy = true;
    try {
      const { data, error } = await db.from("fishing_licenses").select("id,kind,expires_on").order("expires_on", { ascending: true, nullsFirst: false });
      if (error) throw error;
      licRows = data || [];
    } catch (e) { if (!licRows) licRows = null; }
    licBusy = false;
    licDraw(); licWarn();
  }
  function licDraw() {
    const box = $("lic-list"); if (!box) return;
    box.innerHTML = "";
    if (licRows === null) { box.appendChild(el("div", "spot-meta", "…")); return; }
    if (!licRows.length) { box.appendChild(el("div", "spot-meta", "No license saved yet.")); return; }
    licRows.forEach(r => {
      const st = licStatus(r), row = el("div", "lic-row " + st.cls);
      row.appendChild(el("span", "lic-name", r.kind));
      row.appendChild(el("span", "lic-when", st.text));
      const ed = el("button", "linkbtn", "Change date"); ed.type = "button";
      ed.addEventListener("click", () => licEdit(r, row));
      const rm = el("button", "linkbtn", "Remove"); rm.type = "button";
      rm.addEventListener("click", async () => {
        if (!await askOk(`Remove "${r.kind}" from your list?`)) return;
        const { error } = await db.from("fishing_licenses").delete().eq("id", r.id);
        $("lic-msg").textContent = error ? "Couldn't remove it — try again." : "";
        licLoad();
      });
      const acts = el("span", "lic-acts"); acts.append(ed, rm); row.appendChild(acts);
      box.appendChild(row);
    });
  }
  function licEdit(r, row) {
    const f = el("form", "lic-edit");
    const d = el("input"); d.type = "date"; d.value = r.expires_on || ""; d.setAttribute("aria-label", "New end date for " + r.kind);
    const ok = el("button", "btn small", "Save"); ok.type = "submit";
    const no = el("button", "btn ghost small", "Cancel"); no.type = "button"; no.addEventListener("click", licDraw);
    f.append(d, ok, no);
    f.addEventListener("submit", async ev => {
      ev.preventDefault();
      if (!d.value) { $("lic-msg").textContent = "Pick the new end date."; return; }
      const { error } = await db.from("fishing_licenses").update({ expires_on: d.value }).eq("id", r.id);
      $("lic-msg").textContent = error ? "Couldn't save — try again." : "✅ Saved. Reminders will follow the new date.";
      licLoad();
    });
    row.appendChild(f); d.focus();
  }
  // Home banner: one ends within 14 days, or ran out in the last 30 days
  function licWarn() {
    const box = $("lic-warn"); if (!box) return;
    const due = (licRows || []).map(r => ({ r, n: licDaysLeft(r) })).filter(x => x.n !== null && x.n <= 14 && x.n >= -30).sort((a, b) => a.n - b.n)[0];
    box.innerHTML = ""; box.hidden = !due;
    if (!due) return;
    box.classList.toggle("bad", due.n <= 0);
    box.appendChild(el("b", null, due.n < 0 ? "🎫 Your fishing license has run out" : due.n === 0 ? "🎫 Your fishing license runs out today" : `🎫 Your fishing license runs out in ${due.n} day${due.n === 1 ? "" : "s"}`));
    box.appendChild(el("div", "spot-meta", `${due.r.kind} · ${licNice(due.r.expires_on)}`));
    const bar = el("div", "lic-acts");
    const a = el("a", "btn small", "Renew (FWC) ↗"); a.href = "https://myfwc.com/license/recreational/"; a.target = "_blank"; a.rel = "noopener"; a.style.textDecoration = "none";
    const up = el("button", "btn ghost small", "I renewed — update date"); up.type = "button"; up.addEventListener("click", licOpen);
    bar.append(a, up); box.appendChild(bar);
  }
  function licOpen() {
    const b = $("settings-btn"); if (b) b.click();
    setTimeout(() => { const x = $("lic-box"); if (x && x.scrollIntoView) x.scrollIntoView({ behavior: "smooth", block: "start" }); }, 150);
  }
  (function licSetup() {
    const sel = $("lic-kind"); if (!sel) return;
    LIC_KINDS.forEach(k => { const o = document.createElement("option"); o.value = k; o.textContent = k; sel.appendChild(o); });
    const sync = () => {
      const other = sel.value === "Other…", noNeed = /Lifetime|Don't need/.test(sel.value);
      $("lic-other").hidden = !other;
      if (noNeed) $("lic-never").checked = true;
      $("lic-date-box").style.visibility = $("lic-never").checked ? "hidden" : "";
    };
    sel.addEventListener("change", sync); $("lic-never").addEventListener("change", sync); sync();
    $("lic-form").addEventListener("submit", async ev => {
      ev.preventDefault();
      const kind = (sel.value === "Other…" ? $("lic-other").value : sel.value).trim(), never = $("lic-never").checked, date = $("lic-date").value;
      if (!kind) { $("lic-msg").textContent = "Type the license name."; return; }
      if (!never && !date) { $("lic-msg").textContent = "Pick the date it ends (it's printed on your license), or tick “never runs out”."; return; }
      $("lic-add").disabled = true;
      const { error } = await db.from("fishing_licenses").insert({ kind, expires_on: never ? null : date });
      $("lic-add").disabled = false;
      if (error) { $("lic-msg").textContent = /row-level|policy/.test(error.message || "") ? "You can save up to 10 licenses." : "Couldn't save — check your connection and try again."; return; }
      $("lic-msg").textContent = never ? "✅ Saved." : "✅ Saved. You'll get an alert 2 weeks before it ends (turn on 🎣 trip reminders in Phone alerts).";
      $("lic-date").value = ""; $("lic-other").value = ""; $("lic-never").checked = false; sel.value = LIC_KINDS[0]; sync();
      licLoad();
    });
    $("settings-btn").addEventListener("click", licLoad);
  })();

  // ---- 🐞 Report a problem: a note + (if allowed) app version, phone type and recent error messages → table problem_reports.
  // The database sends every admin a phone alert (trigger, setup/51). Admins see the reports at the bottom of Settings. ----
  const appVersion = () => { const s = document.querySelector('script[src*="01-core"]'); const m = s && /[?&]v=(\d+)/.exec(s.src); return m ? "v" + m[1] : "?"; };
  function appScreen() {
    const v = ["map", "list", "insights", "seasons", "feed"].find(k => { const x = $("view-" + k); return x && !x.hidden; });
    return v || "other";
  }
  (function bugSetup() {
    const btn = $("bug-btn"); if (!btn) return;
    btn.addEventListener("click", () => { $("bug-form").hidden = false; $("bug-msg").textContent = ""; $("bug-note").focus(); });
    $("bug-cancel").addEventListener("click", () => { $("bug-form").hidden = true; });
    $("bug-form").addEventListener("submit", async ev => {
      ev.preventDefault();
      const note = $("bug-note").value.trim();
      if (!note) { $("bug-msg").textContent = "Write a few words about what happened."; return; }
      const tech = $("bug-tech").checked;
      const row = { note, screen: bugFrom || appScreen() };
      if (tech) Object.assign(row, { app_version: appVersion(), device: (navigator.userAgent || "").slice(0, 300), errors: appErrors.slice(-10) });
      $("bug-send").disabled = true;
      const { error } = await db.from("problem_reports").insert(row);
      $("bug-send").disabled = false;
      if (error) { $("bug-msg").textContent = /row-level|policy/.test(error.message || "") ? "That's 10 reports today — thank you! Try again tomorrow." : "Couldn't send — check your connection and try again."; return; }
      $("bug-note").value = ""; $("bug-form").hidden = true;
      $("bug-msg").textContent = "✅ Sent — thank you! Richard gets it on his phone.";
    });
    $("settings-btn").addEventListener("click", () => { bugFrom = appScreen(); if (me && adminCan("problems")) bugAdminLoad(); });
  })();
  let bugFrom = null;   // the screen you were on before opening Settings
  async function bugAdminLoad() {
    const box = $("bug-admin"), list = $("bug-admin-list"); if (!box || !me || !adminCan("problems")) return;
    box.hidden = false; list.innerHTML = "";
    try {
      const { data, error } = await db.from("problem_reports").select("id,who,note,app_version,screen,device,errors,status,created_at").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      const rows = data || [], open = rows.filter(r => r.status === "new");
      list.appendChild(el("div", "spot-meta", open.length ? `${open.length} new` : "Nothing new 👍"));
      rows.forEach(r => {
        const card = el("details", "bug-row" + (r.status === "new" ? " new" : ""));
        const sum = document.createElement("summary");
        sum.textContent = `${r.status === "new" ? "🆕 " : "✅ "}${r.who || "Someone"} · ${new Date(r.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} — ${r.note.slice(0, 70)}${r.note.length > 70 ? "…" : ""}`;
        card.appendChild(sum);
        card.appendChild(el("div", null, r.note));
        card.appendChild(el("div", "spot-meta", [r.app_version, r.screen && "screen: " + r.screen, r.device].filter(Boolean).join(" · ") || "no technical details"));
        (Array.isArray(r.errors) ? r.errors : []).forEach(e => card.appendChild(el("div", "spot-meta", `⚠️ ${e.msg}${e.at ? " (" + e.at + ")" : ""}`)));
        if (r.status === "new") {
          const done = el("button", "btn ghost small", "✓ Mark done"); done.type = "button";
          done.addEventListener("click", async () => { done.disabled = true; await db.from("problem_reports").update({ status: "done" }).eq("id", r.id); bugAdminLoad(); });
          card.appendChild(done);
        }
        list.appendChild(card);
      });
    } catch (e) { list.appendChild(el("div", "spot-meta", "Couldn't load the reports.")); }
  }
  // phone-alert links: ?go=license and ?go=problems
  function goLicense() { licOpen(); }
  function goProblems() { const b = $("settings-btn"); if (b) b.click(); setTimeout(() => { const x = $("bug-admin"); if (x && x.scrollIntoView) x.scrollIntoView({ behavior: "smooth", block: "start" }); }, 300); }

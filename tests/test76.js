const html = require("./load")();
const { JSDOM } = require("jsdom");
const dom = new JSDOM(html, { runScripts: "dangerously", url: "https://example.org/", beforeParse(w) {
  w.supabase = { createClient: () => ({ auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => {}, signOut: async () => {} }, rpc: async () => ({ data: null, error: null }), from: () => ({ select: () => ({ then: x => Promise.resolve({ data: [], error: null }).then(x) }) }) }) };
  w.fetch = async () => ({ ok: true, json: async () => ({}) });
}});
const w = dom.window, d = w.document, wait = ms => new Promise(r => setTimeout(r, ms));
(async () => { try {
  await wait(500);
  w.eval('alert("Couldn\'t save that — check your signal.")');
  const box = d.getElementById("toast-box");
  console.log("alert became a note:", !!box && box.children.length === 1, "|", box && box.textContent);
  console.log("note is announced to screen readers:", box.getAttribute("aria-live"));
  box.firstChild.dispatchEvent(new w.MouseEvent("click", { bubbles: true }));
  console.log("tap closes it:", box.children.length === 0);
  for (let i = 0; i < 5; i++) w.eval(`alert("m${i}")`);
  console.log("at most 3 stay:", box.children.length, "| newest kept:", box.lastChild.textContent);
  console.log("catch-saving toast untouched:", typeof w.eval("toast") === "function" && w.eval("toast.length") === 2);
  // ---- confirm boxes ----
  const q = () => d.querySelector(".ask-box");
  let p = w.eval('askOk("Delete this photo?")');
  console.log("box shown:", !!q(), "| labels:", [...q().querySelectorAll("button")].map(b => b.textContent).join(" / "), "| safe button focused:", d.activeElement.textContent);
  [...q().querySelectorAll("button")][1].click(); console.log("Yes ->", await p, "| box gone:", !q());
  p = w.eval('askOk("Delete this photo?")'); d.dispatchEvent(new w.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); console.log("Escape ->", await p, "| box gone:", !q());
  p = w.eval('askOk("Leave \\"Pompano Posse\\"?")'); d.querySelector(".ask-bg").dispatchEvent(new w.MouseEvent("click", { bubbles: true })); console.log("tap outside ->", await p);
  p = w.eval('askOk("Post another plan anyway?")'); console.log("plain labels:", [...q().querySelectorAll("button")].map(b => b.textContent).join(" / ")); [...q().querySelectorAll("button")][0].click(); console.log("Cancel ->", await p);
  p = w.eval('askOk("Block Sam?\\n\\nYou will not see each other.")'); console.log("keeps line breaks:", /\n\n/.test(q().querySelector(".ask-text").textContent)); [...q().querySelectorAll("button")][0].click(); await p;
  w.confirm = () => true; console.log("test stub still answers:", await w.eval('askOk("Delete x?")'), "| no box:", !q());
  console.log("DONE");
} catch (e) { console.log("TEST ERROR", e && e.stack); } process.exit(0); })();

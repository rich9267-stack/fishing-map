  // ---- Shared spots (Supabase database) ----
  const SUPABASE_URL = "https://euxcisnyansdrzzjyvsl.supabase.co";
  const SUPABASE_KEY = "sb_publishable_WzAISSZCvquNsRJ3iJEP-Q_GjtILF7p"; // public key, safe in the page
  const db = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
  let me = null;           // { id, email, name, isAdmin } once signed in and on the invite list
  const isMine = row => !!(me && row && row.created_by === me.id);
  let spots = null;       // null = still loading (your circle: you + friends)
  let spotsAll = [];      // every spot you can see, including strangers' public ones (🌎 Public tab only)
  // Your circle = you + accepted friends. The main tabs only use the circle; strangers' public posts stay in 🌎 Public.
  let circlePromise = null, friendSig = null;
  function getCircle(fresh) {
    if (fresh || !circlePromise) circlePromise = (async () => {
      try {
        const { data, error } = await db.from("friendships").select("user_a,user_b").eq("status", "accepted");
        if (error) throw error;
        return new Set(data.map(r => (r.user_a === me.id ? r.user_b : r.user_a)));
      } catch (e) { circlePromise = null; return null; }
    })();
    return circlePromise;
  }
  const inCircle = (set, id) => !id || !set || (me && id === me.id) || set.has(id);
  let spotsError = null;
  let pickedLoc = null;

  const VIS_LABEL = { private: "🔒 Private", friends: "👥 Friends", public: "🌎 Public" };
  const follows = new Set(); // spots I follow ⭐ (morning bite alerts include them)
  const visIcon = s => (follows.has(s.id) ? "⭐ " : "") + (s.visibility === "public" ? "🌎 " : s.visibility === "private" || s.is_private ? "🔒 " : "");
  const WATER_LABEL = { saltwater: "Saltwater", brackish: "Brackish / tidal canal", freshwater: "Freshwater" };
  const $ = id => document.getElementById(id);

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text; // textContent keeps typed text safe
    return e;
  }
  // Links and pictures that come from outside servers must be https (never javascript: or data:)
  const safeHttps = u => /^https:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
  // A friendly "nothing here yet" box with one button that does the obvious next thing
  function emptyBox(text, label, fn) {
    const b = el("div", "empty empty-nice"); b.appendChild(el("div", null, text));
    if (label) { const btn = el("button", "btn small", label); btn.type = "button"; btn.addEventListener("click", fn); b.appendChild(btn); }
    return b;
  }
  // Messages that used to be the browser's plain "OK" box: now a small note that fades by itself (tap to close).
  // Every existing alert("…") call in the app lands here, so the wording stays in one place.
  function noteBox(msg) {
    let box = document.getElementById("toast-box");
    if (!box) { box = el("div"); box.id = "toast-box"; box.setAttribute("role", "status"); box.setAttribute("aria-live", "polite"); document.body.appendChild(box); }
    const t = el("div", "toast", String(msg));
    const kill = () => { if (t.parentNode) t.parentNode.removeChild(t); };
    t.addEventListener("click", kill);
    box.appendChild(t);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(kill, Math.min(12000, 4000 + String(msg).length * 45));
  }
  window.alert = noteBox;
  // In-app "Are you sure?" box (replaces the browser's confirm). Use as: if (!await askOk("Delete this photo?")) return;
  // Newlines in the text are kept. The safe button (Never mind) gets focus; Esc or tapping outside also says no.
  const nativeConfirm = window.confirm;
  function askOk(text) {
    if (window.confirm !== nativeConfirm) return Promise.resolve(window.confirm(text)); // tests swap in their own answer
    return new Promise(done => {
      const m = /^(Delete|Remove|Block|Cancel|Decline|Leave|Stop)\b/i.exec(text);
      const yes = m ? "Yes, " + m[1].toLowerCase() : "OK", no = m ? "Never mind" : "Cancel";
      const prev = document.activeElement;
      const bg = el("div", "ask-bg"), box = el("div", "ask-box");
      box.setAttribute("role", "alertdialog"); box.setAttribute("aria-modal", "true");
      const msg = el("div", "ask-text", String(text)), row = el("div", "ask-btns");
      const bNo = el("button", "btn ghost", no), bYes = el("button", "btn" + (m ? " danger" : ""), yes);
      bNo.type = bYes.type = "button";
      row.appendChild(bNo); row.appendChild(bYes); box.appendChild(msg); box.appendChild(row); bg.appendChild(box);
      const end = ok => { document.removeEventListener("keydown", key, true); bg.remove(); if (prev && prev.focus) { try { prev.focus(); } catch (e) { /* fine */ } } done(ok); };
      const key = e => { if (e.key === "Escape") { e.preventDefault(); end(false); } };
      document.addEventListener("keydown", key, true);
      bNo.addEventListener("click", () => end(false)); bYes.addEventListener("click", () => end(true));
      bg.addEventListener("click", e => { if (e.target === bg) end(false); });
      document.body.appendChild(bg); bNo.focus();
    });
  }
  // A "couldn't load" message with a Try again button
  function errBox(text, retryFn) {
    const b = el("div", "msg err err-retry"); b.appendChild(el("span", null, text));
    if (retryFn) { const btn = el("button", "btn ghost small", "↻ Try again"); btn.type = "button"; btn.addEventListener("click", () => { btn.disabled = true; btn.textContent = "Trying…"; retryFn(); }); b.appendChild(btn); }
    return b;
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  // ---- Per-spot conditions: nearest tide station or freshwater gauge ----
  // NOAA tide-prediction stations: Jupiter to Miami-Dade, the Florida Keys, the Gulf coast up to Cedar Key, the Atlantic coast north to the Georgia line, and the Panhandle west to the Alabama line.
  // Anywhere else (or a gap between these) the app asks NOAA for the nearest stations — see lookupStationsNear below.
  const TIDE_STATIONS = [
    { id: "8722670", name: "Lake Worth Pier", lat: 26.6128, lng: -80.0342 },
    { id: "8722802", name: "Lake Wyman (Boca Raton)", lat: 26.37, lng: -80.07 },
    { id: "8722832", name: "Deerfield Beach", lat: 26.3133, lng: -80.0817 },
    { id: "8722854", name: "Hillsboro Beach, ICWW", lat: 26.2733, lng: -80.08 },
    { id: "8722859", name: "Hillsboro", lat: 26.26, lng: -80.085 },
    { id: "8722861", name: "Hillsboro Inlet, inside", lat: 26.2583, lng: -80.0817 },
    { id: "8722862", name: "Hillsboro Inlet, ocean", lat: 26.2567, lng: -80.08 },
    { id: "8722899", name: "Lauderdale-by-the-Sea", lat: 26.1883, lng: -80.0933 },
    { id: "8722937", name: "Ft. Lauderdale, Andrews Ave Bridge", lat: 26.1183, lng: -80.145 },
    { id: "8722939", name: "Ft. Lauderdale, Bahia Yacht Club", lat: 26.1133, lng: -80.1083 },
    { id: "8722946", name: "Mayan Lake", lat: 26.1, lng: -80.1083 },
    { id: "8722951", name: "Port Everglades, Lake Mabel", lat: 26.0917, lng: -80.1233 },
    { id: "8722956", name: "South Port Everglades", lat: 26.0817, lng: -80.1167 },
    { id: "8722957", name: "North Dania Sound", lat: 26.08, lng: -80.1117 },
    { id: "8722968", name: "Port Laudania", lat: 26.06, lng: -80.13 },
    { id: "8722971", name: "Whiskey Creek, south entrance", lat: 26.055, lng: -80.1133 },
    { id: "8722977", name: "West Lake, north end", lat: 26.0433, lng: -80.1267 },
    { id: "8722979", name: "Hollywood Beach", lat: 26.04, lng: -80.115 },
    { id: "8722982", name: "West Lake, south end", lat: 26.0333, lng: -80.1233 },
    { id: "8723214", name: "Virginia Key", lat: 25.7314, lng: -80.1618 },
    // Palm Beach County
    { id: "8722404", name: "Peck Lake, St. Lucie Inlet", lat: 27.1133, lng: -80.145 },
    { id: "8722429", name: "Hobe Sound Bridge", lat: 27.065, lng: -80.1233 },
    { id: "8722445", name: "Hobe Sound State Park", lat: 27.0367, lng: -80.1067 },
    { id: "8722471", name: "Conch Bar, Jupiter Sound", lat: 26.9883, lng: -80.0933 },
    { id: "8722472", name: "North Loxahatchee River", lat: 26.9867, lng: -80.1417 },
    { id: "8722481", name: "Loxahatchee River", lat: 26.97, lng: -80.1267 },
    { id: "8722486", name: "Tequesta, N. Fork Loxahatchee", lat: 26.96, lng: -80.105 },
    { id: "8722491", name: "Jupiter Sound, south end", lat: 26.9517, lng: -80.08 },
    { id: "8722492", name: "Jupiter West", lat: 26.9467, lng: -80.09 },
    { id: "8722494", name: "SW Fork, Loxahatchee River", lat: 26.9433, lng: -80.12 },
    { id: "8722495", name: "Jupiter Inlet", lat: 26.9433, lng: -80.0733 },
    { id: "8722496", name: "Loxahatchee River Lock", lat: 26.935, lng: -80.1433 },
    { id: "8722499", name: "Jupiter, ICWW", lat: 26.935, lng: -80.085 },
    { id: "8722512", name: "Lake Worth Creek", lat: 26.9117, lng: -80.08 },
    { id: "8722528", name: "Donald Ross Bridge", lat: 26.8817, lng: -80.07 },
    { id: "8722548", name: "PGA Boulevard Bridge", lat: 26.8433, lng: -80.0667 },
    { id: "8722557", name: "North Palm Beach", lat: 26.8267, lng: -80.055 },
    { id: "8722588", name: "Port of West Palm Beach", lat: 26.77, lng: -80.0517 },
    { id: "8722607", name: "Palm Beach", lat: 26.7333, lng: -80.0417 },
    { id: "8722621", name: "Palm Beach (south)", lat: 26.705, lng: -80.045 },
    { id: "8722654", name: "West Palm Beach", lat: 26.645, lng: -80.045 },
    { id: "8722706", name: "Boynton Beach", lat: 26.5483, lng: -80.0533 },
    { id: "8722718", name: "Ocean Ridge", lat: 26.5267, lng: -80.0533 },
    { id: "8722746", name: "Delray Beach", lat: 26.4733, lng: -80.0617 },
    { id: "8722761", name: "South Delray Beach", lat: 26.4467, lng: -80.065 },
    { id: "8722784", name: "Yamato", lat: 26.4033, lng: -80.07 },
    { id: "8722816", name: "Boca Raton", lat: 26.3433, lng: -80.0767 },
    // Miami-Dade County
    { id: "8723026", name: "Golden Beach", lat: 25.9667, lng: -80.125 },
    { id: "8723044", name: "Dumfoundling Bay", lat: 25.9417, lng: -80.125 },
    { id: "8723050", name: "North Miami Beach", lat: 25.93, lng: -80.12 },
    { id: "8723073", name: "Haulover Inside", lat: 25.9033, lng: -80.125 },
    { id: "8723080", name: "Haulover Pier", lat: 25.9033, lng: -80.12 },
    { id: "8723087", name: "Sunny Isles, Biscayne Creek", lat: 25.9283, lng: -80.13 },
    { id: "8723089", name: "Biscayne Creek, ICWW", lat: 25.88, lng: -80.1633 },
    { id: "8723094", name: "Indian Creek Golf Club", lat: 25.875, lng: -80.1433 },
    { id: "8723155", name: "Miami Ship Base", lat: 25.77, lng: -80.1683 },
    { id: "8723156", name: "San Marino", lat: 25.7933, lng: -80.1633 },
    { id: "8723165", name: "Miami, Biscayne Bay", lat: 25.7783, lng: -80.185 },
    { id: "8723170", name: "Miami Beach", lat: 25.7683, lng: -80.1317 },
    { id: "8723178", name: "Government Cut", lat: 25.7633, lng: -80.13 },
    { id: "8723205", name: "Dinner Key Marina", lat: 25.7267, lng: -80.2367 },
    { id: "8723232", name: "Key Biscayne Yacht Club", lat: 25.6983, lng: -80.17 },
    { id: "8723251", name: "Cape Florida, Key Biscayne", lat: 25.6517, lng: -80.16 },
    { id: "8723289", name: "Cutler, Biscayne Bay", lat: 25.615, lng: -80.305 },
    { id: "8723303", name: "Soldier Key", lat: 25.59, lng: -80.1617 },
    { id: "8723350", name: "Ragged Key #3", lat: 25.5333, lng: -80.1717 },
    { id: "8723372", name: "Sands Key", lat: 25.5067, lng: -80.1883 },
    { id: "8723393", name: "Elliott Key (outside)", lat: 25.4767, lng: -80.18 },
    { id: "8723409", name: "Elliott Key Harbor", lat: 25.4533, lng: -80.1967 },
    { id: "8723423", name: "Turkey Point", lat: 25.4367, lng: -80.33 },
    { id: "8723453", name: "Adams Key", lat: 25.3967, lng: -80.2333 },
    { id: "8723465", name: "East Arsenicker, Card Sound", lat: 25.3733, lng: -80.29 },
    { id: "8723491", name: "Card Sound West", lat: 25.345, lng: -80.3317 },
    { id: "8723506", name: "Pumpkin Key, Card Sound", lat: 25.325, lng: -80.2933 },
    // Florida Keys — Atlantic (Hawk Channel) side and Florida Bay side, Key Largo to Key West (Gulf expansion, step 2)
    { id: "8723689", name: "Point Charles, Key Largo", lat: 25.0817, lng: -80.4467 },
    { id: "8723747", name: "Tavernier, Hawk Channel", lat: 25.005, lng: -80.5167 },
    { id: "8723769", name: "Plantation Key, Atlantic side", lat: 24.9733, lng: -80.55 },
    { id: "8723776", name: "Plantation Key, Florida Bay", lat: 24.965, lng: -80.5683 },
    { id: "8723786", name: "Islamorada, Snake Creek", lat: 24.9533, lng: -80.5867 },
    { id: "8723814", name: "Upper Matecumbe Key, Atlantic side", lat: 24.915, lng: -80.6317 },
    { id: "8723808", name: "Upper Matecumbe Key, Florida Bay", lat: 24.925, lng: -80.6317 },
    { id: "8723861", name: "Alligator Reef Lighthouse", lat: 24.85, lng: -80.6183 },
    { id: "8723851", name: "Lower Matecumbe Key, Hawk Channel", lat: 24.8683, lng: -80.7033 },
    { id: "8723873", name: "Long Key, Florida Bay", lat: 24.8383, lng: -80.7983 },
    { id: "8723899", name: "Long Key Channel, east", lat: 24.8033, lng: -80.85 },
    { id: "8723906", name: "Long Key Channel, west", lat: 24.7917, lng: -80.8833 },
    { id: "8723921", name: "Grassy Key, Florida Bay", lat: 24.7717, lng: -80.94 },
    { id: "8723933", name: "Grassy Key, Atlantic side", lat: 24.755, lng: -80.9583 },
    { id: "8723962", name: "Key Colony Beach", lat: 24.7183, lng: -81.0167 },
    { id: "8723950", name: "Marathon Shores, Vaca Cut", lat: 24.73, lng: -81.03 },
    { id: "8723971", name: "Boot Key Harbor, Marathon", lat: 24.7033, lng: -81.105 },
    { id: "8723970", name: "Vaca Key, Florida Bay", lat: 24.711, lng: -81.1065 },
    { id: "8724008", name: "Knight Key Channel", lat: 24.7067, lng: -81.125 },
    { id: "8723999", name: "Sombrero Key Lighthouse", lat: 24.6267, lng: -81.1117 },
    { id: "8724032", name: "Pigeon Key, Atlantic side", lat: 24.7033, lng: -81.155 },
    { id: "8724062", name: "Molasses Key", lat: 24.6833, lng: -81.1917 },
    { id: "8724094", name: "East Bahia Honda Key, bay side", lat: 24.775, lng: -81.2267 },
    { id: "8724138", name: "Bahia Honda Key", lat: 24.655, lng: -81.2817 },
    { id: "8724178", name: "Spanish Harbor Viaduct, Big Pine Key", lat: 24.6483, lng: -81.33 },
    { id: "8724193", name: "Bogie Channel, Big Pine Key", lat: 24.6967, lng: -81.3483 },
    { id: "8724257", name: "Howe Key", lat: 24.7583, lng: -81.4283 },
    { id: "8724292", name: "Kemp Channel Viaduct", lat: 24.6617, lng: -81.4683 },
    { id: "8724328", name: "Cudjoe Key", lat: 24.7, lng: -81.505 },
    { id: "8724373", name: "Sugarloaf Channel", lat: 24.7167, lng: -81.5617 },
    { id: "8724367", name: "North Harris Channel", lat: 24.6533, lng: -81.5533 },
    { id: "8724405", name: "Saddlebunch Channel", lat: 24.6233, lng: -81.6033 },
    { id: "8724474", name: "Duck Key Point, Lower Keys", lat: 24.6233, lng: -81.685 },
    { id: "8724493", name: "Boca Chica Marina", lat: 24.575, lng: -81.7083 },
    { id: "8724571", name: "Fleming Key", lat: 24.5917, lng: -81.795 },
    { id: "8724580", name: "Key West", lat: 24.5557, lng: -81.8079 },
    { id: "8724635", name: "Sand Key Lighthouse", lat: 24.4533, lng: -81.8783 },
    // Florida Bay / Everglades National Park
    { id: "8723644", name: "Flamingo, Everglades National Park", lat: 25.1417, lng: -80.9233 },
    { id: "8724769", name: "Ponce de Leon Bay", lat: 25.345, lng: -81.1267 },
    { id: "8724842", name: "Lostmans River entrance", lat: 25.5533, lng: -81.2133 },
    { id: "8724891", name: "Chatham River entrance", lat: 25.69, lng: -81.285 },
    // Gulf coast — Ten Thousand Islands to Cedar Key. Gulf tides are often "mixed": only one high and one low on some days.
    { id: "8724919", name: "Chokoloskee", lat: 25.8133, lng: -81.3633 },
    { id: "8724948", name: "Everglades City", lat: 25.8583, lng: -81.3867 },
    { id: "8724932", name: "Indian Key, Ten Thousand Islands", lat: 25.8, lng: -81.4667 },
    { id: "8724963", name: "Dismal Key, Pumpkin Bay", lat: 25.895, lng: -81.5583 },
    { id: "8724964", name: "Coon Key Pass, Gullivan Bay", lat: 25.8967, lng: -81.6367 },
    { id: "8724947", name: "Cape Romano Island", lat: 25.8533, lng: -81.675 },
    { id: "8724967", name: "Marco Island, Caxambas Pass", lat: 25.9083, lng: -81.7283 },
    { id: "8724991", name: "Marco, Big Marco River", lat: 25.9717, lng: -81.7283 },
    { id: "8725019", name: "Keewaydin Island, inside", lat: 26.025, lng: -81.7683 },
    { id: "8725110", name: "Naples", lat: 26.1317, lng: -81.8075 },
    { id: "8725114", name: "Naples Bay, north", lat: 26.1367, lng: -81.7883 },
    { id: "8725235", name: "Wiggins Pass, inside", lat: 26.29, lng: -81.8183 },
    { id: "8725319", name: "Coconut Point, Estero Bay", lat: 26.4, lng: -81.8433 },
    { id: "8725351", name: "Estero Island, Fort Myers Beach", lat: 26.4383, lng: -81.9183 },
    { id: "8725362", name: "Tarpon Bay, Sanibel", lat: 26.4433, lng: -82.0817 },
    { id: "8725383", name: "Captiva Island, south end", lat: 26.4783, lng: -82.1833 },
    { id: "8725391", name: "Punta Rassa, San Carlos Bay", lat: 26.4883, lng: -82.0133 },
    { id: "8725393", name: "St. James City, Pine Island", lat: 26.4917, lng: -82.0817 },
    { id: "8725441", name: "Redfish Pass, Captiva", lat: 26.55, lng: -82.1967 },
    { id: "8725451", name: "Cape Coral Bridge, Caloosahatchee River", lat: 26.5633, lng: -81.9333 },
    { id: "8725488", name: "North Captiva Island", lat: 26.605, lng: -82.2183 },
    { id: "8725506", name: "Matlacha Pass", lat: 26.6317, lng: -82.0683 },
    { id: "8725520", name: "Fort Myers", lat: 26.6478, lng: -81.8711 },
    { id: "8725541", name: "Bokeelia, Charlotte Harbor", lat: 26.7067, lng: -82.1633 },
    { id: "8725577", name: "Boca Grande, Charlotte Harbor", lat: 26.72, lng: -82.2583 },
    { id: "8725649", name: "Turtle Bay, Charlotte Harbor", lat: 26.7967, lng: -82.1833 },
    { id: "8725685", name: "Cutoff South, Charlotte Harbor", lat: 26.855, lng: -82.3033 },
    { id: "8725791", name: "Harbour Heights, Peace River", lat: 26.9883, lng: -81.9933 },
    { id: "8725747", name: "Englewood, Lemon Bay", lat: 26.9333, lng: -82.3533 },
    { id: "8725809", name: "Manasota", lat: 27.0117, lng: -82.41 },
    { id: "8725858", name: "Venice", lat: 27.0717, lng: -82.4533 },
    { id: "8725899", name: "Nokomis, Venice Inlet", lat: 27.1233, lng: -82.47 },
    { id: "8726034", name: "Siesta Key, Big Sarasota Pass", lat: 27.2839, lng: -82.565 },
    { id: "8726083", name: "Sarasota", lat: 27.3317, lng: -82.545 },
    { id: "8726282", name: "Anna Maria City Pier", lat: 27.5333, lng: -82.73 },
    { id: "8726273", name: "DeSoto Point, Manatee River", lat: 27.5233, lng: -82.65 },
    { id: "8726347", name: "Egmont Key, Tampa Bay", lat: 27.6017, lng: -82.76 },
    { id: "8726364", name: "Mullet Key, Fort De Soto", lat: 27.615, lng: -82.7267 },
    { id: "8726384", name: "Port Manatee", lat: 27.6387, lng: -82.5621 },
    { id: "8726428", name: "Tierra Verde", lat: 27.6883, lng: -82.7183 },
    { id: "8726454", name: "Point Pinellas, Tampa Bay", lat: 27.7017, lng: -82.64 },
    { id: "8726486", name: "Gulfport, Boca Ciega Bay", lat: 27.7367, lng: -82.7067 },
    { id: "8726520", name: "St. Petersburg", lat: 27.7606, lng: -82.6269 },
    { id: "8726533", name: "Johns Pass", lat: 27.785, lng: -82.7817 },
    { id: "8726601", name: "Indian Rocks Beach", lat: 27.8733, lng: -82.8517 },
    { id: "8726607", name: "Old Port Tampa", lat: 27.8578, lng: -82.5528 },
    { id: "8726639", name: "Tampa, Ballast Point", lat: 27.89, lng: -82.48 },
    { id: "8726674", name: "East Bay, Tampa", lat: 27.9231, lng: -82.4214 },
    { id: "8726724", name: "Clearwater Beach", lat: 27.9783, lng: -82.8317 },
    { id: "8726738", name: "Safety Harbor, Old Tampa Bay", lat: 27.9883, lng: -82.685 },
    { id: "8726761", name: "Dunedin City Dock", lat: 28.0133, lng: -82.7933 },
    { id: "8726917", name: "Anclote Key Lighthouse", lat: 28.165, lng: -82.8433 },
    { id: "8727151", name: "Bayport", lat: 28.5333, lng: -82.65 },
    { id: "8727235", name: "Chassahowitzka Bay", lat: 28.6917, lng: -82.6383 },
    { id: "8727274", name: "Homosassa Bay, Mason Creek", lat: 28.7617, lng: -82.6383 },
    { id: "8727277", name: "Homosassa River, Tuckers Island", lat: 28.7717, lng: -82.695 },
    { id: "8727333", name: "Mangrove Point, Crystal River", lat: 28.87, lng: -82.7233 },
    { id: "8727359", name: "Shell Island, Crystal River", lat: 28.9233, lng: -82.6917 },
    { id: "8727395", name: "Port Inglis, Withlacoochee River", lat: 29.0017, lng: -82.7583 },
    { id: "8727520", name: "Cedar Key", lat: 29.135, lng: -83.0317 },
    { id: "8727535", name: "Shell Mound", lat: 29.2064, lng: -83.0697 },
    { id: "8727577", name: "Suwannee", lat: 29.3283, lng: -83.1517 },
    { id: "8727648", name: "Horseshoe Point", lat: 29.4367, lng: -83.2933 },
    // Atlantic coast north of St. Lucie Inlet to the Georgia line (from NOAA's own station list, Oct 15 2026)
    { id: "8722383", name: "Port Salerno, Manatee Pocket", lat: 27.1517, lng: -80.1950 },
    { id: "8722381", name: "Great Pocket", lat: 27.1550, lng: -80.1717 },
    { id: "8722375", name: "South Point, St. Lucie Inlet", lat: 27.1583, lng: -80.1567 },
    { id: "8722376", name: "South Fork", lat: 27.1650, lng: -80.2550 },
    { id: "8722371", name: "Sewall Point", lat: 27.1750, lng: -80.1883 },
    { id: "8722366", name: "Seminole Shores", lat: 27.1833, lng: -80.1583 },
    { id: "8722357", name: "Stuart", lat: 27.2000, lng: -80.2583 },
    { id: "8722334", name: "North Fork", lat: 27.2433, lng: -80.3133 },
    { id: "8722329", name: "Jensen Beach Causeway Park", lat: 27.2517, lng: -80.2183 },
    { id: "8722312", name: "Eden, Nettles Island", lat: 27.2867, lng: -80.2267 },
    { id: "8722274", name: "Ankona", lat: 27.3550, lng: -80.2733 },
    { id: "8722219", name: "Fort Pierce, South Beach Causeway", lat: 27.4567, lng: -80.3233 },
    { id: "8722213", name: "Fort Pierce Inlet, Binney Dock", lat: 27.4683, lng: -80.3000 },
    { id: "8722212", name: "Fort Pierce Inlet, south jetty", lat: 27.4700, lng: -80.2883 },
    { id: "8722208", name: "North Beach Causeway", lat: 27.4717, lng: -80.3250 },
    { id: "8722207", name: "St. Lucie", lat: 27.4800, lng: -80.3333 },
    { id: "8722146", name: "Oslo", lat: 27.5933, lng: -80.3567 },
    { id: "8722125", name: "Vero Beach", lat: 27.6317, lng: -80.3717 },
    { id: "8722105", name: "Vero Beach (ocean)", lat: 27.6700, lng: -80.3600 },
    { id: "8722059", name: "Wabasso", lat: 27.7550, lng: -80.4250 },
    { id: "8722029", name: "Sebastian", lat: 27.8117, lng: -80.4633 },
    { id: "8722004", name: "Sebastian Inlet bridge", lat: 27.8600, lng: -80.4483 },
    { id: "8721994", name: "Micco", lat: 27.8733, lng: -80.4967 },
    { id: "8721843", name: "Melbourne Causeway", lat: 28.0833, lng: -80.5917 },
    { id: "8721804", name: "Canova Beach", lat: 28.1383, lng: -80.5783 },
    { id: "8721727", name: "Patrick Air Force Base", lat: 28.2450, lng: -80.6000 },
    { id: "8721649", name: "Cocoa Beach", lat: 28.3683, lng: -80.6000 },
    { id: "8721604", name: "Port Canaveral (Trident Pier)", lat: 28.4158, lng: -80.5931 },
    { id: "8721223", name: "Turtle Mound, Mosquito Lagoon", lat: 28.9267, lng: -80.8250 },
    { id: "8721222", name: "Packwood Place, Mosquito Lagoon", lat: 28.9400, lng: -80.8700 },
    { id: "8721164", name: "New Smyrna Beach", lat: 29.0233, lng: -80.9183 },
    { id: "8721147", name: "Ponce de Leon Inlet", lat: 29.0633, lng: -80.9158 },
    { id: "8721138", name: "Ponce Inlet, Halifax River", lat: 29.0817, lng: -80.9367 },
    { id: "8721120", name: "Daytona Beach Shores, Sunglow Pier", lat: 29.1467, lng: -80.9633 },
    { id: "8720954", name: "Ormond Beach, Halifax River", lat: 29.2850, lng: -81.0533 },
    { id: "8720832", name: "Welaka", lat: 29.4767, lng: -81.6750 },
    { id: "8720833", name: "Smith Creek, Flagler Beach", lat: 29.4783, lng: -81.1367 },
    { id: "8720793", name: "Piney Bluff Landing", lat: 29.5583, lng: -81.5733 },
    { id: "8720782", name: "Sutherlands Still, Dunns Creek", lat: 29.5717, lng: -81.6067 },
    { id: "8720767", name: "Buffalo Bluff", lat: 29.5950, lng: -81.6817 },
    { id: "8720757", name: "Bings Landing, Matanzas River", lat: 29.6150, lng: -81.2050 },
    { id: "8720774", name: "Palatka", lat: 29.6433, lng: -81.6317 },
    { id: "8720692", name: "Matanzas Inlet, State Road A1A Bridge", lat: 29.7045, lng: -81.2279 },
    { id: "8720686", name: "Fort Matanzas, Matanzas River, ICWW", lat: 29.7150, lng: -81.2383 },
    { id: "8720653", name: "Palmetto Bluff", lat: 29.7633, lng: -81.5617 },
    { id: "8720651", name: "Crescent Beach, Matanzas River", lat: 29.7683, lng: -81.2583 },
    { id: "8720625", name: "Racy Point, St Johns River", lat: 29.8017, lng: -81.5483 },
    { id: "8720587", name: "St. Augustine Beach", lat: 29.8567, lng: -81.2633 },
    { id: "8720596", name: "Tocoi", lat: 29.8583, lng: -81.5533 },
    { id: "8720582", name: "State Road 312, Matanzas River", lat: 29.8667, lng: -81.3067 },
    { id: "8720576", name: "St. Augustine, city dock", lat: 29.8917, lng: -81.3100 },
    { id: "8720554", name: "Vilano Beach, Tolomato River", lat: 29.9167, lng: -81.3000 },
    { id: "8720503", name: "Red Bay Point, St Johns River", lat: 29.9817, lng: -81.6342 },
    { id: "8720496", name: "Green Cove Springs", lat: 29.9900, lng: -81.6633 },
    { id: "8720494", name: "Tolomato River (ICWW)", lat: 29.9944, lng: -81.3295 },
    { id: "8720398", name: "Palm Valley, ICWW", lat: 30.1333, lng: -81.3867 },
    { id: "8720409", name: "Julington Creek", lat: 30.1350, lng: -81.6300 },
    { id: "8720374", name: "Orange Park Landing, Orange Park", lat: 30.1683, lng: -81.6950 },
    { id: "8720357", name: "I-295 bridge (west end)", lat: 30.1924, lng: -81.6889 },
    { id: "8720333", name: "Piney Point", lat: 30.2283, lng: -81.6633 },
    { id: "8720305", name: "Oak Landing, ICWW", lat: 30.2533, lng: -81.4300 },
    { id: "8720296", name: "Ortega River entrance", lat: 30.2783, lng: -81.7050 },
    { id: "8720291", name: "Jacksonville Beach", lat: 30.2833, lng: -81.3867 },
    { id: "8720274", name: "Little Pottsburg Creek", lat: 30.3100, lng: -81.6100 },
    { id: "8720226", name: "Jacksonville, Main Street Bridge", lat: 30.3200, lng: -81.6583 },
    { id: "8720267", name: "Pablo Creek, ICWW bridge", lat: 30.3233, lng: -81.4383 },
    { id: "8720259", name: "Atlantic Beach", lat: 30.3350, lng: -81.3950 },
    { id: "8720242", name: "Jacksonville, Long Branch", lat: 30.3600, lng: -81.6200 },
    { id: "8720232", name: "Pablo Creek entrance", lat: 30.3767, lng: -81.4483 },
    { id: "8720225", name: "Phoenix Park", lat: 30.3833, lng: -81.6367 },
    { id: "8720219", name: "Dames Point", lat: 30.3867, lng: -81.5583 },
    { id: "8720221", name: "Fulton", lat: 30.3900, lng: -81.5067 },
    { id: "8720217", name: "Moncrief Creek entrance", lat: 30.3917, lng: -81.6617 },
    { id: "8720220", name: "Mayport (Ferry Depot)", lat: 30.3933, lng: -81.4317 },
    { id: "8720214", name: "Mayport Naval Station, Degaussing Structure", lat: 30.3967, lng: -81.3950 },
    { id: "8720218", name: "Mayport (Bar Pilots Dock)", lat: 30.3982, lng: -81.4279 },
    { id: "8720216", name: "Lake Forest, Ribault River", lat: 30.3983, lng: -81.6983 },
    { id: "8720211", name: "Mayport Naval Station, Water Treatment Dock", lat: 30.4000, lng: -81.4133 },
    { id: "8720215", name: "Jacksonville, Navy Fuel Depot", lat: 30.4000, lng: -81.6267 },
    { id: "8720198", name: "Clapboard Creek, Pelotes Island", lat: 30.4067, lng: -81.5100 },
    { id: "8720203", name: "Blount Island Bridge", lat: 30.4133, lng: -81.5450 },
    { id: "8720196", name: "Sisters Creek", lat: 30.4167, lng: -81.4533 },
    { id: "8720213", name: "Sherwood Forest", lat: 30.4200, lng: -81.7283 },
    { id: "8720194", name: "Little Talbot Island, ocean", lat: 30.4300, lng: -81.4050 },
    { id: "8720189", name: "Cedar Heights, Broward River", lat: 30.4367, lng: -81.6417 },
    { id: "8720186", name: "Fort George Island, Fort George River", lat: 30.4400, lng: -81.4383 },
    { id: "8720168", name: "Simpson Creek, A1A highway bridge", lat: 30.4650, lng: -81.4317 },
    { id: "8720145", name: "Edwards Creek, 1 mi. above entrance", lat: 30.5017, lng: -81.5417 },
    { id: "8720148", name: "Tiger Point, Pumpkin Hill Creek", lat: 30.5017, lng: -81.4950 },
    { id: "8720143", name: "Sawpit Creek, 1 mi. above entrance", lat: 30.5033, lng: -81.4717 },
    { id: "8720137", name: "Sawpit Creek entrance, bridge", lat: 30.5133, lng: -81.4567 },
    { id: "8720135", name: "Nassau River Entrance", lat: 30.5183, lng: -81.4533 },
    { id: "8720119", name: "Mink Creek entrance", lat: 30.5367, lng: -81.5817 },
    { id: "8720098", name: "Nassauville", lat: 30.5683, lng: -81.5150 },
    { id: "8720097", name: "Cuno, Lofton Creek", lat: 30.5767, lng: -81.5717 },
    { id: "8720093", name: "Halfmoon Island, highway bridge", lat: 30.5767, lng: -81.6083 },
    { id: "8720086", name: "Amelia City, South Amelia River", lat: 30.5867, lng: -81.4633 },
    { id: "8720084", name: "Boggy Creek, 2 mi. above entrance", lat: 30.5883, lng: -81.6633 },
    { id: "8720059", name: "Vaughns Landing", lat: 30.6300, lng: -81.5767 },
    { id: "8720058", name: "Kingsley Creek, RR. bridge", lat: 30.6317, lng: -81.4767 },
    { id: "8720051", name: "Lofton, Lanceford Creek", lat: 30.6433, lng: -81.5233 },
    { id: "8720030", name: "Fernandina Beach, Amelia River", lat: 30.6714, lng: -81.4658 },
    { id: "8720023", name: "Chester, Bells River", lat: 30.6833, lng: -81.5333 },
    { id: "8720007", name: "Roses Bluff, Bells River", lat: 30.7033, lng: -81.5767 },
    { id: "8720011", name: "St. Marys River entrance, cut 1N", lat: 30.7083, lng: -81.4650 },
    { id: "8720004", name: "Crandall", lat: 30.7217, lng: -81.6217 },
    { id: "8720006", name: "Little St. Marys River", lat: 30.7317, lng: -81.7267 },
    // Panhandle / Big Bend: Steinhatchee to the Alabama line (from NOAA's own station list, Oct 16 2026). West of the Apalachicola River the clocks
    // are on Central time; that is fine because tide and water-temperature times are asked for in UTC (see parseNoaa in js/01).
    { id: "8727695", name: "Steinhatchee River ent., Deadman Bay", lat: 29.6717, lng: -83.3900 },
    { id: "8727792", name: "Hagens Cove", lat: 29.7967, lng: -83.5838 },
    { id: "8727843", name: "Spring Warrior Creek", lat: 29.9200, lng: -83.6717 },
    { id: "8727956", name: "Econfina River", lat: 30.0533, lng: -83.9100 },
    { id: "8727976", name: "Snipe Island, Econfina River State Park", lat: 30.0619, lng: -83.9527 },
    { id: "8727989", name: "Mandalay, Aucilla River", lat: 30.1267, lng: -83.9750 },
    { id: "8728104", name: "Port Leon", lat: 30.1244, lng: -84.1490 },
    { id: "8728130", name: "St. Marks River Entrance", lat: 30.0783, lng: -84.1783 },
    { id: "8728142", name: "St. Marks, St. Marks River", lat: 30.1533, lng: -84.2033 },
    { id: "8728152", name: "St. Marks, Wakulla River", lat: 30.1589, lng: -84.2186 },
    { id: "8728229", name: "Shell Point, Walker Creek", lat: 30.0583, lng: -84.2906 },
    { id: "8728237", name: "Bald Point, Ochlockonee Bay", lat: 29.9483, lng: -84.3417 },
    { id: "8728269", name: "Panacea, Dickerson Bay", lat: 30.0283, lng: -84.3867 },
    { id: "8728262", name: "Wakulla Airport, Ochlockonee Bay", lat: 29.9802, lng: -84.3959 },
    { id: "8728288", name: "Alligator Point, St. James Island", lat: 29.9033, lng: -84.4133 },
    { id: "8728360", name: "Turkey Point, St. James Island", lat: 29.9150, lng: -84.5117 },
    { id: "8728408", name: "Dog Island, East End", lat: 29.8100, lng: -84.5850 },
    { id: "8728412", name: "Lanark, St. George Sound", lat: 29.8783, lng: -84.5950 },
    { id: "8728464", name: "Carrabelle, Carrabelle River", lat: 29.8500, lng: -84.6650 },
    { id: "8728465", name: "Dog Island, west end", lat: 29.7850, lng: -84.6667 },
    { id: "8728486", name: "St. George Island, Northeast End", lat: 29.7667, lng: -84.7000 },
    { id: "8728488", name: "South Carrabelle Beach", lat: 29.8017, lng: -84.7367 },
    { id: "8728548", name: "St. George Island, East End", lat: 29.6867, lng: -84.7867 },
    { id: "8728552", name: "St. George Island, Rattlesnake Cove", lat: 29.6917, lng: -84.7917 },
    { id: "8728593", name: "East Bayou, Hwy 65 bridge, East Bay", lat: 29.8189, lng: -84.8503 },
    { id: "8728619", name: "Cat Point, Apalachicola Bay", lat: 29.7233, lng: -84.8867 },
    { id: "8728626", name: "St. George Island, 12th St. W (Bayside)", lat: 29.6533, lng: -84.8967 },
    { id: "8728694", name: "White Beach, East Bay", lat: 29.7850, lng: -84.8983 },
    { id: "8728669", name: "St. George Island, Sikes Cut", lat: 29.6133, lng: -84.9583 },
    { id: "8728690", name: "Apalachicola", lat: 29.7244, lng: -84.9806 },
    { id: "8728711", name: "Apalachicola River (A&N RR bridge)", lat: 29.7633, lng: -85.0333 },
    { id: "8728728", name: "Little St. George Island, Horseshoe Cove", lat: 29.6036, lng: -85.0428 },
    { id: "8728757", name: "Huckleberry Landing, Jackson River", lat: 29.7700, lng: -85.0850 },
    { id: "8728766", name: "West Pass", lat: 29.6333, lng: -85.0967 },
    { id: "8728786", name: "Eleven Mile, St. Vincent Sound", lat: 29.7067, lng: -85.1533 },
    { id: "8728819", name: "Lake Wimico", lat: 29.8214, lng: -85.1733 },
    { id: "8728852", name: "Indian Pass, St. Vincent Sound", lat: 29.6851, lng: -85.2213 },
    { id: "8728853", name: "White City, ICWW", lat: 29.8807, lng: -85.2214 },
    { id: "8728886", name: "White City, Gulf County Canal", lat: 29.8668, lng: -85.2706 },
    { id: "8728912", name: "Port Saint Joe, St. Joseph Bay", lat: 29.8150, lng: -85.3133 },
    { id: "8728957", name: "Overstreet", lat: 29.9967, lng: -85.3700 },
    { id: "8728958", name: "St. Joseph Point, St. Joseph Bay", lat: 29.8733, lng: -85.3900 },
    { id: "8728973", name: "Wetappo Creek, East Bay", lat: 30.0383, lng: -85.3933 },
    { id: "8728978", name: "Cape San Blas, Western Cape", lat: 29.7644, lng: -85.4025 },
    { id: "8729015", name: "Allanton, East Bay", lat: 30.0300, lng: -85.4650 },
    { id: "8729017", name: "Farmdale, East Bay", lat: 30.0167, lng: -85.4700 },
    { id: "8729026", name: "Goose Point, East Bay", lat: 30.0612, lng: -85.4886 },
    { id: "8729045", name: "Laird Bayou, East Bay", lat: 30.1217, lng: -85.5283 },
    { id: "8729082", name: "Deer Point Lake, Hwy 2321 bridge, North Bay", lat: 30.2696, lng: -85.6079 },
    { id: "8729084", name: "Parker", lat: 30.1267, lng: -85.6117 },
    { id: "8729102", name: "Lynn Haven, North Bay", lat: 30.2550, lng: -85.6483 },
    { id: "8729108", name: "Panama City", lat: 30.1497, lng: -85.6644 },
    { id: "8729132", name: "Courtney Point", lat: 30.1517, lng: -85.6667 },
    { id: "8729136", name: "Channel entrance", lat: 30.1250, lng: -85.7300 },
    { id: "8729142", name: "Sulphur Point, Port of Panama City", lat: 30.1830, lng: -85.7328 },
    { id: "8729152", name: "Alligator Bayou", lat: 30.1700, lng: -85.7550 },
    { id: "8729197", name: "West Bay Creek, West Bay", lat: 30.2933, lng: -85.8583 },
    { id: "8729210", name: "Panama City Beach", lat: 30.2138, lng: -85.8786 },
    { id: "8729333", name: "Lagrange Bayou", lat: 30.4683, lng: -86.1383 },
    { id: "8729376", name: "Santa Rosa, Hogtown Bayou", lat: 30.4000, lng: -86.2283 },
    { id: "8729425", name: "Driftwood Point, Choctawhatchee Bay", lat: 30.3894, lng: -86.3288 },
    { id: "8729479", name: "Rocky Bayou, Choctawhatchee Bay", lat: 30.5067, lng: -86.4467 },
    { id: "8729501", name: "Valparaiso", lat: 30.5033, lng: -86.4933 },
    { id: "8729511", name: "East Pass (Destin)", lat: 30.3950, lng: -86.5133 },
    { id: "8729538", name: "Shalimar, Garnier Bayou", lat: 30.4350, lng: -86.5867 },
    { id: "8729547", name: "Okaloosa Island", lat: 30.3914, lng: -86.5932 },
    { id: "8729572", name: "Mary Esther, Santa Rosa Sound", lat: 30.4065, lng: -86.6505 },
    { id: "8729613", name: "Harris, The Narrows", lat: 30.4083, lng: -86.7317 },
    { id: "8729678", name: "Navarre Beach", lat: 30.3767, lng: -86.8650 },
    { id: "8729702", name: "Holley, East Bay", lat: 30.4500, lng: -86.9183 },
    { id: "8729717", name: "Navarre, North Side, East Bay", lat: 30.4431, lng: -86.9514 },
    { id: "8729736", name: "Woodlawn Beach, Santa Rosa Sound", lat: 30.3867, lng: -86.9917 },
    { id: "8729742", name: "Bay Point, Blackwater River", lat: 30.5717, lng: -87.0050 },
    { id: "8729747", name: "Shield Point, Blackwater River", lat: 30.5817, lng: -87.0150 },
    { id: "8729753", name: "Hawkins Rec. Park, Blackwater River", lat: 30.6367, lng: -87.0283 },
    { id: "8729791", name: "Hernandez Point, Escambia Bay", lat: 30.4550, lng: -87.1000 },
    { id: "8729806", name: "Fishing Bend, Santa Rosa Sound", lat: 30.3367, lng: -87.1400 },
    { id: "8729807", name: "Pensacola Beach Pier", lat: 30.3275, lng: -87.1419 },
    { id: "8729816", name: "Lora Point, Escambia Bay", lat: 30.5150, lng: -87.1617 },
    { id: "8729824", name: "Floridatown, Escambia Bay", lat: 30.5817, lng: -87.1800 },
    { id: "8729840", name: "Pensacola", lat: 30.4044, lng: -87.2112 },
    { id: "8729868", name: "Warrington, 2 miles south of", lat: 30.3450, lng: -87.2733 },
    { id: "8729887", name: "Fort McRee Breakwater", lat: 30.3267, lng: -87.3117 },
    { id: "8729909", name: "Big Lagoon", lat: 30.3267, lng: -87.3567 },
    { id: "8729905", name: "Millview, Perdido Bay", lat: 30.4183, lng: -87.3567 },
    { id: "8729962", name: "Nix Point, Perdido Bay", lat: 30.3933, lng: -87.4250 },
    { id: "8729941", name: "Blue Angels Park", lat: 30.3869, lng: -87.4288 }
  ];

  function miles(aLat, aLng, bLat, bLng) {
    const R = 3958.8, rad = Math.PI / 180;
    const dLat = (bLat - aLat) * rad, dLng = (bLng - aLng) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function hasLoc(s) { return s && s.lat != null && s.lng != null; }

  // Stations found by asking NOAA about places outside the built-in list (remembered on this phone)
  let extraStations = [];
  try { extraStations = JSON.parse(localStorage.getItem("fm-extra-stations") || "[]"); } catch (e) {}
  const stationLookups = {};   // "lat,lng" → true (asked / answered) or the time it failed (asked again after a minute — a weak signal in the Keys shouldn't block it all day)
  const LOOKUP_RETRY_MS = 60000;
  function lookupStationsNear(lat, lng) {
    const key = lat.toFixed(1) + "," + lng.toFixed(1);
    const was = stationLookups[key];
    if (was === true || (typeof was === "number" && Date.now() - was < LOOKUP_RETRY_MS)) return;
    stationLookups[key] = true;
    fetch(`https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/tidepredstations.json?lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}&radius=25`)
      .then(r => r.json())
      .then(d => {
        const list = (d.stationList || d.stations || []).map(x => ({ id: String(x.stationId || x.id), name: x.stationName || x.commonName || x.name, lat: +x.lat, lng: +(x.lon != null ? x.lon : x.lng) }))
          .filter(x => x.id && isFinite(x.lat) && isFinite(x.lng) && !/^TEC/.test(x.id));
        const known = new Set(tideAll().map(t => t.id));
        const add = list.filter(x => !known.has(x.id));
        if (!add.length) return;
        extraStations = extraStations.concat(add).slice(-300);
        try { localStorage.setItem("fm-extra-stations", JSON.stringify(extraStations)); } catch (e) {}
        refreshConditions(); renderSpots();
        if (typeof hwStationsAdded === "function") hwStationsAdded();
      }).catch(() => { stationLookups[key] = Date.now(); });   // couldn't reach NOAA: allow another try after a minute
  }

  // Florida's built-in list + every other coastal state (js/60, loaded later, so looked up when needed) + stations asked of NOAA on this phone
  const tideAll = () => TIDE_STATIONS.concat(typeof TIDE_STATIONS_US !== "undefined" ? TIDE_STATIONS_US : [], extraStations);
  const wtAll = () => (typeof WT_STATIONS_US !== "undefined" ? WT_STATIONS.concat(WT_STATIONS_US) : WT_STATIONS);

  // The tide station a spot uses (Hillsboro for spots without a location)
  function stationFor(s) {
    if (!hasLoc(s)) return { ...(tideAll().find(t => t.id === STATION) || TIDE_STATIONS.find(t => t.id === "8722859")), dist: null };
    let best = null;
    tideAll().forEach(t => {
      const d = miles(s.lat, s.lng, t.lat, t.lng);
      if (!best || d < best.dist) best = { ...t, dist: d };
    });
    if (best && best.dist > 5) lookupStationsNear(s.lat, s.lng); // far from everything we know — ask NOAA
    return best;
  }

  // Each station's high/lows are fetched once and shared by every spot that uses it
  const tideCache = {};
  function stationTides(id) {
    if (!tideCache[id]) {
      const start = new Date(); start.setDate(start.getDate() - 1);
      const url = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter" +
        `?product=predictions&application=fishing_map&begin_date=${ymdUtc(start)}&range=120` +
        `&datum=MLLW&station=${id}&time_zone=gmt&units=english&interval=hilo&format=json`;
      tideCache[id] = fetch(url).then(r => r.json()).then(d => {
        if (!d.predictions) throw new Error("No tide data");
        return d.predictions.map(p => ({ when: parseNoaa(p.t), high: p.type === "H" }));
      });
      tideCache[id].done = false;
      tideCache[id].then(t => { tideCache[id].done = t; refreshConditions(); },
                         () => { tideCache[id].done = "error"; refreshConditions(); });
    }
    return tideCache[id];
  }

  function stageFrom(tides, when) {
    const prev = [...tides].reverse().find(t => t.when <= when);
    const next = tides.find(t => t.when > when);
    if (!prev || !next) return null;
    const SLACK = 30 * 60000;
    let stage;
    if (when - prev.when < SLACK) stage = prev.high ? "high slack" : "low slack";
    else if (next.when - when < SLACK) stage = next.high ? "high slack" : "low slack";
    else stage = next.high ? "incoming" : "outgoing";
    return { stage, next };
  }

  // A spot's own tide times: the station's, shifted by the spot's "tide timing here" setting
  const shiftTides = (tides, min) => !min ? tides : tides.map(t => ({ ...t, when: new Date(t.when.getTime() + min * 60000) }));
  function spotTides(s) {
    const p = stationTides(stationFor(s).id);
    return p.done && p.done !== "error" ? shiftTides(p.done, s.tide_offset_min || 0) : p.done;
  }
  const offsetText = min => !min ? "" : `${min > 0 ? "+" : "−"}${Math.abs(min) >= 60 ? Math.floor(Math.abs(min) / 60) + " hr " : ""}${Math.abs(min) % 60 ? Math.abs(min) % 60 + " min" : ""}`.trim();

  function spotTideText(s) {
    const st = stationFor(s);
    const t = spotTides(s);
    if (!t) return "Loading tide…";
    if (t === "error") return "Tide unavailable";
    const r = stageFrom(t, new Date());
    if (!r) return "Tide unavailable";
    const arrow = { incoming: "⬆ Incoming", outgoing: "⬇ Outgoing", "high slack": "High slack", "low slack": "Low slack" }[r.stage];
    const adj = s.tide_offset_min ? `, ${offsetText(s.tide_offset_min)} here` : "";
    const where = st.dist != null ? ` (${st.name}, ${st.dist < 0.1 ? "here" : st.dist.toFixed(1) + " mi"}${adj})` : "";
    return `${arrow} · ${r.next.high ? "high" : "low"} ${clock(r.next.when, tzFor(s.lat, s.lng))}${where}`;
  }

  // Freshwater: nearest active USGS gauge with a water-level reading, plus its 24-hour change
  const gaugeCache = {};
  function gaugeFor(s) {
    if (!hasLoc(s)) return null;
    const key = s.id + ":" + s.lat + "," + s.lng;
    if (!gaugeCache[key]) {
      const box = [s.lng - 0.3, s.lat - 0.3, s.lng + 0.3, s.lat + 0.3].map(v => v.toFixed(4)).join(",");
      const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${box}` +
        "&parameterCd=00065,62614,62615,62620&siteStatus=active&period=P1D";
      gaugeCache[key] = fetch(url).then(r => r.json()).then(d => {
        let best = null;
        (d.value.timeSeries || []).forEach(ts => {
          const vals = (ts.values[0] && ts.values[0].value || []).filter(v => v.value !== "" && +v.value > -999990);
          if (!vals.length) return;
          const loc = ts.sourceInfo.geoLocation.geogLocation;
          const dist = miles(s.lat, s.lng, loc.latitude, loc.longitude);
          if (best && best.dist <= dist) return; // keep the closest gauge
          const latest = vals[vals.length - 1], first = vals[0];
          best = {
            name: ts.sourceInfo.siteName, dist,
            ft: +latest.value, change: +latest.value - +first.value,
            hours: (new Date(latest.dateTime) - new Date(first.dateTime)) / 3600000
          };
        });
        return best;
      });
      gaugeCache[key].done = false;
      gaugeCache[key].then(g => { gaugeCache[key].done = g || "none"; refreshConditions(); },
                           () => { gaugeCache[key].done = "error"; refreshConditions(); });
    }
    return gaugeCache[key];
  }

  function spotWaterText(s) {
    if (!hasLoc(s)) return "Set a location to see water level";
    const g = gaugeFor(s);
    if (!g.done) return "Loading water level…";
    if (g.done === "error") return "Water level unavailable";
    if (g.done === "none") return "No water-level gauge nearby";
    const v = g.done;
    const trend = v.hours < 6 ? "" : Math.abs(v.change) < 0.05 ? " steady" : v.change > 0 ? ` ↗ up ${v.change.toFixed(2)} ft` : ` ↘ down ${Math.abs(v.change).toFixed(2)} ft`;
    return `💧 ${v.ft.toFixed(2)} ft${trend}${v.hours >= 6 ? " (24 hr)" : ""} · gauge ${v.dist.toFixed(1)} mi away`;
  }

  // Spots more than ~15 miles from Pompano get their own current wind & pressure (Open-Meteo, cached per area)
  const localWxCache = {};
  function localWx(s) {
    const key = s.lat.toFixed(1) + "," + s.lng.toFixed(1);
    if (!localWxCache[key]) {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${s.lat.toFixed(2)}&longitude=${s.lng.toFixed(2)}` +
        "&current=temperature_2m,wind_speed_10m,wind_direction_10m,pressure_msl&hourly=pressure_msl&past_hours=3&forecast_hours=1" +
        "&wind_speed_unit=mph&temperature_unit=fahrenheit&timezone=" + encodeURIComponent(tzFor(s.lat, s.lng) || "auto");
      const p = localWxCache[key] = fetch(url).then(r => r.json()).then(d => {
        const c = d.current, h = d.hourly && d.hourly.pressure_msl;
        const inHg = c.pressure_msl / 33.8639;
        let trend = null;
        if (h && h.length >= 4 && h[0] != null) { const ch = inHg - h[0] / 33.8639; trend = ch >= 0.03 ? "rising" : ch <= -0.03 ? "falling" : "steady"; }
        return { wind: `💨 ${compass(c.wind_direction_10m)} ${Math.round(c.wind_speed_10m)} mph · ${Math.round(c.temperature_2m)}°`,
                 deg: c.wind_direction_10m,
                 pressure: Math.round(inHg * 100) / 100, trend };
      });
      p.done = false;
      p.then(v => { p.done = v; refreshConditions(); }, () => { p.done = "error"; });
    }
    return localWxCache[key];
  }

  // ---- Water temperature ----
  // NOAA stations whose water-temperature sensors read believable values.
  // (Port Everglades is left out: its sensor reads 92–98°F, far above the surrounding ocean. Naples, Old Port Tampa,
  //  Marco Island and Venice have no water-temperature sensor at all.) KEEP the first two where they are: js/13 compares against them.
  // `mi` = how far a station can speak for: river and bay stations only for nearby water (default WT_STATION_MI).
  const WT_STATIONS = [
    { id: "8722670", name: "Lake Worth Pier", lat: 26.6128, lng: -80.0342 },
    { id: "8723214", name: "Virginia Key", lat: 25.7314, lng: -80.1618 },
    { id: "8723970", name: "Vaca Key", lat: 24.711, lng: -81.1065 },
    { id: "8724580", name: "Key West", lat: 24.5557, lng: -81.8079 },
    // Gulf coast (all read 81–85°F when checked on Oct 14, 2026)
    { id: "8725520", name: "Fort Myers", lat: 26.6478, lng: -81.8711, mi: 8 },        // up the Caloosahatchee River
    { id: "8726384", name: "Port Manatee", lat: 27.6387, lng: -82.5621, mi: 10 },     // inside Tampa Bay
    { id: "8726520", name: "St. Petersburg", lat: 27.7606, lng: -82.6269, mi: 10 },   // inside Tampa Bay
    { id: "8726724", name: "Clearwater Beach", lat: 27.9783, lng: -82.8317 },
    { id: "8727520", name: "Cedar Key", lat: 29.135, lng: -83.0317 },
    // Jacksonville area (read 79–82°F on Oct 15, 2026). Trident Pier (Port Canaveral) and Fernandina Beach give no water-temperature data, so they are not here.
    { id: "8720218", name: "Mayport (Bar Pilots Dock)", lat: 30.3982, lng: -81.4279 },
    { id: "8720219", name: "Dames Point", lat: 30.3867, lng: -81.5583, mi: 8 },              // St. Johns River
    { id: "8720245", name: "Jacksonville University", lat: 30.3541, lng: -81.6118, mi: 8 },  // St. Johns River
    // Panhandle (read 76–84°F over the last 3 days, Oct 16, 2026). Bay stations only speak for nearby water.
    { id: "8728690", name: "Apalachicola", lat: 29.7244, lng: -84.9806, mi: 10 },              // Apalachicola Bay
    { id: "8729108", name: "Panama City", lat: 30.1497, lng: -85.6644, mi: 10 },               // St. Andrew Bay
    { id: "8729210", name: "Panama City Beach", lat: 30.2138, lng: -85.8786 },                 // Gulf pier
    { id: "8729840", name: "Pensacola", lat: 30.4044, lng: -87.2112, mi: 10 }                  // Pensacola Bay
  ];
  const WT_RANGE = [30, 96];            // anything outside this is a bad reading (cold bays up north really do read 30s; shallow Gulf / Florida Bay water really does reach 93–95°F in July–August)
  const WT_STATION_MI = 20;             // use a station only if it's this close
  const okTemp = v => typeof v === "number" && isFinite(v) && v >= WT_RANGE[0] && v <= WT_RANGE[1];

  // The nearest station that is close enough to speak for this spot (or null → the ocean model / satellite is used)
  function wtSourceFor(lat, lng) {
    const st = wtAll().map(t => ({ ...t, dist: miles(lat, lng, t.lat, t.lng) }))
      .filter(t => t.dist <= (t.mi || WT_STATION_MI)).sort((a, b) => a.dist - b.dist)[0];
    return st || null;
  }
  // The n nearest stations within maxMi (for the "comparison" readings on the weather card)
  function wtNearest(lat, lng, n, maxMi) {
    return wtAll().map(t => ({ ...t, dist: miles(lat, lng, t.lat, t.lng) }))
      .filter(t => t.dist <= maxMi).sort((a, b) => a.dist - b.dist).slice(0, n);
  }
  // Last resort for shallow bays the ocean model leaves blank: NOAA's 1 km satellite map (MUR — the same one as the 🛰 layer).
  // Tries the spot and four points about 1½ miles around it; returns °F or null.
  async function satTempNow(lat, lng) {
    for (const [dy, dx] of [[0, 0], [0.02, 0], [-0.02, 0], [0, 0.02], [0, -0.02]]) {
      try {
        const d = await erddapJson(`https://coastwatch.pfeg.noaa.gov/erddap/griddap/jplMURSST41.json?analysed_sst[(last)][(${(lat + dy).toFixed(3)})][(${(lng + dx).toFixed(3)})]`, 12000);
        const row = d.table && d.table.rows && d.table.rows[0];
        const c = row ? row[row.length - 1] : null;
        const f = typeof c === "number" ? c * 9 / 5 + 32 : null;
        if (okTemp(f)) return Math.round(f * 10) / 10;
      } catch (e) { /* try the next point */ }
    }
    return null;
  }

  // Current water temperature at a place: nearby NOAA station, otherwise an ocean model for that exact spot
  const wtNowCache = {};
  function waterTempNow(lat, lng) {
    const st = wtSourceFor(lat, lng);
    const key = st ? st.id : lat.toFixed(2) + "," + lng.toFixed(2);
    if (wtNowCache[key]) return wtNowCache[key];
    const job = (async () => {
      if (st) {
        try {
          const d = await (await fetch("https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_temperature&application=fishing_map" +
            `&date=latest&station=${st.id}&units=english&time_zone=lst_ldt&format=json`)).json();
          const v = d.data && d.data[0] && parseFloat(d.data[0].v);
          if (okTemp(v)) return { f: Math.round(v * 10) / 10, source: `${st.name} station`, label: `${st.name}, ${st.dist.toFixed(0)} mi` };
        } catch (e) {}
      }
      try {
        const d = await (await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
          "&current=sea_surface_temperature&temperature_unit=fahrenheit&timezone=" + encodeURIComponent(tzFor(lat, lng) || "auto"))).json();
        const v = d.current && d.current.sea_surface_temperature;
        if (okTemp(v)) return { f: Math.round(v * 10) / 10, source: "ocean model", label: "ocean estimate" };
      } catch (e) { /* fall through to the satellite map */ }
      const sat = await satTempNow(lat, lng);
      if (sat == null) throw new Error("No water temperature here");
      return { f: sat, source: "satellite", label: "satellite estimate" };
    })();
    wtNowCache[key] = job;
    job.done = false;
    job.then(v => { job.done = v; refreshConditions(); }, () => { job.done = "error"; });
    return job;
  }

  // Water temperature at a past moment (for logging catches)
  async function waterTempAt(lat, lng, when) {
    const st = wtSourceFor(lat, lng);
    // NOAA is asked in UTC; the window is 3 hours either side of the moment so an evening catch (already "tomorrow" in UTC) is not lost
    const dayA = ymdUtc(new Date(when.getTime() - 3 * 3600000)), dayB = ymdUtc(new Date(when.getTime() + 3 * 3600000));
    if (st) {
      try {
        const d = await (await fetch("https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=water_temperature&application=fishing_map" +
          `&begin_date=${dayA}&end_date=${dayB}&interval=h&station=${st.id}&units=english&time_zone=gmt&format=json`)).json();
        const best = (d.data || []).map(r => ({ t: parseNoaa(r.t), v: parseFloat(r.v) })).filter(r => okTemp(r.v))
          .sort((a, b) => Math.abs(a.t - when) - Math.abs(b.t - when))[0];
        if (best && Math.abs(best.t - when) <= 2 * 3600000) return { f: Math.round(best.v * 10) / 10, source: `${st.name} station` };
      } catch (e) {}
    }
    const dd = ymdDashUtc(when);
    const d = await (await fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat.toFixed(3)}&longitude=${lng.toFixed(3)}` +
      `&hourly=sea_surface_temperature&temperature_unit=fahrenheit&timezone=GMT&start_date=${dd}&end_date=${dd}`)).json();
    const h = d.hourly || {};
    const i = (h.time || []).indexOf(`${dd}T${pad2(when.getUTCHours())}:00`);
    const v = i >= 0 ? h.sea_surface_temperature[i] : null;
    if (okTemp(v)) return { f: Math.round(v * 10) / 10, source: "ocean model" };
    // Last resort for older dates: NOAA's daily satellite record (one value per day)
    const sat = await erddapJson("https://coastwatch.noaa.gov/erddap/griddap/noaacrwsstDaily.json?analysed_sst" +
      `[(${dd}T12:00:00Z)][(${lat.toFixed(3)})][(${lng.toFixed(3)})]`);
    const row = sat.table && sat.table.rows && sat.table.rows[0];
    const c = row ? row[row.length - 1] : null;
    const f = typeof c === "number" ? c * 9 / 5 + 32 : null;
    if (!okTemp(f)) throw new Error("No water temperature record");
    return { f: Math.round(f * 10) / 10, source: "satellite (daily)" };
  }

  // ---- Fill in water temperature on older catches (your own — only the owner can change a catch) ----
  // Runs quietly a few at a time; anything that can't be found is retried after a week.
  let backfilling = false;
  async function backfillWaterTemps() {
    if (backfilling || !me || !navigator.onLine) return;
    let tried = {};
    try { tried = JSON.parse(localStorage.getItem("fm-wt-tried") || "{}"); } catch (e) {}
    const WEEK = 7 * 86400000, now = Date.now();
    const todo = Object.values(catchesBySpot).flat().filter(c => {
      if (!isMine(c) || c.water_temp_f != null) return false;
      if (tried[c.id] && now - tried[c.id] < WEEK) return false;
      const s = (spots || []).find(x => x.id === c.spot_id);
      return s && hasLoc(s) && s.water_type !== "freshwater" && new Date(c.caught_at) <= new Date();
    }).slice(0, 25);
    if (!todo.length) return;
    backfilling = true;
    let filled = 0;
    for (const c of todo) {
      const s = spots.find(x => x.id === c.spot_id);
      try {
        const r = await waterTempAt(s.lat, s.lng, new Date(c.caught_at));
        const { error } = await db.from("catches").update({ water_temp_f: r.f, water_temp_source: r.source }).eq("id", c.id);
        if (error) throw error;
        c.water_temp_f = r.f; c.water_temp_source = r.source;
        filled++;
      } catch (e) {
        if (isNetErr(e)) break;
        tried[c.id] = now;
      }
      await new Promise(r => setTimeout(r, 400)); // be gentle with the free data services
    }
    try { localStorage.setItem("fm-wt-tried", JSON.stringify(tried)); } catch (e) {}
    backfilling = false;
    if (filled) { renderSpots(); renderInsights(); }
  }
  function spotWaterTemp(s) {
    if (!hasLoc(s) || s.water_type === "freshwater") return null; // ocean readings don't apply to fresh water
    const w = waterTempNow(s.lat, s.lng);
    return w.done && w.done !== "error" ? `🌊 ${Math.round(w.done.f)}°F water` : null;
  }

  function spotConditions(s) {
    const first = s.water_type === "freshwater" ? spotWaterText(s) : spotTideText(s);
    return [first, spotWaterTemp(s), spotWindPressure(s), canalText(s)].filter(Boolean).join("  ·  ");
  }

  // Canal salinity and flow from USGS sensors within ~8 miles (free; mostly Miami-Dade canals + Hillsboro Canal at S-6)
  const CANAL_NEAR_MI = 8;
  const canalCache = {};
  function canalFor(s) {
    if (!hasLoc(s)) return null;
    const key = s.lat.toFixed(2) + "," + s.lng.toFixed(2);
    if (!canalCache[key]) {
      const box = [s.lng - 0.15, s.lat - 0.13, s.lng + 0.15, s.lat + 0.13].map(v => v.toFixed(4)).join(",");
      const url = `https://waterservices.usgs.gov/nwis/iv/?format=json&bBox=${box}&parameterCd=00480,00060,00065&siteStatus=active&period=P1D`;
      canalCache[key] = fetch(url).then(r => r.json()).then(d => {
        const best = {};
        (d.value.timeSeries || []).forEach(ts => {
          const code = ts.variable.variableCode[0].value;
          const vals = (ts.values[0] && ts.values[0].value || []).filter(v => v.value !== "" && +v.value > -999990);
          if (!vals.length) return;
          const loc = ts.sourceInfo.geoLocation.geogLocation;
          const dist = miles(s.lat, s.lng, loc.latitude, loc.longitude);
          if (dist > CANAL_NEAR_MI || (best[code] && best[code].dist <= dist)) return;
          const latest = vals[vals.length - 1];
          best[code] = { name: niceSite(ts.sourceInfo.siteName), dist, v: +latest.value, first: +vals[0].value, when: new Date(latest.dateTime) };
        });
        return { salt: best["00480"] || null, flow: best["00060"] || null, level: best["00065"] || null };
      });
      canalCache[key].done = false;
      canalCache[key].then(g => { canalCache[key].done = g; refreshConditions(); },
                           () => { canalCache[key].done = "error"; });
    }
    return canalCache[key];
  }
  const niceSite = n => n.toLowerCase().replace(/\b(fl|nr)\b/g, m => m === "nr" ? "near" : "").replace(/,\s*$/, "").replace(/\s+/g, " ").trim()
    .replace(/(^|\s)([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(S|G)-?(\d+[a-z]?)\b/gi, (m, a, b) => a.toUpperCase() + "-" + b.toUpperCase()).replace(/\b(At|Of|Near|Upstream|Downstream)\b/g, m => m.toLowerCase());
  function canalText(s) {
    const c = canalFor(s);
    if (!c || !c.done || c.done === "error") return null;
    const parts = [];
    const { salt, flow, level } = c.done;
    if (salt) {
      const kind = salt.v < 0.5 ? "fresh" : salt.v < 5 ? "slightly salty" : salt.v < 18 ? "brackish" : "salty";
      parts.push(`🧂 Canal ${salt.v.toFixed(1)} ppt, ${kind} (${salt.name}, ${salt.dist.toFixed(1)} mi)`);
    }
    if (flow) {
      const f = Math.round(flow.v), was = Math.round(flow.first);
      const state = f < 5 ? "little or no flow" : `flowing ${f} cfs` + (Math.abs(f - was) >= Math.max(10, was * 0.3) ? ` (${f > was ? "up" : "down"} from ${was} a day ago)` : "");
      parts.push(`🚰 ${flow.name}: ${state}`);
    }
    if (level) {   // canal level (gage height): the datum differs by site, so only the change over the last day is meaningful
      const d = level.v - level.first, dir = Math.abs(d) < 0.1 ? "steady" : d > 0 ? `rising ${d.toFixed(1)} ft` : `falling ${Math.abs(d).toFixed(1)} ft`;
      parts.push(`🌊 ${level.name}: canal level ${level.v.toFixed(2)} ft, ${dir} in a day${Math.abs(d) >= 0.1 ? " (a gate may have opened/closed)" : ""}`);
    }
    return parts.join("  ·  ") || null;
  }
  function spotWindPressure(s) {
    if (hasLoc(s) && miles(s.lat, s.lng, LAT, LNG) > 15) {
      const w = localWx(s);
      if (w.done && w.done !== "error") {
        const arrow = { rising: " ↗", falling: " ↘", steady: " →" }[w.done.trend] || "";
        return [w.done.wind + windKindText(s, w.done.deg), `${w.done.pressure.toFixed(2)} inHg${arrow}`].join("  ·  ");
      }
    }
    return [cond.wind && cond.wind + windKindText(s, degOf(cond.windDir)), pressureShort()].filter(Boolean).join("  ·  ");
  }
  // Onshore / offshore / cross wind for a spot that has a "water lies to the…" direction.
  // deg = where the wind blows FROM; faces = the direction of the water from the spot.
  const COMPASS16 = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
  const degOf = name => { const i = COMPASS16.indexOf(String(name || "").toUpperCase()); return i < 0 ? null : i * 22.5; };
  function windKind(deg, faces) {
    if (deg == null || faces == null) return null;
    const d = Math.abs(((deg - faces) % 360 + 540) % 360 - 180); // 0 = wind comes from the water side
    return d <= 50 ? "onshore" : d >= 130 ? "offshore" : "cross";
  }
  const KIND_ICON = { onshore: "⬅ onshore", offshore: "➡ offshore", cross: "↔ cross" };
  function windKindText(s, deg) { const k = typeof styleShowsWindKind === "function" && !styleShowsWindKind(s) ? null : windKind(deg, s.faces_deg); return k ? ` (${KIND_ICON[k]})` : ""; }
  function pressureShort() {
    if (cond.pressure == null) return null;
    const arrow = { rising: " ↗", falling: " ↘", steady: " →" }[cond.pressureTrend] || "";
    return `${cond.pressure.toFixed(2)} inHg${arrow}`;
  }


  // ---- Official public spots by area: public boat ramps + parks/piers where fishing is allowed (shared table official_spots) ----
  // The table covers South Florida, the Keys and the Gulf coast, so the app asks for one square at a time (about 35 miles wide, a "cell")
  // around where you are or where Find new water is looking, keeps each cell on this phone for a week, and merges the cells it has seen
  // into officialSpots. Used by Quick catch (names a new spot after the official place you're at) and by Find new water (✅ Official).
  let officialSpots = [];
  const OFFICIAL_KEY = "fm-official-v3", OFFICIAL_CELL = 0.5, OFFICIAL_AGE = 86400000,   // 1 day: places an admin adds reach everyone within a day
    OFFICIAL_MAX_CELLS = 10;
  const OFFICIAL_KINDS = { ramp: "ramp", pier: "pier", jetty: "jetty", bridge: "bridge", park: "dock", dock: "dock" };
  const OFFICIAL_LABEL = { ramp: "Boat ramp", pier: "Pier", jetty: "Jetty", bridge: "Bridge", dock: "Fishing spot", park: "Park · bank fishing" };
  const OFFICIAL_SOURCE = { "fwc-ramp": "Florida Fish & Wildlife (FWC) boat ramp list", "fl-fori": "Florida DEP outdoor recreation list" };
  const officialCells = {};       // "52,-163" -> { t: when it was loaded, items: [...] }
  const officialLoading = {};     // cells being fetched right now
  const officialCellKey = (lat, lng) => Math.floor(lat / OFFICIAL_CELL) + "," + Math.floor(lng / OFFICIAL_CELL);
  function officialCellsAround(c, dLat, dLng) {   // the cells that cover a box of dLat x dLng degrees around a place
    const keys = [];
    for (let i = Math.floor((c.lat - dLat) / OFFICIAL_CELL); i <= Math.floor((c.lat + dLat) / OFFICIAL_CELL); i++)
      for (let j = Math.floor((c.lng - dLng) / OFFICIAL_CELL); j <= Math.floor((c.lng + dLng) / OFFICIAL_CELL); j++) keys.push(i + "," + j);
    return keys;
  }
  function officialRebuild() {
    const seen = new Set(), all = [];
    Object.keys(officialCells).forEach(k => officialCells[k].items.forEach(o => { if (!seen.has(o.id)) { seen.add(o.id); all.push(o); } }));
    officialSpots = all;
  }
  function officialSave(c) {   // keep the cells nearest to where you are; the rest are dropped so the phone's storage stays small
    const keys = Object.keys(officialCells);
    if (keys.length > OFFICIAL_MAX_CELLS) {
      const mid = k => { const [i, j] = k.split(",").map(Number); return miles(c.lat, c.lng, (i + 0.5) * OFFICIAL_CELL, (j + 0.5) * OFFICIAL_CELL); };
      keys.sort((a, b) => mid(a) - mid(b)).slice(OFFICIAL_MAX_CELLS).forEach(k => delete officialCells[k]);
      officialRebuild();
    }
    try { localStorage.setItem(OFFICIAL_KEY, JSON.stringify({ cells: officialCells })); } catch (e) { /* storage full: fine, it is fetched again next time */ }
  }
  async function officialLoadCell(key) {   // true = new data arrived
    const have = officialCells[key];
    if (have && Date.now() - have.t < OFFICIAL_AGE) return false;
    if (officialLoading[key]) return officialLoading[key];
    const [i, j] = key.split(",").map(Number), C = OFFICIAL_CELL;
    officialLoading[key] = (async () => {
      try {
        const { data, error } = await db.from("official_spots").select("id,source,source_id,name,kind,lat,lng,water_type,county,details")
          .gte("lat", i * C).lt("lat", (i + 1) * C).gte("lng", j * C).lt("lng", (j + 1) * C).limit(1000);
        if (error) throw error;
        officialCells[key] = { t: Date.now(), items: data || [] };
        return true;
      } catch (e) { return false; /* offline: an older copy on this phone is still used */ }
      finally { delete officialLoading[key]; }
    })();
    return officialLoading[key];
  }
  // Load the official spots around a place (default: where Find new water is looking). Resolves true when new spots arrived.
  async function loadOfficialSpots(c, dLat, dLng) {
    c = c || (typeof suggCenter === "function" ? suggCenter() : { lat: LAT, lng: LNG });
    const res = await Promise.all(officialCellsAround(c, dLat || 0.3, dLng || 0.35).map(officialLoadCell));
    const changed = res.some(Boolean);
    if (changed) {
      officialRebuild(); officialSave(c);
      if (typeof renderSuggestions === "function" && $("sugg-list")) renderSuggestions();
    }
    return changed;
  }
  // Quick catch: make sure the square you are standing in is loaded (a tiny box, so usually one cell)
  const officialEnsure = pos => loadOfficialSpots(pos, 0.01, 0.01);
  // The closest official spot to a place, if one is within maxMi (default ~400 ft)
  function officialNear(pos, maxMi) {
    const lim = maxMi || 0.08;
    let best = null;
    (officialSpots || []).forEach(o => {
      const d = miles(pos.lat, pos.lng, o.lat, o.lng);
      if (d <= lim && (!best || d < best.d)) best = { o, d };
    });
    return best;
  }
  // Official spots as Find new water suggestions (same shape as the OpenStreetMap ones, trust "official")
  function officialSuggestions() {
    return (officialSpots || []).map(o => {
      const d = o.details || {};
      return { key: "official/" + o.id, name: o.name, kind: OFFICIAL_KINDS[o.kind] || "dock",
        label: /hand/i.test(d.type || "") ? "Hand launch (kayak)" : OFFICIAL_LABEL[o.kind] || "Fishing spot",
        trust: "official", src: o.source, water: o.water_type || null, county: o.county || null, info: d, lat: o.lat, lng: o.lng };
    });
  }
  // A short facts line for an official spot: lanes, fee, hours, water body, who runs it
  function officialFacts(g) {
    const d = g.info || {}, bits = [];
    if (d.lanes) bits.push(d.lanes + (d.lanes === 1 ? " lane" : " lanes"));
    if (d.fee) bits.push(/^y/i.test(d.fee) ? "Fee" : /^n/i.test(d.fee) ? "No fee" : "Fee: " + d.fee);
    if (d.hours) bits.push(d.hours);
    if (d.water) bits.push(d.water);
    if (g.county) bits.push(g.county.charAt(0) + g.county.slice(1).toLowerCase() + " County");
    if (d.owner) bits.push("run by " + d.owner);
    return bits.join(" · ");
  }
  (function officialRestore() {   // what this phone already knows (older copies are used until fresh ones arrive)
    try {
      localStorage.removeItem("fm-official-v1"); localStorage.removeItem("fm-official-v2");
      const c = JSON.parse(localStorage.getItem(OFFICIAL_KEY) || "null");
      if (c && c.cells) Object.keys(c.cells).forEach(k => { const v = c.cells[k]; if (v && Array.isArray(v.items) && isFinite(v.t)) officialCells[k] = v; });
    } catch (e) {}
    officialRebuild();
  })();

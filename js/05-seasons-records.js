  // ---- Seasons calendar: researched for Southeast Florida (Oct 8, 2026; rules checked against FWC that day) ----
  // shore / boat: 12 numbers, Jan..Dec — 0 slow, 1 decent, 2 peak. Our spots are all shore spots, so "shore" drives scoring.
  // spawn: { m: months 1–12, away: adults leave shore spots to spawn, gather: they bunch up at shore-reachable places, where }
  // temp: water °F — low/high = comfortable feeding range, cold = shuts down / at risk below this.
  // closed: yearly closed windows ["MM-DD","MM-DD"] (may wrap past New Year).
  // openOnly: the ONLY open windows; with a year ("2026-10-09") they apply to that year only.
  // match: words that count a logged catch as this fish.
  const SEASON_GROUPS = [["inshore", "Inshore"], ["beach", "Beach & pier"], ["offshore", "Offshore"], ["fresh", "Freshwater"]];
  const SEASONS = [
    // ---- Inshore ----
    { name: "Snook", group: "inshore", match: ["snook"],
      shore: [1,1,1,1,2,2,2,2,2,2,2,1], boat: [1,1,1,1,2,2,2,2,2,2,2,1],
      spawn: { m: [5,6,7,8,9], gather: true, where: "inlets and the beaches beside them, peaking Jun–Aug around full and new moons" },
      temp: { low: 68, high: 90, cold: 60 },
      closed: [["12-15", "01-31"], ["06-01", "08-31"]],
      rule: "Harvest 1 per day, 28–32\" slot, snook permit needed. Catch-and-release is fine while closed.",
      tip: "Summer: inlet mouths, beaches and lit bridges at night on the outgoing tide. Fall: they follow the mullet run. Winter: deep, warm canals after a front." },
    { name: "Tarpon", group: "inshore", match: ["tarpon"],
      shore: [0,0,1,2,2,2,1,1,1,2,1,0], boat: [1,1,1,2,2,2,2,1,1,2,1,1],
      spawn: { m: [5,6,7], away: true, where: "offshore around the full and new moons (the spring migration passes the beaches and inlets on the way)" },
      temp: { low: 75, high: 92, cold: 65 },
      rule: "Catch-and-release only (keeping one needs a $50 tag). Big fish stay in the water.",
      tip: "Spring migration along the beaches and past the inlets; best at night at lit bridges and inlets on a moving tide. Small ones live in warm canals all year." },
    { name: "Redfish (red drum)", group: "inshore", match: ["redfish", "red drum"],
      shore: [1,1,0,0,0,0,0,1,1,2,2,1], boat: [1,0,0,0,0,0,1,1,2,2,1,1],
      spawn: { m: [8,9,10,11], gather: true, where: "inlet mouths and nearshore water" },
      temp: { low: 65, high: 88, cold: 55 },
      rule: "Southeast region: open all year, 1 per person (2 per boat), 18–27\" slot.",
      tip: "Scarce this far south — Lake Worth Lagoon and northern Biscayne Bay mangrove edges on a rising tide, best in fall." },
    { name: "Spotted seatrout", group: "inshore", match: ["seatrout", "speckled trout", "trout"],
      shore: [1,1,1,1,1,1,1,1,1,1,1,1], boat: [1,1,1,2,2,2,2,2,1,1,1,1],
      spawn: { m: [4,5,6,7,8,9,10], where: "on the seagrass flats where they live — they don't leave" },
      temp: { low: 65, high: 85, cold: 55 },
      rule: "Southeast region: open all year, 3 per person, 15–19\" slot (one over 19\" per boat; per person from shore). New rules from April 2026.",
      tip: "Needs seagrass — Lake Worth Lagoon and Biscayne Bay, not Pompano. Grass edges at first light on a moving tide; deep, dark basins in winter." },
    { name: "Jack crevalle", group: "inshore", match: ["jack"], sightMatch: ["crevalle"],
      shore: [1,1,2,2,2,2,2,2,2,2,2,1], boat: [1,1,2,2,2,2,2,2,2,2,2,1],
      spawn: { m: [3,4,5,6,7,8,9], away: true, where: "offshore (plenty stay around the inlets)" },
      temp: { low: 68, high: 90, cold: 58 },
      rule: "No closed season.", tip: "Watch for birds and bait getting pushed at inlets, piers and beaches; first light on a strong tide. Big ones come with the mullet run." },
    { name: "Mangrove snapper", group: "inshore", match: ["mangrove", "gray snapper"],
      shore: [1,1,1,1,1,0,0,1,2,2,2,2], boat: [1,1,1,1,1,2,2,2,2,2,1,1],
      spawn: { m: [6,7,8], away: true, where: "on offshore reefs around the full moon (peak Jun–Jul)" },
      temp: { low: 72, high: 88, cold: 60 },
      rule: "Open all year.", tip: "Fall and winter at night around lit docks, bridges and the inlet with live shrimp on light fluorocarbon. Summer is mostly small ones inshore." },
    { name: "Ladyfish", group: "inshore", match: ["ladyfish"],
      shore: [1,1,1,2,2,2,2,2,2,2,1,1], boat: [1,1,1,1,2,2,2,2,2,1,1,1],
      spawn: { m: [5,6,7,8,9], away: true, where: "offshore" },
      temp: { low: 65, high: 90, cold: 55 },
      rule: "Open all year.", tip: "Small white jigs or gold spoons around lit docks, bridges and inlets on a moving tide — great fun, poor eating." },
    { name: "Black drum", group: "inshore", match: ["black drum"],
      shore: [1,1,1,0,0,0,0,0,0,0,0,1], boat: [1,1,1,0,0,0,0,0,0,0,0,1],
      spawn: { m: [12,1,2,3], gather: true, where: "inlets and nearshore — big fish bunch up there" },
      temp: { low: 60, high: 82, cold: 50 },
      rule: "Open all year — check FWC for slot and bag.", tip: "Winter nights: shrimp or crab on the bottom by bridges and inlet edges; more common in Lake Worth Lagoon and north." },
    { name: "Goliath grouper", group: "inshore", match: ["goliath"],
      shore: [1,1,1,1,1,1,0,0,0,1,1,1], boat: [1,1,1,1,1,1,2,2,2,2,1,1],
      spawn: { m: [7,8,9,10], away: true, where: "offshore reefs and wrecks around the full moon" },
      temp: { low: 70, high: 88, cold: 55 },
      rule: "Catch-and-release (harvest only by a special FWC lottery permit). Keep it in the water.",
      tip: "Bridge pilings, inlets and docks; heavy tackle so the fight is short, and release it without lifting it out." },
    { name: "Gulf toadfish", group: "inshore", match: ["toadfish"],
      shore: [1,1,1,1,1,1,1,1,1,1,1,1], boat: [1,1,1,1,1,1,1,1,1,1,1,1],
      spawn: { m: [3,4,5,6,9,10,11], where: "nests in holes and debris right where they live" },
      temp: { low: 65, high: 90, cold: 55 },
      rule: "No limits.", tip: "Bycatch around rocks and seawalls — it bites and has spines, so unhook it with pliers." },
    // ---- Beach & pier ----
    { name: "Fall mullet run", group: "beach", match: ["mullet"],
      shore: [1,0,0,0,0,0,1,1,2,2,2,1], boat: [0,0,0,0,0,0,0,0,1,1,1,0],
      spawn: { m: [10,11,12,1], away: true, gather: true, where: "offshore — the schools pour out of the canals and down the beach and inlets to get there" },
      temp: { low: 68, high: 84, cold: 60 },
      rule: "Mullet: open all year.", tip: "The first real cold front in Oct–Nov pushes the schools down the beach; snook, tarpon, jacks, bluefish and Spanish mackerel follow them." },
    { name: "Florida pompano", group: "beach", match: ["pompano"],
      shore: [2,2,2,1,0,0,0,0,0,1,2,2], boat: [1,1,1,1,0,0,0,0,0,0,1,1],
      spawn: { m: [3,4,5,6,7,8,9], away: true, where: "offshore in deeper water" },
      temp: { low: 68, high: 80, cold: 64 },
      rule: "Open all year.", tip: "Cold months, from the first cool snap until the water passes ~75°F. Onshore wind and a little surf; fish the troughs and runouts, mid-pier over the bars." },
    { name: "Spanish mackerel", group: "beach", match: ["spanish"],
      shore: [2,2,2,1,0,0,0,0,0,0,1,2], boat: [2,2,2,1,1,0,0,0,0,0,1,2],
      spawn: { m: [4,5,6,7,8,9], away: true, where: "offshore, mostly farther north" },
      temp: { low: 68, high: 82, cold: 62 },
      rule: "Open all year.", tip: "Arrive when the water drops below ~70°F; inlets, jetties and piers on clear days after a front — small spoons, fast." },
    { name: "Bluefish", group: "beach", match: ["bluefish"],
      shore: [1,1,1,0,0,0,0,0,0,0,0,1], boat: [1,1,1,0,0,0,0,0,0,0,0,1],
      spawn: { m: [3,4], away: true, where: "offshore, far north of here" },
      temp: { low: 60, high: 75, cold: 58 },
      rule: "Open all year.", tip: "A bonus in cold snaps, mostly Palm Beach and north; use wire or heavy leader." },
    { name: "Sheepshead", group: "beach", match: ["sheepshead"],
      shore: [2,2,2,1,1,0,0,0,0,1,1,2], boat: [1,2,2,1,1,0,0,0,0,0,1,1],
      spawn: { m: [2,3,4], away: true, gather: true, where: "offshore — big fish bunch up at jetties, bridges and inlets first, then leave for a few weeks" },
      temp: { low: 55, high: 80, cold: 52 },
      rule: "Open all year — check FWC for size and bag.", tip: "Barnacled pilings, bridges and jetties Dec–Mar with fiddler crab or shrimp; feel for the tap." },
    { name: "Whiting", group: "beach", match: ["whiting", "kingcroaker"],
      shore: [2,2,2,2,1,1,0,0,1,1,2,2], boat: [2,2,2,2,1,1,0,0,1,1,2,2],
      spawn: { m: [3,4,5,6,7,8,9,10], where: "just off the beaches — they don't leave" },
      temp: { low: 62, high: 80, cold: 58 },
      rule: "Open all year.", tip: "Shrimp or sand fleas on the bottom in the first trough, Nov–Apr; a little surf beats flat calm." },
    { name: "Great barracuda", group: "beach", match: ["barracuda"],
      shore: [2,2,2,1,1,1,1,1,1,1,2,2], boat: [2,2,2,1,1,1,1,1,1,1,2,2],
      spawn: { m: [4,5,6,7,8,9], away: true, where: "offshore reefs" },
      temp: { low: 70, high: 88, cold: 62 },
      rule: "Has bag and size limits in Southeast Florida — check FWC.", tip: "Winter brings big ones to the beach, piers and clear inlets; wire leader, fast lures. Don't eat big ones (ciguatera)." },
    { name: "Permit", group: "beach", match: ["permit"],
      shore: [1,1,1,1,1,0,0,1,1,1,1,1], boat: [2,2,2,2,2,2,2,1,1,1,1,2],
      spawn: { m: [5,6,7,8,9], away: true, where: "offshore wrecks and reefs around full and new moons" },
      temp: { low: 72, high: 88, cold: 62 },
      rule: "Special rules in South Florida — check FWC.", tip: "Live crab or sand flea in clear surf near an inlet on a rising tide." },
    { name: "Grunts", group: "beach", match: ["grunt"],
      shore: [1,1,1,2,2,2,2,2,2,2,1,1], boat: [1,1,2,2,2,2,2,2,2,2,1,1],
      spawn: { m: [4,5,6,7,8,9], where: "on the reefs; smaller fish stay on inshore structure" },
      temp: { low: 70, high: 86, cold: 64 },
      rule: "Check FWC for size and bag.", tip: "Shrimp near docks, bridges and jetties in the evening, spring through fall; a cold front shuts them off for a few days." },
    { name: "Porgy", group: "beach", match: ["porgy"],
      shore: [2,2,1,1,1,0,0,0,1,1,2,2], boat: [2,2,2,1,1,1,1,1,1,1,2,2],
      spawn: { m: [1,2,3,4,5], away: true, where: "offshore reefs" },
      temp: { low: 65, high: 82, cold: 60 },
      rule: "Check FWC for size and bag.", tip: "A cooler-month bonus at deep jetty and inlet edges; shrimp or crab on the bottom." },
    { name: "Gray triggerfish", group: "beach", match: ["triggerfish"],
      shore: [0,0,0,0,0,1,1,1,1,1,0,0], boat: [2,2,2,2,1,1,1,1,1,1,2,2],
      spawn: { m: [6,7,8], away: true, where: "nests on offshore hard bottom" },
      temp: { low: 68, high: 84, cold: 62 },
      rule: "Check FWC for size and bag.", tip: "Mostly a boat fish; from shore try a small hook and shrimp at deep pier ends and jetties." },
    // ---- Offshore (a few reach the long ocean piers) ----
    { name: "Sailfish", group: "offshore", match: ["sailfish"],
      shore: [1,1,1,0,0,0,0,0,0,0,1,1], boat: [2,2,2,1,0,0,0,0,0,1,2,2],
      spawn: { m: [5,6,7,8,9,10], where: "far offshore in the Gulf Stream" },
      temp: { low: 70, high: 84, cold: 66 },
      rule: "Catch-and-release is the norm (federal HMS permit needed to keep one).",
      tip: "Nov–Mar, a day or two after a cold front with north wind; the occasional one is kite-fished off the ocean piers." },
    { name: "Kingfish (king mackerel)", group: "offshore", match: ["kingfish", "king mackerel"],
      shore: [2,2,2,1,1,0,0,0,1,2,2,2], boat: [2,2,2,2,1,1,0,1,1,2,2,2],
      spawn: { m: [5,6,7,8,9], away: true, where: "offshore over the shelf in summer" },
      temp: { low: 68, high: 82, cold: 64 },
      rule: "Open all year.", tip: "Live bait off the long ocean piers (Pompano, Deerfield, Lake Worth, Juno) late fall to spring, first clean-water morning after a front." },
    { name: "Mahi (dolphin)", group: "offshore", match: ["mahi", "dolphin", "dolphinfish"],
      shore: [0,0,0,1,1,1,1,0,0,0,0,0], boat: [1,1,2,2,2,2,1,1,1,2,1,1],
      spawn: { m: [3,4,5,6,7,8,9,10], where: "out in the Gulf Stream, many times a season" },
      temp: { low: 72, high: 84, cold: 68 },
      rule: "Open all year.", tip: "Weed lines and debris near blue water — check the 🟢 water clarity map; east winds sometimes bring small ones to the pier ends." },
    { name: "Wahoo", group: "offshore", match: ["wahoo"],
      shore: [0,0,0,0,0,0,0,0,0,0,0,0], boat: [2,2,2,1,0,0,0,0,0,1,2,2],
      spawn: { m: [5,6,7,8,9], where: "offshore" },
      temp: { low: 72, high: 82, cold: 68 },
      rule: "Open all year.", tip: "A winter boat fish on the 120–300 ft drop-offs, best around full and new moons at first and last light." },
    { name: "Cobia", group: "offshore", match: ["cobia"],
      shore: [1,1,2,2,1,0,0,0,0,0,1,1], boat: [2,2,2,2,1,1,0,0,0,1,1,2],
      spawn: { m: [4,5,6,7,8], away: true, where: "mostly farther north as they migrate" },
      temp: { low: 68, high: 84, cold: 64 },
      rule: "Check FWC for size and bag.", tip: "Winter–spring: watch the pier ends for rays and turtles with brown shapes following; keep a jig or live eel ready." },
    { name: "Black & red grouper", group: "offshore", match: ["black grouper", "red grouper", "scamp", "hind", "coney", "graysby"],
      shore: [0,0,0,0,0,0,0,0,0,0,0,0], boat: [1,1,1,1,2,2,2,2,2,2,2,1],
      spawn: { m: [1,2,3,4], away: true, where: "deep ledges and reef edges around the full moon" },
      temp: { low: 68, high: 82, cold: 60 },
      closed: [["01-01", "04-30"]],
      rule: "Atlantic: closed Jan 1–Apr 30 (also scamp, hinds, coney, graysby). Goliath and Nassau: no harvest.",
      tip: "A boat fish on deeper ledges and wrecks; best right after it opens in May and again in late fall." },
    { name: "Gag grouper", group: "offshore", match: ["gag"],
      shore: [0,0,0,0,0,0,0,0,0,0,0,0], boat: [1,1,1,1,2,2,2,2,2,2,2,1],
      spawn: { m: [12,1,2,3,4], away: true, where: "deep shelf-edge ledges, peak Feb–Mar" },
      temp: { low: 64, high: 80, cold: 58 },
      openOnly: [["05-01", "08-01"]],
      rule: "Atlantic 2026: open May 1–Aug 1 only. Dates change most years — check FWC.",
      tip: "Offshore ledges and wrecks; the odd small one at an inlet or dock is usually undersized." },
    { name: "Red snapper", group: "offshore", match: ["red snapper"],
      shore: [0,0,0,0,0,0,0,0,0,0,0,0], boat: [0,0,0,0,0,0,0,0,0,2,0,0], // only worth targeting in its short open season
      spawn: { m: [6,7,8,9,10], where: "deep offshore bottom" },
      temp: { low: 60, high: 80, cold: 56 },
      openOnly: [["2026-10-09", "2026-10-22"]],
      rule: "Atlantic 2026: open Oct 9–22 only, 1 per person, and you must declare your trip first. Release with a descending device the rest of the year.",
      tip: "Deep wrecks and ledges, more common north of Palm Beach — never a shore fish here." },
    { name: "Mutton snapper", group: "offshore", match: ["mutton"],
      shore: [0,0,1,1,1,0,0,0,1,1,1,0], boat: [1,1,2,2,2,1,1,2,2,2,2,1],
      spawn: { m: [5,6,7], away: true, where: "on outer reef edges around the full moon" },
      temp: { low: 70, high: 86, cold: 64 },
      rule: "Open all year, 5 per person (within 10 snapper total), 18\" minimum.",
      tip: "From shore: inlet and pier edges at night in spring and fall with live shrimp or pinfish — not during the May–July spawn." },
    { name: "Yellowtail snapper", group: "offshore", match: ["yellowtail"],
      shore: [0,0,0,1,1,1,2,2,2,1,1,0], boat: [2,2,2,2,2,2,1,1,2,2,2,2],
      spawn: { m: [5,6,7,8,9], where: "on the reef tract — they don't migrate" },
      temp: { low: 68, high: 86, cold: 64 },
      rule: "Open all year.", tip: "Chum, light line and clean blue water; the Pompano and Deerfield pier ends are the best shore bet summer into fall." },
    { name: "Lane snapper", group: "offshore", match: ["lane snapper"],
      shore: [0,0,0,1,1,1,1,1,1,1,0,0], boat: [1,1,2,2,2,2,2,2,2,1,1,1],
      spawn: { m: [4,5,6,7,8,9], away: true, where: "offshore hard bottom" },
      temp: { low: 70, high: 86, cold: 62 },
      rule: "Open all year — check FWC for size.", tip: "Mostly a boat fish; from shore, the far end of the long piers with small hooks and shrimp." },
    // ---- Freshwater ----
    { name: "Largemouth bass", group: "fresh", match: ["largemouth", "bass"], sightMatch: ["largemouth"],
      shore: [2,2,2,1,1,0,0,0,1,1,1,2], boat: [2,2,2,1,1,1,1,1,1,1,1,2],
      spawn: { m: [12,1,2,3,4], gather: true, where: "beds in 1–4 ft on hard bottom along banks and canal bends, around full and new moons" },
      temp: { low: 60, high: 88, cold: 55 },
      rule: "Open all year.", tip: "Dec–Mar on shallow banks and bends while they bed; in summer, shade, bridge shadows and flowing culverts at dawn and dusk." },
    { name: "Peacock bass", group: "fresh", match: ["peacock"],
      shore: [0,0,0,1,2,2,2,2,2,1,1,0], boat: [0,0,1,1,2,2,2,2,2,2,1,0],
      spawn: { m: [4,5,6,7,8,9], gather: true, where: "nests on hard bottom along shady banks; pairs guard them (peak May–Jun)" },
      temp: { low: 72, high: 92, cold: 66 },
      rule: "2 per day, only 1 over 17\" — check FWC.", tip: "Daytime sight-feeders: shaded bridges, culverts and canal bends in the afternoon sun. Stay home after a winter cold snap." },
    { name: "Bullseye snakehead", group: "fresh", match: ["snakehead"],
      shore: [0,0,1,2,2,2,2,2,1,1,1,0], boat: [0,0,1,2,2,2,2,2,2,1,1,0],
      spawn: { m: [3,4,5,8], gather: true, where: "shallow, weedy canal edges — parents herd the fry and strike anything near them" },
      temp: { low: 68, high: 92, cold: 60 },
      rule: "Invasive: no limit. Never release one alive and never move them — it's illegal.",
      tip: "Weedless frogs and plastics along weedy, shaded banks spring to fall; watch for them gulping air." },
    { name: "Bluegill & panfish", group: "fresh", match: ["bluegill", "panfish", "sunfish", "shellcracker"],
      shore: [1,1,2,2,2,2,2,2,2,2,1,1], boat: [1,1,2,2,2,2,2,2,2,1,1,1],
      spawn: { m: [3,4,5,6,7,8,9], gather: true, where: "clusters of round beds in 1–3 ft, peaking around full and new moons" },
      temp: { low: 62, high: 90, cold: 55 },
      rule: "Open all year.", tip: "Look for pale round beds in the shallows and drop a worm or cricket right on them." },
    { name: "Mayan cichlid", group: "fresh", match: ["mayan", "cichlid"],
      shore: [0,0,1,2,2,2,2,2,2,1,1,0], boat: [0,0,1,2,2,2,2,2,2,1,1,0],
      spawn: { m: [4,5,6,7,8], gather: true, where: "nests in shallow pockets along banks; both parents guard" },
      temp: { low: 70, high: 92, cold: 62 },
      rule: "Invasive: no limit — keep them.", tip: "Small jigs or shrimp to shallow banks and culvert mouths, Apr–Sep; fish the sunny banks after a front." },
    { name: "Clown knifefish", group: "fresh", match: ["knifefish"],
      shore: [0,0,1,1,1,1,1,1,1,1,0,0], boat: [0,0,1,1,1,1,1,1,1,1,0,0],
      spawn: { m: [3,4,5,6], where: "eggs on wood or bottom near shore, guarded by the male" },
      temp: { low: 70, high: 92, cold: 62 },
      rule: "Invasive: don't release alive — check FWC.", tip: "Only around Lakes Osborne and Ida (Lake Worth) — small baits by docks and overhanging brush in warm months." }
  ];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // How good a month (0–11) is from shore — all our spots are shore spots
  const shoreLevel = (f, m) => f.shore[m];
  const spawningIn = (f, m) => !!(f.spawn && f.spawn.m.includes(m + 1));
  // One line about spawning this month, or ""
  function spawnText(f, m) {
    if (!spawningIn(f, m)) return "";
    const s = f.spawn;
    if (s.away && shoreLevel(f, m) === 0) return `🥚 Spawning ${s.where} — rarely around shore spots now`;
    if (s.gather) return `🥚 Spawning — ${s.where}`;
    if (s.away && shoreLevel(f, m) === 1) return `🥚 Spawning ${s.where}; fewer big ones around shore spots`;
    return `🥚 Spawning ${s.where}`;
  }
  // Which Seasons fish a logged species is — the most specific name wins ("peacock bass" → Peacock bass, not Largemouth)
  function seasonFor(species) {
    let best = null, bestLen = 0;
    SEASONS.forEach(f => f.match.forEach(w => {
      if (w.length > bestLen && new RegExp(`\\b${w}(s|es)?\\b`, "i").test(species || "")) { best = f; bestLen = w.length; }
    }));
    return best;
  }
  // Water temperature vs. what this fish likes: { pen (0 to −0.5), text }
  function tempFit(f, t) {
    if (t == null || !f.temp) return { pen: 0, text: "" };
    const r = Math.round(t);
    if (t < f.temp.cold) return { pen: -0.5, text: `🥶 ${r}°F water — too cold for ${f.name} (they shut down below ~${f.temp.cold}°F)` };
    if (t < f.temp.low) return { pen: -0.25, text: `🌡 ${r}°F water — on the cool side for ${f.name}` };
    if (t > f.temp.high) return { pen: -0.25, text: `🌡 ${r}°F water — very warm for ${f.name}; they go deeper or quiet down` };
    return { pen: 0, text: "" };
  }
  let seaMonth = new Date().getMonth(), seaGroup = "";

  const mmdd = d => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const inWindow = (key, [a, b]) => a <= b ? key >= a && key <= b : key >= a || key <= b;
  // Is this fish open to keep on this date? true / false / null (rules for that year unknown)
  function seasonOpen(f, d) {
    if (f.openOnly) {
      const dated = f.openOnly.filter(w => w[0].length > 5);
      if (dated.length) {
        const ymd = `${d.getFullYear()}-${mmdd(d)}`;
        if (!dated.some(w => w[0].slice(0, 4) === String(d.getFullYear()))) return null;
        return dated.some(([a, b]) => ymd >= a && ymd <= b);
      }
      return f.openOnly.some(w => inWindow(mmdd(d), w));
    }
    if (f.closed) return !f.closed.some(w => inWindow(mmdd(d), w));
    return true;
  }
  // Closed nearly all month (open under a week)? Used to strike through months on the little calendar.
  function monthClosed(f, m, year) {
    let open = 0, closed = 0, days = new Date(year, m + 1, 0).getDate();
    for (let i = 1; i <= days; i++) { const o = seasonOpen(f, new Date(year, m, i)); if (o === true) open++; else if (o === false) closed++; }
    return closed > 0 && open < 7;
  }
  const nice = d => d.toLocaleDateString([], { month: "short", day: "numeric" });

  // Openings and closings in the next 45 days
  function seasonAlerts(today) {
    const out = [];
    SEASONS.forEach(f => {
      if (!f.closed && !f.openOnly) return;
      let prev = seasonOpen(f, today);
      if (prev === null) return;
      for (let i = 1; i <= 45; i++) {
        const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
        const now = seasonOpen(f, d);
        if (now !== null && now !== prev) {
          out.push({ f, d, opens: now, days: i });
          break;
        }
        prev = now;
      }
    });
    return out.sort((a, b) => a.days - b.days);
  }

  // How many fish of this kind the group logged in a month (any year)
  function groupCount(f, m) {
    return Object.values(catchesBySpot).flat()
      .filter(c => seasonFor(c.species) === f && new Date(c.caught_at).getMonth() === m)
      .reduce((n, c) => n + (c.how_many || 1), 0);
  }


  function renderSeasons() {
    if ($("view-seasons").hidden) return;
    const today = new Date(), thisMonth = seaMonth === today.getMonth();
    const year = today.getFullYear() + (seaMonth < today.getMonth() - 1 ? 1 : 0); // looking ahead past December
    const ref = thisMonth ? today : new Date(year, seaMonth, 15);
    $("sea-month").textContent = new Date(year, seaMonth, 1).toLocaleDateString([], { month: "long", year: "numeric" });
    $("sea-sub").textContent = thisMonth ? "This month" : "Rules shown for mid-month";
    const gb = $("sea-groups"); gb.innerHTML = "";
    [["", "All"], ...SEASON_GROUPS].forEach(([k, label]) => {
      const b = document.createElement("button"); b.type = "button"; b.textContent = label;
      b.classList.toggle("on", seaGroup === k);
      b.addEventListener("click", () => { seaGroup = k; renderSeasons(); });
      gb.appendChild(b);
    });

    // Coming up (only for the real current month)
    const alerts = thisMonth ? seasonAlerts(today).filter(a => !seaGroup || a.f.group === seaGroup) : [];
    $("sea-alerts-card").hidden = !alerts.length;
    const al = $("sea-alerts"); al.innerHTML = "";
    alerts.forEach(a => {
      const div = document.createElement("div"); div.className = "sea-alert";
      div.textContent = `${a.opens ? "🟢" : "⛔"} ${a.f.name} ${a.opens ? "opens" : "closes"} ${nice(a.d)} — in ${a.days} day${a.days === 1 ? "" : "s"}`;
      al.appendChild(div);
    });

    const list = SEASONS.filter(f => !seaGroup || f.group === seaGroup)
      .map((f, i) => ({ f, i, lvl: shoreLevel(f, seaMonth), open: seasonOpen(f, ref) }))
      .sort((a, b) => (b.lvl - a.lvl) || (a.i - b.i));
    $("sea-list-title").textContent = `What's biting in ${MONTHS[seaMonth]}`;
    const box = $("sea-list"); box.innerHTML = "";
    list.forEach(({ f, lvl, open }) => {
      const div = document.createElement("div"); div.className = "sea-fish";
      const top = document.createElement("div"); top.className = "sea-top";
      const name = document.createElement("span"); name.className = "sea-name"; name.textContent = f.name;
      const badges = document.createElement("span"); badges.style.cssText = "display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end";
      const badge = (cls, text) => { const b = document.createElement("span"); b.className = "sea-badge " + cls; b.textContent = text; badges.appendChild(b); };
      if (open === false) badge("closed", "⛔ Closed to keep");
      badge(["slow", "good", "peak"][lvl], (["Slow", "Good", "🔥 Peak"][lvl]) + " from shore");
      top.append(name, badges);
      const strip = (arr, label) => {
        const row = document.createElement("div"); row.className = "sea-strip";
        const lab = document.createElement("span"); lab.className = "sea-strip-label"; lab.textContent = label;
        const months = document.createElement("div"); months.className = "sea-months";
        MONTHS.forEach((m, i) => {
          const sp = document.createElement("span"); sp.textContent = m[0];
          if (arr[i]) sp.classList.add("l" + arr[i]);
          if (monthClosed(f, i, i < today.getMonth() - 1 ? today.getFullYear() + 1 : today.getFullYear())) { sp.classList.add("x"); sp.title = "Mostly closed to keep"; }
          if (spawningIn(f, i)) sp.classList.add("egg");
          if (i === seaMonth) sp.classList.add("cur");
          months.appendChild(sp);
        });
        row.append(lab, months);
        return row;
      };
      const tip = document.createElement("div"); tip.className = "sea-rule"; tip.textContent = f.tip;
      const spawnNote = document.createElement("div"); spawnNote.className = "sea-rule"; spawnNote.textContent = spawnText(f, seaMonth);
      const rule = document.createElement("div"); rule.className = "spot-meta"; rule.textContent = "📏 " + f.rule;
      div.append(top, strip(f.shore, "Shore"), strip(f.boat, "Boat"), tip);
      if (spawnNote.textContent) div.appendChild(spawnNote);
      if (thisMonth && f.group !== "fresh") {
        const w = waterTempNow(LAT, LNG);
        const fit = tempFit(f, w.done && w.done !== "error" ? w.done.f : null);
        if (fit.text) { const tn = document.createElement("div"); tn.className = "sea-rule"; tn.textContent = fit.text + " (Pompano area today)"; div.appendChild(tn); }
      }
      div.appendChild(rule);
      const n = groupCount(f, seaMonth);
      if (n) { const g = document.createElement("div"); g.className = "spot-meta"; g.textContent = `🎣 Your group has logged ${n} in ${MONTHS[seaMonth]}`; div.appendChild(g); }
      const seen = thisMonth ? sightCountFor(f) : 0;
      if (seen) { const g = document.createElement("div"); g.className = "spot-meta"; g.textContent = `👀 Seen ${seen} time${seen === 1 ? "" : "s"} near your spots in the last ${SIGHT_DAYS} days (public iNaturalist photos)`; div.appendChild(g); }
      box.appendChild(div);
    });
  }
  $("sea-prev").addEventListener("click", () => { seaMonth = (seaMonth + 11) % 12; renderSeasons(); });
  $("sea-next").addEventListener("click", () => { seaMonth = (seaMonth + 1) % 12; renderSeasons(); });

  // ---- Public sightings: recent iNaturalist photos of game fish near your spots (free, no account) ----
  // Only "research grade" observations (identity agreed by other iNaturalist users) with exact locations.
  const SIGHT_DAYS = 60, SIGHT_NEAR_MI = 5, SIGHT_CACHE = "fm-sightings", SIGHT_TTL = 6 * 3600 * 1000;
  const EXTRA_GAME = ["barracuda", "permit", "ladyfish", "grunt", "porgy", "triggerfish", "drum", "cobia", "bonefish", "hogfish",
    "snapper", "grouper", "mackerel", "shark", "tilapia", "oscar", "knifefish", "bowfin", "gar", "crappie", "catfish", "sea bass"];
  const FRESH_ONLY = ["largemouth", "peacock", "snakehead", "bluegill", "shellcracker", "redear", "mayan", "cichlid", "tilapia",
    "oscar", "knifefish", "bowfin", "gar", "crappie", "panfish"];
  // Whole-word match, so "jack" finds "Bar Jack" but not "Jackknife-fish"
  const hasWord = (name, words) => words.some(w => new RegExp(`\\b${w}(s|es)?\\b`, "i").test(name));
  const isGameFish = name => SEASONS.some(f => hasWord(name, f.match)) || hasWord(name, EXTRA_GAME);
  let sightings = null, sightLayer = null, sightOn = false, sightErr = null;

  // Group spots that are close together so one request covers each area
  function sightAreas() {
    const pts = (spots || []).filter(hasLoc);
    if (!pts.length) return [{ lat: LAT, lng: LNG, km: 15 }];
    const areas = [];
    pts.forEach(p => {
      const a = areas.find(a => miles(a.lat, a.lng, p.lat, p.lng) < 20);
      if (a) a.pts.push(p); else areas.push({ lat: p.lat, lng: p.lng, pts: [p] });
    });
    return areas.map(a => {
      const lat = a.pts.reduce((n, p) => n + p.lat, 0) / a.pts.length, lng = a.pts.reduce((n, p) => n + p.lng, 0) / a.pts.length;
      const far = Math.max(...a.pts.map(p => miles(lat, lng, p.lat, p.lng)));
      return { lat: +lat.toFixed(3), lng: +lng.toFixed(3), km: Math.min(60, Math.ceil((far + SIGHT_NEAR_MI + 1) * 1.609)) };
    });
  }

  async function loadSightings(force) {
    const areas = sightAreas(), key = JSON.stringify(areas);
    try {
      const c = JSON.parse(localStorage.getItem(SIGHT_CACHE) || "null");
      if (c && c.key === key && Date.now() - c.at < SIGHT_TTL && !force) { sightings = c.list; sightingsChanged(); return; }
      if (c && c.key === key && !sightings) { sightings = c.list; sightingsChanged(); } // show the old copy while refreshing
    } catch (e) { /* no saved copy */ }
    if (loadSightings.busy) return;
    loadSightings.busy = true;
    try {
      const d1 = new Date(Date.now() - SIGHT_DAYS * 86400000).toISOString().slice(0, 10);
      const seen = new Map();
      for (const a of areas) {
        for (let page = 1; page <= 3; page++) {
          const url = `https://api.inaturalist.org/v1/observations?taxon_id=47178,47273&quality_grade=research&d1=${d1}` +
            `&lat=${a.lat}&lng=${a.lng}&radius=${a.km}&per_page=200&page=${page}&order_by=observed_on&order=desc`;
          const res = await fetch(url);
          if (!res.ok) throw new Error("iNaturalist answered " + res.status);
          const data = await res.json();
          (data.results || []).forEach(o => {
            const name = o.taxon && (o.taxon.preferred_common_name || o.taxon.name);
            const ll = o.geojson && o.geojson.coordinates;
            if (!name || !ll || o.obscured || (o.positional_accuracy || 0) > 2000 || !isGameFish(name)) return;
            const ph = o.photos && o.photos[0] && o.photos[0].url;
            seen.set(o.id, {
              id: o.id, name: cap(name), sci: o.taxon.name, lat: ll[1], lng: ll[0], date: o.observed_on,
              url: o.uri || `https://www.inaturalist.org/observations/${o.id}`,
              photo: ph ? ph.replace("/square.", "/small.") : null,
              by: o.user && (o.user.name || o.user.login) || "an iNaturalist user"
            });
          });
          if (!data.results || data.results.length < 200) break;
          await new Promise(r => setTimeout(r, 1100)); // iNaturalist asks for about one request a second
        }
      }
      sightings = [...seen.values()].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      sightErr = null;
      try { localStorage.setItem(SIGHT_CACHE, JSON.stringify({ key, at: Date.now(), list: sightings })); } catch (e) { /* storage full */ }
    } catch (e) {
      sightErr = "Couldn't reach iNaturalist right now";
    }
    loadSightings.busy = false;
    sightingsChanged();
  }

  // Sightings within a few miles of a spot that fit its water (no peacock bass at the beach)
  function sightsNear(s) {
    if (!sightings || !hasLoc(s)) return [];
    return sightings.filter(o => {
      if (miles(s.lat, s.lng, o.lat, o.lng) > SIGHT_NEAR_MI) return false;
      const fresh = hasWord(o.name, FRESH_ONLY);
      return s.water_type === "freshwater" ? fresh : (s.water_type === "saltwater" ? !fresh : true);
    });
  }
  function sightLine(s) {
    const near = sightsNear(s);
    if (!near.length) return "";
    const counts = new Map();
    near.forEach(o => counts.set(o.name, (counts.get(o.name) || 0) + 1));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, c]) => c > 1 ? `${n} (${c})` : n);
    const more = counts.size > 4 ? ` +${counts.size - 4} more` : "";
    return `👀 Seen within ${SIGHT_NEAR_MI} mi lately: ${top.join(", ")}${more} · latest ${shortDate(near[0].date)}`;
  }
  const shortDate = ymd => ymd ? new Date(ymd + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric" }) : "";
  function sightCountFor(f) {
    if (!sightings) return 0;
    const pts = (spots || []).filter(hasLoc);
    return sightings.filter(o => hasWord(o.name, f.sightMatch || f.match) &&
      (pts.length ? pts.some(p => miles(p.lat, p.lng, o.lat, o.lng) <= SIGHT_NEAR_MI) : true)).length;
  }

  function sightingsChanged() {
    document.querySelectorAll(".spot-sight").forEach(node => {
      const s = (spots || []).find(x => x.id === node.dataset.spot);
      node.textContent = s ? sightLine(s) : "";
      node.hidden = !node.textContent;
    });
    if (!$("view-seasons").hidden) renderSeasons();
    if (sightOn) renderSightPins();
    renderBest();
  }

  function renderSightPins() {
    if (!map) return;
    if (!sightLayer) sightLayer = L.layerGroup();
    sightLayer.clearLayers();
    (sightings || []).forEach(o => {
      L.circleMarker([o.lat, o.lng], { radius: 5, weight: 1.5, color: "#fff", fillColor: "#8e44ad", fillOpacity: 0.9 })
        .bindPopup(() => {
          const box = document.createElement("div");
          box.appendChild(el("div", "pop-name", "👀 " + o.name));
          box.appendChild(el("div", "pop-meta", `Seen ${shortDate(o.date)} · photo by ${o.by}`));
          if (o.photo) {
            const img = el("img"); img.src = o.photo; img.alt = o.name; img.loading = "lazy";
            img.style.cssText = "display:block;width:100%;max-width:220px;border-radius:8px;margin-top:6px";
            box.appendChild(img);
          }
          const a = el("a", null, "Open on iNaturalist ↗"); a.href = o.url; a.target = "_blank"; a.rel = "noopener";
          a.style.cssText = "display:inline-block;margin-top:6px";
          box.appendChild(a);
          return box;
        }).addTo(sightLayer);
    });
  }
  function setSightOn(on) {
    sightOn = on;
    $("map-sight").classList.toggle("on", on);
    $("sight-key").hidden = !on;
    if (!map) return;
    if (on) {
      if (!sightings) { $("map-sight").textContent = "👀 Loading…"; loadSightings().then(() => { $("map-sight").textContent = "👀 Sightings"; if (sightErr && !sightings) alert(sightErr); }); }
      renderSightPins(); sightLayer.addTo(map);
    } else if (sightLayer) map.removeLayer(sightLayer);
  }
  $("map-sight").addEventListener("click", () => { initMap(); setSightOn(!sightOn); });

  // ---- Records & leaderboards (V4 step 5): personal bests, longest / heaviest fish, most fish, most species ----
  let recScope = "me", recPublic = [], recPublicAt = 0, recPublicErr = null, recAsked = new Set();
  const MEDALS = ["🥇", "🥈", "🥉"];
  const spKey = c => (c.species || "").trim().toLowerCase();
  function recStart(p) { const n = new Date(); return p === "month" ? new Date(n.getFullYear(), n.getMonth(), 1) : p === "year" ? new Date(n.getFullYear(), 0, 1) : null; }
  // The catches this scope can count (before the period and species filters)
  function recBase() {
    if (recScope === "public") return recPublic;
    const all = Object.values(catchesBySpot).flat();
    if (recScope === "me") return all.filter(c => me && c.created_by === me.id);
    return all.filter(c => (c.visibility || "friends") !== "private");
  }
  async function loadRecPublic(force) {
    if (!force && Date.now() - recPublicAt < 60000) return;
    try {
      const { data, error } = await db.from("catches").select("id,spot_id,species,how_many,caught_at,created_by,caught_by,visibility,length_in,weight_lb,weight_est")
        .eq("visibility", "public").is("deleted_at", null).order("caught_at", { ascending: false }).limit(2000);
      if (error) throw error;
      recPublic = data; recPublicAt = Date.now(); recPublicErr = null;
    } catch (e) { recPublicErr = "Couldn't load the public leaderboard right now."; }
    renderRecords();
  }
  function recWho(uid, c) { return me && uid === me.id ? "You" : (profName(uid) || c.caught_by || "Someone"); }
  const recDate = c => new Date(c.caught_at).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  const recPlace = c => { const sp = spotsAll.find(x => x.id === c.spot_id); return sp ? sp.name : null; };
  const recSize = c => [c.length_in > 0 ? `${+Number(c.length_in).toFixed(2)}″` : null, c.weight_lb > 0 ? (c.weight_est ? "≈" : "") + lbText(Number(c.weight_lb)) : null].filter(Boolean).join(", ");
  function renderRecords() {
    if (!$("rec-card")) return;
    ["me", "circle", "public"].forEach(k => { $("rec-s-" + k).className = "btn small" + (recScope === k ? "" : " ghost"); });
    $("rec-board-wrap").hidden = recScope === "me";
    const base = recBase();
    // species picker (keeps the current choice when still available)
    const sel = $("rec-species"), cur = sel.value;
    const names = new Map(); base.forEach(c => { if (spKey(c)) names.set(spKey(c), cap((c.species || "").trim())); });
    const opts = [...names.entries()].sort((a, b) => a[1].localeCompare(b[1]));
    if (sel.options.length !== opts.length + 1 || [...sel.options].slice(1).some((o, i) => o.value !== opts[i][0])) {
      sel.innerHTML = ""; sel.appendChild(new Option("All species", ""));
      opts.forEach(([k, n]) => sel.appendChild(new Option(n, k)));
      sel.value = names.has(cur) ? cur : "";
    }
    const start = recStart($("rec-period").value), sp = sel.value;
    const list = base.filter(c => (!start || new Date(c.caught_at) >= start) && (!sp || spKey(c) === sp));
    const box = $("rec-body"); box.innerHTML = "";
    $("rec-note").textContent = recScope === "me" ? "Your own catches (private ones too). Tap-to-measure lengths make records fair — add a length when you log a catch."
      : recScope === "circle" ? "You and your friends. Only catches shared with Friends or Public count. “Heaviest” skips weights estimated from length."
      : "Catches people marked 🌎 Public. “Heaviest” skips weights estimated from length.";
    if (recScope === "public") { if (recPublicErr) { box.appendChild(el("div", "msg err", recPublicErr)); return; } if (!recPublicAt) { box.appendChild(el("div", "spot-meta", "Loading…")); loadRecPublic(); return; } }
    if (!list.length) { box.appendChild(el("div", "empty", recScope === "me" ? "No catches in this period yet." : "No catches here yet.")); return; }
    if (recScope === "me") return renderBests(box, list);
    // who needs a name?
    const ids = [...new Set(list.map(c => c.created_by).filter(Boolean))].filter(id => !profOf(id) && !recAsked.has(id));
    if (ids.length) { ids.forEach(id => recAsked.add(id)); ensureProfiles(ids).then(renderRecords).catch(() => {}); }
    renderBoard(box, list);
  }
  function renderBests(box, list) {
    const tiles = el("div", "tiles");
    const fish = list.reduce((n, c) => n + (c.how_many || 1), 0), nSp = new Set(list.map(spKey).filter(Boolean)).size;
    const longest = list.filter(c => c.length_in > 0).sort((a, b) => b.length_in - a.length_in)[0];
    tiles.appendChild(tile(fish, "fish caught")); tiles.appendChild(tile(nSp, "species")); tiles.appendChild(tile(longest ? `${+Number(longest.length_in).toFixed(1)}″` : "—", "longest"));
    box.appendChild(tiles);
    box.appendChild(el("div", "label", "Personal bests"));
    const by = new Map();
    list.forEach(c => { const k = spKey(c); if (!k) return; (by.get(k) || by.set(k, []).get(k)).push(c); });
    const rows = [...by.entries()].map(([k, cs]) => {
      const len = cs.filter(c => c.length_in > 0).sort((a, b) => b.length_in - a.length_in)[0];
      const wt = cs.filter(c => c.weight_lb > 0 && !c.weight_est).sort((a, b) => b.weight_lb - a.weight_lb)[0];
      return { name: cap((cs[0].species || "").trim()), cs, len, wt };
    }).sort((a, b) => ((b.len && b.len.length_in) || 0) - ((a.len && a.len.length_in) || 0) || b.cs.length - a.cs.length);
    rows.forEach(r => {
      const line = el("div", "feed-item");
      const top = el("div", "feed-top");
      top.appendChild(el("b", null, r.name));
      top.appendChild(el("span", "feed-when", `${r.cs.reduce((n, c) => n + (c.how_many || 1), 0)} caught`));
      line.appendChild(top);
      const best = r.len || r.wt;
      if (best) {
        line.appendChild(el("div", null, "🏆 " + recSize(best) + (r.wt && r.len && r.wt !== r.len ? ` · heaviest ${lbText(Number(r.wt.weight_lb))}` : "")));
        line.appendChild(el("div", "spot-meta", [recPlace(best), recDate(best)].filter(Boolean).join(" · ")));
      } else line.appendChild(el("div", "spot-meta", "No length or weight logged yet — add one when you log a catch."));
      box.appendChild(line);
    });
  }
  function renderBoard(box, list) {
    const board = $("rec-board").value;
    const byUser = new Map();
    list.forEach(c => { const uid = c.created_by || ("n:" + (c.caught_by || "?")); (byUser.get(uid) || byUser.set(uid, []).get(uid)).push(c); });
    let rows = [...byUser.entries()].map(([uid, cs]) => {
      let value = 0, detail = "";
      if (board === "length" || board === "weight") {
        const pool = cs.filter(c => board === "length" ? c.length_in > 0 : (c.weight_lb > 0 && !c.weight_est));
        if (!pool.length) return null;
        const b = pool.sort((x, y) => board === "length" ? y.length_in - x.length_in : y.weight_lb - x.weight_lb)[0];
        value = board === "length" ? b.length_in : b.weight_lb;
        detail = `${cap((b.species || "").trim())}${recPlace(b) ? " · " + recPlace(b) : ""} · ${recDate(b)}`;
        return { uid, c: b, value, label: board === "length" ? `${+Number(b.length_in).toFixed(2)}″` : lbText(Number(b.weight_lb)), detail };
      }
      if (board === "fish") { value = cs.reduce((n, c) => n + (c.how_many || 1), 0); return { uid, c: cs[0], value, label: `${value} fish`, detail: `${cs.length} catch${cs.length === 1 ? "" : "es"}` }; }
      const set = new Map(); cs.forEach(c => { if (spKey(c)) set.set(spKey(c), cap((c.species || "").trim())); });
      value = set.size; if (!value) return null;
      return { uid, c: cs[0], value, label: `${value} species`, detail: [...set.values()].slice(0, 4).join(", ") + (set.size > 4 ? "…" : "") };
    }).filter(Boolean).sort((a, b) => b.value - a.value);
    if (!rows.length) { box.appendChild(el("div", "empty", board === "length" ? "No lengths logged in this selection yet." : board === "weight" ? "No measured weights logged yet." : "Nothing to rank yet.")); return; }
    const mineIdx = rows.findIndex(r => me && r.uid === me.id);
    rows.slice(0, 10).forEach((r, i) => box.appendChild(boardRow(i, r)));
    if (mineIdx >= 10) { box.appendChild(el("div", "spot-meta", "…")); box.appendChild(boardRow(mineIdx, rows[mineIdx])); }
  }
  function boardRow(i, r) {
    const mine = !!(me && r.uid === me.id);
    const row = el("div", "feed-item");
    const top = el("div", "feed-top");
    const who = el("span", "feed-what");
    who.appendChild(document.createTextNode((MEDALS[i] || `${i + 1}.`) + " "));
    if (r.uid && !String(r.uid).startsWith("n:") && !mine) {
      const b = el("button", "linkbtn", recWho(r.uid, r.c)); b.type = "button";
      b.style.fontSize = "1rem"; b.addEventListener("click", () => showProfile(r.uid)); who.appendChild(b);
    } else who.appendChild(el("b", null, recWho(r.uid, r.c)));
    top.appendChild(who); top.appendChild(el("b", null, r.label));
    row.appendChild(top); row.appendChild(el("div", "spot-meta", r.detail));
    if (mine) row.style.background = "color-mix(in srgb, var(--accent) 8%, transparent)";
    return row;
  }
  [["me", "rec-s-me"], ["circle", "rec-s-circle"], ["public", "rec-s-public"]].forEach(([k, id]) => $(id).addEventListener("click", () => {
    recScope = k; $("rec-species").value = ""; renderRecords(); if (k === "public") loadRecPublic(true);
  }));
  ["rec-board", "rec-period", "rec-species"].forEach(id => $(id).addEventListener("change", renderRecords));


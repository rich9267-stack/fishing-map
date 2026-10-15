  // ---- 🎣 Fishing style (Gulf step 7): shore · pier · flat · boat ----
  // How you fish a spot changes what "a good day" means. A boat cares about chop, a flat about light wind and moving water,
  // a pier reaches deeper fish than a seawall does. Everything here is a small nudge on top of the catch-history match.
  // Atlantic shore spots (docks, seawalls, ramps, shore, inlets) are scored exactly as before.
  const SPOT_STYLE_TEXT = { shore: "from shore", pier: "from a pier", flat: "on the flats", boat: "by boat" };
  function spotStyle(s) {
    const t = s && s.spot_type;
    if (t === "boat") return "boat";
    if (t === "flat") return "flat";
    if (t === "pier" || t === "jetty" || t === "bridge") return "pier";   // walk-out or deep-water structure
    return "shore";
  }
  // Season level (0 slow · 1 decent · 2 peak) for one fish in one month, for the way this spot is fished
  function styleLevel(f, m, style) {
    const sh = f.shore[m], bt = (f.boat || f.shore)[m];
    if (style === "boat") return bt;
    if (style === "pier") return Math.ceil((sh + bt) / 2);   // between shore and boat
    return sh;                                              // shore and flats: inshore fishing
  }
  // Tide matters less out on a reef, more on a flat where moving water pushes bait around
  const styleTideWeight = style => style === "boat" ? 0.5 : style === "flat" ? 1.25 : 1;
  // Wind comfort / safety by style: { adj (added to the score), warn (a short line to show, or "") }
  function styleWindAdj(style, mph) {
    if (mph == null || !style || style === "shore") return { adj: 0, warn: "" };
    if (style === "boat") {
      if (mph >= 25) return { adj: -1.5, warn: "⛔ too rough for most boats" };
      if (mph >= 20) return { adj: -1.0, warn: "💨 rough for a small boat" };
      if (mph >= 15) return { adj: -0.5, warn: "💨 choppy for a small boat" };
      if (mph >= 11) return { adj: -0.15, warn: "" };
      return { adj: mph <= 8 ? 0.2 : 0, warn: "" };
    }
    if (style === "flat") {
      if (mph >= 20) return { adj: -0.8, warn: "💨 too windy — the flat muddies up and fish are hard to spot" };
      if (mph >= 15) return { adj: -0.4, warn: "💨 breezy — harder to sight-fish the flat" };
      if (mph >= 11) return { adj: -0.1, warn: "" };
      return { adj: mph <= 8 ? 0.2 : 0, warn: "" };
    }
    if (mph >= 25) return { adj: -0.6, warn: "💨 hard to fish a pier in this wind" };   // pier
    if (mph >= 20) return { adj: -0.3, warn: "💨 gusty on the pier" };
    return { adj: 0, warn: "" };
  }
  // Onshore / offshore doesn't mean much out on a boat, so that label is hidden there
  const styleShowsWindKind = s => spotStyle(s) !== "boat";
  // A one-line explanation under the spot form's Type menu
  const STYLE_HINT = {
    shore: "",
    pier: "Piers, jetties and bridges are scored between shore and boat fishing.",
    flat: "Flats are scored for light wind and moving tide, using the inshore season.",
    boat: "Boat spots use the by-boat seasons and are marked down for chop — wind over about 15 mph."
  };
  function updateTypeHint() {
    const t = $("f-type"), h = $("f-type-hint");
    if (!t || !h) return;
    const txt = STYLE_HINT[spotStyle({ spot_type: t.value })] || "";
    h.textContent = txt; h.hidden = !txt;
  }
  { const t = $("f-type"); if (t) t.addEventListener("change", updateTypeHint); }

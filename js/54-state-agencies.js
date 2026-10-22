  // ---- 🏛 State fish & wildlife agencies (US plan step 2: "honest everywhere") ----
  // One row per state + DC: [agency name, short name for buttons, fishing rules page, licence page]. Links checked Oct 21 2026.
  // Outside Florida the app has no rules yet, so it says so and sends you to the state's own page (stateRulesGate below).
  const STATE_AGENCIES = {
    AL: ["Alabama Dept. of Conservation & Natural Resources", "Alabama DCNR", "https://www.outdooralabama.com/fishing", "https://www.myoutdooralabama.com/"],
    AR: ["Arkansas Game & Fish Commission", "Arkansas Game & Fish", "https://www.agfc.com/en/fishing/", "https://www.agfc.com/en/licenses-permits/"],
    AZ: ["Arizona Game & Fish Department", "Arizona Game & Fish", "https://www.azgfd.com/fishing/", "https://www.azgfd.com/license/"],
    CA: ["California Dept. of Fish & Wildlife", "California Fish & Wildlife", "https://wildlife.ca.gov/Fishing", "https://wildlife.ca.gov/Licensing"],
    CO: ["Colorado Parks & Wildlife", "Colorado Parks & Wildlife", "https://cpw.state.co.us/fishing", "https://cpw.state.co.us/buy-apply"],
    CT: ["Connecticut Dept. of Energy & Environmental Protection", "Connecticut DEEP", "https://portal.ct.gov/deep/fishing/fishing", "https://portal.ct.gov/deep/fishing/fishing-licenses"],
    DC: ["DC Dept. of Energy & Environment", "DC DOEE", "https://doee.dc.gov/service/get-fishing-license", "https://doee.dc.gov/service/get-fishing-license"],
    DE: ["Delaware DNREC Fish & Wildlife", "Delaware DNREC", "https://dnrec.delaware.gov/fish-wildlife/fishing/", "https://dnrec.delaware.gov/fish-wildlife/licenses/"],
    FL: ["Florida Fish & Wildlife Conservation Commission", "FWC", "https://myfwc.com/fishing/", "https://myfwc.com/license/recreational/"],
    GA: ["Georgia DNR Wildlife Resources Division", "Georgia DNR", "https://georgiawildlife.com/fishing", "https://georgiawildlife.com/licenses-permits-passes"],
    IA: ["Iowa Dept. of Natural Resources", "Iowa DNR", "https://www.iowadnr.gov/fishing", "https://www.iowadnr.gov/fishing"],
    ID: ["Idaho Fish & Game", "Idaho Fish & Game", "https://idfg.idaho.gov/fish", "https://idfg.idaho.gov/licenses"],
    IL: ["Illinois Dept. of Natural Resources", "Illinois DNR", "https://dnr.illinois.gov/fishing.html", "https://dnr.illinois.gov/fishing.html"],
    IN: ["Indiana Dept. of Natural Resources", "Indiana DNR", "https://www.in.gov/dnr/fish-and-wildlife/fishing/", "https://www.in.gov/dnr/fish-and-wildlife/licenses-and-permits/"],
    KS: ["Kansas Dept. of Wildlife & Parks", "Kansas Wildlife & Parks", "https://ksoutdoors.com/Fishing", "https://ksoutdoors.com/License-Permits"],
    KY: ["Kentucky Dept. of Fish & Wildlife Resources", "Kentucky Fish & Wildlife", "https://fw.ky.gov/Fish/Pages/default.aspx", "https://fw.ky.gov/Licenses/Pages/default.aspx"],
    LA: ["Louisiana Dept. of Wildlife & Fisheries", "Louisiana Wildlife & Fisheries", "https://www.wlf.louisiana.gov/page/fishing", "https://www.wlf.louisiana.gov/page/licenses-permits"],
    MA: ["Massachusetts Div. of Marine Fisheries & MassWildlife", "Massachusetts Fisheries", "https://www.mass.gov/topics/fishing", "https://www.mass.gov/topics/fishing-hunting-licenses"],
    MD: ["Maryland Dept. of Natural Resources", "Maryland DNR", "https://dnr.maryland.gov/fisheries/Pages/default.aspx", "https://dnr.maryland.gov/Pages/service_license.aspx"],
    ME: ["Maine Dept. of Inland Fisheries & Wildlife", "Maine Fisheries & Wildlife", "https://www.maine.gov/ifw/fishing-boating/fishing/index.html", "https://www.maine.gov/ifw/licenses-permits/index.html"],
    MI: ["Michigan Dept. of Natural Resources", "Michigan DNR", "https://www.michigan.gov/dnr/things-to-do/fishing", "https://www.michigan.gov/dnr/buy-and-apply"],
    MN: ["Minnesota Dept. of Natural Resources", "Minnesota DNR", "https://www.dnr.state.mn.us/fishing/index.html", "https://www.dnr.state.mn.us/licenses/fishing/index.html"],
    MO: ["Missouri Dept. of Conservation", "Missouri Conservation", "https://mdc.mo.gov/fishing", "https://mdc.mo.gov/permits"],
    MS: ["Mississippi Dept. of Wildlife, Fisheries & Parks", "Mississippi Wildlife & Fisheries", "https://www.mdwfp.com/fishing-boating/", "https://www.mdwfp.com/licenses/"],
    MT: ["Montana Fish, Wildlife & Parks", "Montana FWP", "https://fwp.mt.gov/fish", "https://fwp.mt.gov/buyandapply"],
    NC: ["North Carolina Wildlife Resources Commission", "NC Wildlife", "https://www.ncwildlife.org/fishing", "https://www.ncwildlife.org/licensing"],
    ND: ["North Dakota Game & Fish Dept.", "North Dakota Game & Fish", "https://gf.nd.gov/fishing", "https://gf.nd.gov/buy-apply"],
    NE: ["Nebraska Game & Parks Commission", "Nebraska Game & Parks", "https://outdoornebraska.gov/fishing/", "https://outdoornebraska.gov/buypermits/"],
    NH: ["New Hampshire Fish & Game Dept.", "New Hampshire Fish & Game", "https://www.wildlife.nh.gov/fishing-and-boating", "https://www.wildlife.nh.gov/licensing"],
    NJ: ["New Jersey Div. of Fish & Wildlife", "New Jersey Fish & Wildlife", "https://dep.nj.gov/njfw/fishing/", "https://dep.nj.gov/njfw/fishing/licenses-permits/"],
    NM: ["New Mexico Dept. of Wildlife", "New Mexico Wildlife", "https://wildlife.dgf.nm.gov/fishing/", "https://onlinesales.wildlife.state.nm.us/"],
    NV: ["Nevada Dept. of Wildlife", "Nevada Wildlife", "https://www.ndow.org/fish-wildlife-habitat/fishing/", "https://www.ndow.org/licenses/"],
    NY: ["New York State Dept. of Environmental Conservation", "New York DEC", "https://dec.ny.gov/things-to-do/freshwater-fishing", "https://dec.ny.gov/regulatory/permits-licenses/sporting-and-use/sporting/fishing-license"],
    OH: ["Ohio Dept. of Natural Resources, Division of Wildlife", "Ohio DNR", "https://ohiodnr.gov/buy-and-apply/hunting-fishing-boating/fishing-resources/fishing-regulations", "https://ohiodnr.gov/buy-and-apply/hunting-fishing-boating/fishing-resources/fishing-licenses"],
    OK: ["Oklahoma Dept. of Wildlife Conservation", "Oklahoma Wildlife", "https://www.wildlifedepartment.com/fishing", "https://www.wildlifedepartment.com/licensing"],
    OR: ["Oregon Dept. of Fish & Wildlife", "Oregon Fish & Wildlife", "https://myodfw.com/fishing", "https://myodfw.com/articles/how-buy-fishing-license"],
    PA: ["Pennsylvania Fish & Boat Commission", "Pennsylvania Fish & Boat", "https://www.fishandboat.com/Fish", "https://www.fishandboat.com/Fish/Licenses"],
    RI: ["Rhode Island Dept. of Environmental Management", "Rhode Island DEM", "https://dem.ri.gov/natural-resources-bureau/fish-wildlife", "https://dem.ri.gov/natural-resources-bureau/fish-wildlife/licenses-permits"],
    SC: ["South Carolina Dept. of Natural Resources", "South Carolina DNR", "https://www.dnr.sc.gov/fishing.html", "https://www.dnr.sc.gov/licenses/index.html"],
    SD: ["South Dakota Game, Fish & Parks", "South Dakota Game, Fish & Parks", "https://gfp.sd.gov/fishing/", "https://gfp.sd.gov/licenses/"],
    TN: ["Tennessee Wildlife Resources Agency", "Tennessee TWRA", "https://www.tn.gov/twra/fishing.html", "https://www.tn.gov/twra/license-information.html"],
    TX: ["Texas Parks & Wildlife Department", "Texas Parks & Wildlife", "https://tpwd.texas.gov/fishboat/fish/", "https://tpwd.texas.gov/licenses/"],
    UT: ["Utah Div. of Wildlife Resources", "Utah Wildlife Resources", "https://wildlife.utah.gov/fishing", "https://wildlife.utah.gov/licenses"],
    VA: ["Virginia Dept. of Wildlife Resources", "Virginia DWR", "https://dwr.virginia.gov/fishing/", "https://dwr.virginia.gov/licenses/"],
    VT: ["Vermont Fish & Wildlife Dept.", "Vermont Fish & Wildlife", "https://vtfishandwildlife.com/fish", "https://vtfishandwildlife.com/node/332"],
    WA: ["Washington Dept. of Fish & Wildlife", "Washington Fish & Wildlife", "https://wdfw.wa.gov/fishing", "https://wdfw.wa.gov/licenses/fishing"],
    WI: ["Wisconsin Dept. of Natural Resources", "Wisconsin DNR", "https://dnr.wisconsin.gov/topic/fishing", "https://gowild.wi.gov/"],
    WV: ["West Virginia Div. of Natural Resources", "West Virginia DNR", "https://wvdnr.gov/fishing/", "https://wvdnr.gov/hunting-fishing-licenses/"],
    WY: ["Wyoming Game & Fish Dept.", "Wyoming Game & Fish", "https://wgfd.wyo.gov/fishing-boating", "https://wgfd.wyo.gov/licenses-applications"]
  };
  // { name, short, rules, license } for a state code, or null
  function stateAgency(st) { const a = STATE_AGENCIES[st]; return a ? { name: a[0], short: a[1], rules: a[2], license: a[3] } : null; }
  // Who to tell people to check with: "FWC" in Florida (or no state given), else the state agency
  function agencyShort(st) { const a = stateAgency(st || "FL"); return a ? a.short : "your state's fish & wildlife agency"; }
  // How many fish we have a rule for in this state (rows loaded from fish_rules, js/10)
  function stateRulesCount(st) { return typeof stateRules !== "undefined" ? stateRules.filter(r => r.regions.includes(st)).length : 0; }
  // The honest message for a place outside Florida (info comes from regionInfo, js/31): { text, links: [{label, url}] }
  function stateRulesGate(info) {
    const st = info && info.state, nm = st && typeof STATE_NAMES !== "undefined" ? STATE_NAMES[st] : null, a = stateAgency(st);
    if (!st || !a) return { text: "This spot is outside the United States — we don't have fishing rules for here. Check the local fishing authority before keeping a fish.", links: [] };
    const some = stateRulesCount(st) > 0;   // US plan step 4: a state with some fish done says "for this fish" instead of "yet"
    return { text: some ? `We don't have a ${nm || st} rule for this fish yet. Check ${a.short} before keeping a fish.` : `We don't have ${nm || st} rules yet. Check ${a.short} before keeping a fish.`,
      links: [{ label: `${a.short} rules ↗`, url: a.rules }, { label: "Fishing licence ↗", url: a.license }] };
  }
  // Add the agency buttons from stateRulesGate() to a box
  function gateLinks(box, gate) {
    if (!gate.links.length) return;
    const row = document.createElement("div"); row.className = "gate-links";
    gate.links.forEach(l => { const a = document.createElement("a"); a.className = "btn small"; a.href = l.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = l.label; a.style.textDecoration = "none"; row.appendChild(a); });
    box.appendChild(row);
  }

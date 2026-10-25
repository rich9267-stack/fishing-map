// ---- Icons: line icons (24px, 1.8 stroke) shown in place of emoji ----
// The app text keeps its emoji (so data, tests and copy/paste don't change); on screen each mapped emoji
// is wrapped in <span class="ei ei-NAME"> and drawn as a line icon in the text colour (style added below).
// Add an icon: put it in ICON_SVG, then list the emoji that use it in ICON_MAP. Dots and medals take their colour from --dc.
(function () {
  const C = (x, y, r) => "M" + (x - r) + " " + y + "a" + r + " " + r + " 0 1 0 " + 2 * r + " 0a" + r + " " + r + " 0 1 0 " + -2 * r + " 0";
  // name -> path data (stroke icons); names starting with "!" are solid shapes
  const ICON_SVG = {
    pin: "M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" + C(12, 10, 2.5),
    hook: "M14 3v11a4.5 4.5 0 0 1-9 0v-1.5M3 10.5l2 2 2-2",
    fish: "M3 12c3-4.5 8-6 13-3.5l4-2.5-1.2 6 1.2 6-4-2.5C11 18 6 16.5 3 12zM8 11.5h.01",
    shark: "M2 15c4 1 10 0 14-4l-1-6 5 5c1 2 1 4 0 5-4 3-12 4-18 0zM7 13h.01",
    trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3",
    globe: C(12, 12, 9) + "M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18",
    users: "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8",
    user: C(12, 8, 4) + "M4 21a8 8 0 0 1 16 0",
    ruler: "M3 17L17 3l4 4L7 21l-4-4zM8 12l2 2M11 9l2 2M14 6l2 2",
    flag: "M5 21V4M5 4h12l-2 4 2 4H5",
    wave: "M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0",
    search: C(11, 11, 7) + "M20 20l-4-4",
    ban: C(12, 12, 9) + "M5.6 5.6l12.8 12.8",
    camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
    coin: C(12, 12, 9) + "M12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5-1 1.5-2.5 1.5-2.5.5-2.5 1.5 1 1.5 2.5 1.5 2.5-.5 2.5-1.5",
    mountain: "M3 19l6-10 4 6 3-4 5 8z",
    star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
    alert: "M12 3l10 18H2zM12 10v5M12 18h.01",
    chat: "M4 5h16v11H9l-5 4z",
    map: "M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14",
    chart: "M5 20v-9M12 20V4M19 20v-7",
    book: "M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z",
    home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
    eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" + C(12, 12, 3),
    eyeoff: "M3 3l18 18M10 6.2A9 9 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3 3.7M6.2 7.5C3.6 9.3 2 12 2 12s4 6 10 6a9 9 0 0 0 3.5-.7",
    calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
    lock: "M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3",
    sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z",
    gem: "M6 4h12l4 6-10 11L2 10zM2 10h20M9 4l3 6 3-6M12 21l-3-11M12 21l3-11",
    palette: "M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2s-.5-2 1-2H17a4 4 0 0 0 4-4c0-5-4-10-9-10zM7.5 11h.01M10 7h.01M15 7h.01",
    gamepad: "M6 8h12a4 4 0 0 1 4 4v3a3 3 0 0 1-5 2l-1-1H8l-1 1a3 3 0 0 1-5-2v-3a4 4 0 0 1 4-4zM8 11v4M6 13h4M16 12h.01M18 14h.01",
    compass: C(12, 12, 9) + "M15.5 8.5l-2 5-5 2 2-5z",
    pencil: "M4 20l1-4L16 5l3 3L8 19zM14 7l3 3",
    tag: "M3 12V3h9l9 9-9 9zM7.5 7.5h.01",
    bell: "M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4",
    download: "M12 4v12M7 11l5 5 5-5M5 20h14",
    upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
    wind: "M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7a2 2 0 1 1-2 2",
    mail: "M3 5h18v14H3zM3 6l9 7 9-7",
    lifebuoy: C(12, 12, 9) + C(12, 12, 3.5) + "M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9",
    trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
    egg: "M12 3c4 0 6.5 6 6.5 10a6.5 6.5 0 0 1-13 0C5.5 9 8 3 12 3z",
    ticket: "M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4zM14 7v12",
    thermo: "M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z",
    leaf: "M5 19C5 9 11 4 20 4c0 9-5 15-15 15zM5 19l8-8",
    flame: "M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-9z",
    bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
    repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3",
    gear: C(12, 12, 3) + "M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1",
    sunrise: "M3 18h18M7 18a5 5 0 0 1 10 0M12 6v3M5 10l2 2M19 10l-2 2",
    sun: C(12, 12, 4) + "M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
    save: "M5 4h12l3 3v13H5zM8 4v5h8V4M8 20v-6h8v6",
    bulb: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z",
    plus: "M12 5v14M5 12h14",
    clock: C(12, 12, 9) + "M12 7v5l3 2",
    alarm: C(12, 13, 8) + "M12 9v4l2.5 1.5M3 5l3-2M21 5l-3-2",
    timer: C(12, 14, 8) + "M12 10v4l2 1M9 2h6",
    knot: "M9 4a4 4 0 0 1 6 5l-6 6a4 4 0 0 0 6 5M15 4a4 4 0 0 0-6 5l6 6a4 4 0 0 1-6 5",
    scroll: "M7 4h11v13a3 3 0 0 1-3 3H6a3 3 0 0 0 3-3V4zM7 4a2 2 0 0 0-2 2v2h2M11 9h4M11 13h4",
    shrimp: "M6 16c-2-5 2-10 8-10 3 0 5 2 5 4M19 10l2 2M7 17l-3 3M10 17l-1 4M13 16l.5 4",
    worm: "M3 16c2-5 4-5 6-2s4 3 6-2 4-5 6-2",
    rock: "M4 18l2-8 5-4 6 3 3 9z",
    bug: "M8 10a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0zM12 8v12M8 5l2 2M16 5l-2 2M5 12h3M16 12h3M6 18l3-2M18 18l-3-2",
    coral: "M12 21v-8M12 13c-3 0-4-2-4-5M12 15c3 0 5-2 5-6M12 10c0-3 1-5 1-7",
    volume: "M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6",
    mute: "M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6",
    brain: "M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 5 1V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-5 1V4",
    moon: "M20 14A8 8 0 1 1 10 4a7 7 0 0 0 10 10z",
    boat: "M3 15h18l-3 5H6zM12 3v12M12 4l6 8h-6M12 6l-5 6h5",
    tree: "M12 21v-7M12 14c-4 0-7-3-7-7 4 0 7 3 7 7zM12 14c4 0 7-3 7-7-4 0-7 3-7 7z",
    crown: "M3 8l4 4 5-7 5 7 4-4-2 11H5z",
    heart: "M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z",
    hand: "M8 13V5a1.5 1.5 0 0 1 3 0v6M11 11V4a1.5 1.5 0 0 1 3 0v7M14 11V5.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5L8 14",
    thumb: "M7 11v9H4v-9zM7 11l4-7a2 2 0 0 1 2 2.5L12.5 10H19a2 2 0 0 1 2 2.3l-1.3 6a2 2 0 0 1-2 1.7H7",
    bank: "M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18",
    shop: "M5 8h14l1 12H4zM9 8a3 3 0 0 1 6 0",
    idcard: "M3 5h18v14H3zM7 10h4M7 14h6M16 11h.01",
    storm: "M7 16a4 4 0 0 1 0-8 5 5 0 0 1 10 1 3.5 3.5 0 0 1 0 7M12 13l-2 4h4l-2 4",
    signal: "M12 12h.01M8 8a5.7 5.7 0 0 0 0 8M16 8a5.7 5.7 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14",
    anchor: C(12, 5.5, 2.5) + "M12 8v13M7 12H4a8 8 0 0 0 16 0h-3M8 11h8",
    gift: "M4 10h16v10H4zM3 7h18v3H3zM12 7v13M12 7c-2 0-4-1-4-3 3 0 4 1 4 3zM12 7c2 0 4-1 4-3-3 0-4 1-4 3z",
    grain: "M12 21V8M12 8c-2-1-3-3-3-5 2 0 3 2 3 5zM12 8c2-1 3-3 3-5-2 0-3 2-3 5zM12 14c-2-1-3-2-4-4 2 0 4 1 4 4zM12 14c2-1 3-2 4-4-2 0-4 1-4 4z",
    swim: C(16, 6, 2) + "M3 18c2-2 3-2 5 0s3 2 5 0 3-2 5 0 2 2 3 0M6 14l5-3 3 2",
    log: "M3 9h16a2 2 0 0 1 0 6H3zM3 9v6M7 9v6",
    phoneoff: "M7 3h10v18H7zM3 3l18 18",
    phone: "M7 3h10v18H7zM11 18h2",
    key: C(8, 15, 4) + "M11 12l9-9M16 7l3 3",
    bars: "M5 20v-4M10 20v-8M15 20v-12M20 20V4",
    hourglass: "M6 3h12M6 21h12M7 3c0 6 5 6 5 9s-5 3-5 9M17 3c0 6-5 6-5 9s5 3 5 9",
    check: "M5 12l5 5 9-10",
    checkcircle: C(12, 12, 9) + "M8 12l3 3 5-6",
    xcircle: C(12, 12, 9) + "M9 9l6 6M15 9l-6 6",
    help: C(12, 12, 9) + "M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01",
    stop: "M6 6h12v12H6z",
    bridge: "M2 18h20M4 18c0-6 4-9 8-9s8 3 8 9M8 18v-6M16 18v-6M12 18V9",
    turtle: "M5 15a7 6 0 0 1 14 0zM3 15h18M18 11l3-1M7 15v3M16 15v3",
    wrench: "M14 6a4 4 0 0 0 5 5l-9 9a2 2 0 0 1-3-3l9-9a4 4 0 0 0-2-2z",
    file: "M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6",
    image: "M3 4h18v16H3zM3 16l5-5 4 4 3-3 6 6M15 9h.01",
    drop: "M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z",
    access: C(12, 4, 1.5) + "M12 7v6h5l2 6M8 13a5 5 0 1 0 8 5",
    toolbox: "M3 8h18v12H3zM8 8V5h8v3M3 13h18",
    trident: "M12 3v18M6 3v5a6 6 0 0 0 12 0V3",
    web: "M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4",
    target: C(12, 12, 9) + C(12, 12, 5) + "M12 12h.01",
    box: "M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10",
    crab: "M7 12a5 4 0 0 1 10 0v3H7zM7 15l-3 3M17 15l3 3M9 15v3M15 15v3M5 8a2 2 0 0 1 2 3M19 8a2 2 0 0 0-2 3",
    barrel: "M6 4h12v16H6zM6 9h12M6 15h12",
    cloudsun: "M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.5-1A4 4 0 0 1 17 18z",
    expand: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
    shell: "M12 20c-5 0-8-4-8-9l8-7 8 7c0 5-3 9-8 9zM12 20V7M8 18l-2-7M16 18l2-7",
    castle: "M4 21V9h3V6h2v3h2V6h2v3h2V6h2v3h3v12zM10 21v-5h4v5",
    card: "M3 6h18v12H3zM3 10h18",
    flask: "M9 3h6M10 3v6L4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2l-6-10V3",
    shuffle: "M3 6h4l10 12h4M3 18h4l3-3.5M14 9.5L17 6h4M18 3l3 3-3 3M18 15l3 3-3 3",
    beach: "M3 20h18M12 20V9M5 9a7 6 0 0 1 14 0z",
    shield: "M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z",
    salt: "M8 8h8l1 13H7zM8 8l1-4h6l1 4",
    rainbow: "M3 18a9 9 0 0 1 18 0M7 18a5 5 0 0 1 10 0",
    scissors: C(6, 7, 3) + C(6, 17, 3) + "M8.5 8.5L20 18M8.5 15.5L20 6",
    link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
    keyboard: "M2 7h20v10H2zM6 11h.01M10 11h.01M14 11h.01M18 11h.01M7 15h10",
    car: "M3 15v-3l2-5h14l2 5v3zM3 15h18M7 18h.01M17 18h.01",
    folder: "M3 6h6l2 2h10v11H3z",
    scale: "M12 3v18M5 21h14M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z",
    undo: "M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
    arrowr: "M5 12h14M13 6l6 6-6 6",
    arrowl: "M19 12H5M11 6l-6 6 6 6",
    // solid shapes (coloured with --dc)
    "!dot": "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z",
    "!medal": "M12 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM8 2h3l1 5-3 1zM16 2h-3l-1 5 3 1z",
    "!moon0": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
    "!moon1": "M12 3a9 9 0 0 1 0 18 4.5 9 0 0 1 0-18z",
    "!moon2": "M12 3a9 9 0 0 1 0 18z",
    "!moon3": "M12 3a9 9 0 0 1 0 18 4.5 9 0 0 0 0-18z",
    "!moonfull": "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 5.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13z"
  };
  // emoji -> icon name (or [name, colour, mirrored]). Faces and plain typed symbols (arrows, ticks, stars like ★ ☆) are left as typed.
  const ICON_MAP = {
    "📍": "pin", "📌": "pin", "🎣": "hook", "🪝": "hook", "🐟": "fish", "🐠": "fish", "🐡": "fish", "🐱": "fish", "🦈": "shark", "🏆": "trophy", "🌎": "globe",
    "👥": "users", "👤": "user", "📏": "ruler", "📐": "ruler", "🏁": "flag", "🚩": "flag", "🎏": "flag", "🏴‍☠️": "flag", "🌊": "wave", "🔍": "search", "🔎": "search",
    "🚫": "ban", "⛔": "ban", "📷": "camera", "📸": "camera", "🪙": "coin", "💰": "coin", "💵": "coin", "🏞": "mountain", "🏔": "mountain", "⭐": "star", "🌟": "star",
    "⚠️": "alert", "💬": "chat", "🗺": "map", "🗺️": "map", "📊": "chart", "📚": "book", "📖": "book", "🏠": "home", "👀": "eye", "👁": "eye", "🙈": "eyeoff",
    "📅": "calendar", "🗓": "calendar", "🔒": "lock", "✨": "sparkle", "🎉": "sparkle", "🧹": "sparkle", "💎": "gem", "🎨": "palette", "🎮": "gamepad", "🎲": "gamepad",
    "🧭": "compass", "✏️": "pencil", "✍️": "pencil", "🔤": "pencil", "🏷": "tag", "🔔": "bell", "⬇": "download", "📥": "download", "⬆": "upload", "📤": "upload", "📲": "phone", "📱": "phone",
    "💨": "wind", "📩": "mail", "📨": "mail", "✉️": "mail", "✉": "mail", "🛟": "lifebuoy", "🗑": "trash", "🥚": "egg", "🎫": "ticket", "🌡": "thermo", "🥶": "thermo",
    "🌿": "leaf", "🍃": "leaf", "🪷": "leaf", "🔥": "flame", "⚡": "bolt", "💪": "bolt", "🚀": "bolt", "🔁": "repeat", "🔄": "repeat", "⚙️": "gear", "⚙": "gear", "🌅": "sunrise",
    "🔆": "sun", "💾": "save", "💡": "bulb", "➕": "plus", "🕒": "clock", "🕑": "clock", "🕐": "clock", "⏰": "alarm", "⏱": "timer", "🪢": "knot", "🧵": "knot", "📜": "scroll",
    "🍤": "shrimp", "🦐": "shrimp", "🪱": "worm", "🪨": "rock", "🐞": "bug", "🪸": "coral", "🔊": "volume", "🔇": "mute", "🧠": "brain", "🌙": "moon", "🦉": "moon",
    "🚤": "boat", "⛵": "boat", "🌴": "tree", "🌳": "tree", "👑": "crown", "❤️": "heart", "💜": "heart", "💙": "heart", "💚": "heart", "✋": "hand", "🖐️": "hand", "👆": "hand", "👋": "hand",
    "👍": "thumb", "🏛": "bank", "🛍": "shop", "🏪": "shop", "🪪": "idcard", "⛈️": "storm", "🛰": "signal", "📡": "signal", "📶": "bars", "⚓": "anchor", "🎁": "gift",
    "🌾": "grain", "🌽": "grain", "🏊": "swim", "🤿": "swim", "🪵": "log", "📴": "phoneoff", "🔑": "key", "⏳": "hourglass", "✅": "checkcircle", "❌": "xcircle",
    "❓": "help", "⏹": "stop", "🌉": "bridge", "🐢": "turtle", "🛠": "wrench", "🔧": "wrench", "📋": "file", "📄": "file", "📝": "file", "🖼": "image", "💧": "drop", "🥤": "drop", "🚰": "drop",
    "♿": "access", "🧰": "toolbox", "🔱": "trident", "🕸": "web", "🏹": "target", "🎯": "target", "📦": "box", "🏺": "box", "🎒": "box", "🦀": "crab", "🦞": "crab", "🛢": "barrel",
    "🌦": "cloudsun", "🌤": "cloudsun", "⛶": "expand", "🐚": "shell", "🦪": "shell", "🏰": "castle", "💳": "card", "🧪": "flask", "🔀": "shuffle", "🏖": "beach", "🏖️": "beach", "🏝": "beach",
    "🛡": "shield", "🧂": "salt", "🌈": "rainbow", "✂️": "scissors", "🔗": "link", "⌨️": "keyboard", "🚗": "car", "🗂": "folder", "⚖️": "scale", "↩️": "undo", "➡": "arrowr", "⬅": "arrowl",
    "🔴": ["!dot", "#d64545"], "🟢": ["!dot", "#2e9e5b"], "🟡": ["!dot", "#e0b020"], "🟠": ["!dot", "#e8832a"], "🔵": ["!dot", "#2f7fd6"], "⚪": ["!dot", "#c4cbd1"],
    "🥇": ["!medal", "#d4a017"], "🥈": ["!medal", "#9aa5ad"], "🥉": ["!medal", "#b0713a"],
    "🌑": "!moon0", "🌒": "!moon1", "🌓": "!moon2", "🌔": "!moon3", "🌕": "!moonfull", "🌖": ["!moon3", "", 1], "🌗": ["!moon2", "", 1], "🌘": ["!moon1", "", 1]
  };

  const keys = Object.keys(ICON_MAP).sort((a, b) => b.length - a.length);
  const RX = new RegExp(keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") , "g");
  const QUICK = /[←-⯿\uD800-\uDFFF]/;   // cheap check first: most text has none of these
  const nameOf = v => (Array.isArray(v) ? v[0] : v);
  const cls = v => "ei-" + nameOf(v).replace("!", "s-") + (Array.isArray(v) && v[2] ? " ei-flip" : "");
  const lookup = e => ICON_MAP[e] || ICON_MAP[e.replace(/️/g, "")] || ICON_MAP[e + "️"];

  function svgUrl(name) {
    const body = name[0] === "!" ? '<path fill="black" fill-rule="evenodd" d="' + ICON_SVG[name] + '"/>'
      : '<path fill="none" stroke="black" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="' + ICON_SVG[name] + '"/>';
    return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' + body + "</svg>") + '")';
  }
  // inline svg for code that builds markup itself (uses the text colour)
  window.iconSvg = name => ICON_SVG[name] ? '<svg class="ic" viewBox="0 0 24 24" width="1.15em" height="1.15em" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + ICON_SVG[name] + '"/></svg>' : "";

  if (typeof document === "undefined" || !document.head) return;
  let css = ".ei{position:relative;display:inline-block;width:1.15em;height:1.15em;vertical-align:-.2em;overflow:hidden;text-indent:-9999px;white-space:nowrap;line-height:1;font-style:normal}" +
    ".ei::before{content:'';position:absolute;inset:0;text-indent:0;background:var(--dc,currentColor);-webkit-mask:var(--i) center/contain no-repeat;mask:var(--i) center/contain no-repeat}" +
    ".ei-flip::before{transform:scaleX(-1)}";
  const done = new Set();   // each icon's rule is added the first time that icon is shown (keeps the style sheet small)
  const addRule = v => { const n = nameOf(v); if (done.has(n)) return; done.add(n); st.appendChild(document.createTextNode("." + cls(v).split(" ")[0] + "{--i:" + svgUrl(n) + "}")); };
  const st = document.createElement("style"); st.id = "icon-style"; st.textContent = css; document.head.appendChild(st);

  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|OPTION|TITLE|NOSCRIPT|INPUT|SELECT)$/;
  function skip(el) {
    for (; el; el = el.parentElement) {
      if (SKIP.test(el.tagName) || el.isContentEditable || (el.classList && el.classList.contains("ei")) || (el.hasAttribute && el.hasAttribute("data-noicons"))) return true;
    }
    return false;
  }
  function wrapText(tn) {
    const t = tn.data; if (!QUICK.test(t)) return; RX.lastIndex = 0;
    if (!RX.test(t) || !tn.parentNode || skip(tn.parentElement)) return;
    RX.lastIndex = 0;
    const frag = document.createDocumentFragment(); let last = 0, m;
    while ((m = RX.exec(t))) {
      if (m.index > last) frag.appendChild(document.createTextNode(t.slice(last, m.index)));
      const v = lookup(m[0]), sp = document.createElement("span");
      addRule(v); sp.className = "ei " + cls(v); sp.setAttribute("aria-hidden", "true");
      if (Array.isArray(v) && v[1]) sp.style.setProperty("--dc", v[1]);
      last = m.index + m[0].length;
      if (t[last] === "️") last++;
      sp.textContent = t.slice(m.index, last);
      frag.appendChild(sp);
    }
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    tn.parentNode.replaceChild(frag, tn);
  }
  function sweep(root) {
    if (!root) return;
    if (root.nodeType === 3) { wrapText(root); return; }
    if (root.nodeType !== 1 || !QUICK.test(root.textContent) || skip(root)) return;
    const w = document.createTreeWalker(root, 4), list = [];
    while (w.nextNode()) if (QUICK.test(w.currentNode.data)) list.push(w.currentNode);
    list.forEach(wrapText);
  }
  window.iconSweep = sweep;
  const start = () => {
    sweep(document.body);
    if (typeof MutationObserver === "undefined") return;
    const ob = new MutationObserver(recs => {
      const seen = new Set();
      for (const r of recs) {
        if (r.type === "characterData") { seen.add(r.target); continue; }
        for (const n of r.addedNodes) if ((n.nodeType === 1 || n.nodeType === 3) && n.isConnected) seen.add(n);
      }
      seen.forEach(n => { if (n.isConnected) sweep(n); });
      ob.takeRecords();
    });
    ob.observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();

  // ---- 🚀 Boot: start the app only after EVERY file above has loaded ----
  // (these calls used to sit in the middle of the single big script; split files don't hoist functions across files,
  //  so anything that starts async work and may call a function from a later file belongs here, at the very end)
  load();
  loadWeather();
  loadPressure();
  loadMoon();
  gate();

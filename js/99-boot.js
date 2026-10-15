  // ---- 🚀 Boot: start the app only after EVERY file above has loaded ----
  // (these calls used to sit in the middle of the single big script; split files don't hoist functions across files,
  //  so anything that starts async work and may call a function from a later file belongs here, at the very end)
  hwStart();   // js/29: the first tide / weather load already knows your home waters
  load();
  loadWeather();
  loadPressure();
  loadMoon();
  gate();

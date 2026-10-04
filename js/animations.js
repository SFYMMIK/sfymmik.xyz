(function () {
  "use strict";

  // background engines
  const backgrounds = [
    "js/bg/matrix.js",
    "js/bg/constellation.js",
    "js/bg/flowfield.js",
    "js/bg/swarm.js",
    "js/bg/ripples.js",
    "js/bg/starfield.js",
    "js/bg/raindrops.js",
    "js/bg/hexagons.js",
    "js/bg/boids.js"
  ];

  let started = false;

  function loadRandomBackground() {
    // skip if motion is off
    if (document.documentElement.matches(".reduced-motion, .motion-off")) {
      console.log("[animations] Motion disabled by preference. Background animations disabled.");
      return;
    }
    if (started) return;
    started = true;

    // engines pause/resume themselves

    // pick one
    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    const selectedBg = backgrounds[randomIndex];
    
    console.log(`[animations] Loading random background: ${selectedBg}`);

    // load it
    const script = document.createElement("script");
    
    script.src = selectedBg;
    
    script.async = true;
    
    document.body.appendChild(script);
  }

  // go
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadRandomBackground);
  } else {
    loadRandomBackground();
  }

  // start one if motion comes back on
  window.addEventListener("motionchange", () => {
    if (!document.documentElement.matches(".reduced-motion, .motion-off")) {
      loadRandomBackground();
    }
  });
})();

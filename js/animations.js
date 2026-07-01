(function () {
  "use strict";

  // List of all our amazing background engines
  let backgrounds = [
    "js/bg/matrix.js",
    "js/bg/constellation.js",
    "js/bg/flowfield.js",
    "js/bg/swarm.js",
    "js/bg/ripples.js",
    "js/bg/starfield.js",
    "js/bg/lavalamp.js",
    "js/bg/raindrops.js",
    "js/bg/hexagons.js",
    "js/bg/wormhole.js",
    "js/bg/boids.js",
    "js/bg/radar.js"
  ];

  function loadRandomBackground() {
    // Check if user prefers reduced motion, if so, don't load a background
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      console.log("[animations] Reduced motion preferred. Background animations disabled.");
      return;
    }

    // Exclude mouse-dependent backgrounds on mobile devices (phones/tablets)
    const isMobile = window.innerWidth <= 768 || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isMobile) {
      console.log("[animations] Mobile device detected. Filtering out mouse-dependent backgrounds.");
      backgrounds = backgrounds.filter(bg => {
        // Hexagons and Ripples rely heavily on mouse movement/hover to be visible
        return !bg.includes("hexagons.js") && !bg.includes("ripples.js");
      });
    }

    // Pick a random background from the array
    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    const selectedBg = backgrounds[randomIndex];
    
    console.log(`[animations] Loading random background: ${selectedBg}`);

    // Create a new script element to load the selected background
    const script = document.createElement("script");
    
    // Add a dynamic timestamp to FORCE the browser to ignore cache!
    script.src = `${selectedBg}?t=${Date.now()}`;
    
    script.async = true;
    
    // Inject it into the page
    document.body.appendChild(script);
  }

  // Run the loader when the DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadRandomBackground);
  } else {
    loadRandomBackground();
  }
})();

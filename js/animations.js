(function () {
  "use strict";

  // shared background loop; pauses when hidden, reduced motion, or overlay is open
  class BackgroundLoop {
    constructor(draw, fps) {
      this.draw = draw;
      this.interval = 1000 / fps;
      this.lastFrame = 0;
      this.rafId = 0;
      this.running = false;
      this.tick = this.tick.bind(this);
      this.sync = this.sync.bind(this);

      document.addEventListener("visibilitychange", this.sync);
      window.addEventListener("motionchange", this.sync);

      if (typeof MutationObserver !== "undefined" && document.body) {
        this.observer = new MutationObserver(this.sync);
        this.observer.observe(document.body, {
          attributes: true,
          attributeFilter: ["class"]
        });
      }
    }

    canRun() {
      if (!document.body) return false;
      return !document.hidden
        && !document.body.classList.contains("overlay-open")
        && !document.documentElement.matches(".reduced-motion, .motion-off");
    }

    sync() {
      if (this.canRun()) this.start();
      else this.stop();
    }

    start() {
      if (this.running || !this.canRun()) return;
      this.running = true;
      this.lastFrame = 0;
      this.rafId = requestAnimationFrame(this.tick);
    }

    stop() {
      this.running = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = 0;
      }
    }

    tick(timestamp) {
      if (!this.running) return;
      if (!this.canRun()) {
        this.stop();
        return;
      }

      this.rafId = requestAnimationFrame(this.tick);
      const delta = timestamp - this.lastFrame;
      if (delta < this.interval) return;
      this.lastFrame = timestamp - (delta % this.interval);

      try {
        this.draw();
      } catch (error) {
        console.error("[animations] Background render failed:", error);
        this.stop();
      }
    }
  }

  window.BgLoop = BackgroundLoop;

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

    // pick one
    const randomIndex = Math.floor(Math.random() * backgrounds.length);
    const selectedBg = backgrounds[randomIndex];

    console.log(`[animations] Loading random background: ${selectedBg}`);

    // load it
    const script = document.createElement("script");

    script.src = selectedBg;

    script.async = true;

    script.onerror = () => {
      console.warn(`[animations] Failed to load background: ${selectedBg}`);
      started = false;
    };

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

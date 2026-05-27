(function () {
  "use strict";

  /* ═══════════════════════ CONFIG ═══════════════════════ */
  const CFG = {
    noise: {
      grainSize: 2,             // pixel size of each grain cell
      opacity: 0.06,            // base grain opacity
      tint: [30, 184, 231],     // RGB — subtle cyan tint
      tintStrength: 0.15,       // how much tint vs pure white noise
      fps: 12,                  // grain refresh rate
      mobileFps: 8,             // lower fps on mobile
    },
    reveal: {
      threshold: 0.12,
      rootMargin: "0px 0px -60px 0px",
    },
    tilt: {
      maxAngle: 7,
      perspective: 1000,
      lerpFactor: 0.07,
    },
    magnetic: {
      strength: 0.3,
      lerpFactor: 0.1,
    },
    typewriter: {
      charDelay: 70,        // ms per character
      startDelay: 700,      // ms before first char
      cursorBlink: 2200,    // ms cursor stays after done
    },
    cursorGlow: {
      lerpFactor: 0.06,
    },
  };

  /* ═══════════════════════ UTILS ═══════════════════════ */
  const reducedMotion =
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function rgba(rgb, a) {
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  }

  /* ═══════════════════════ 1. CRT NOISE / STATIC ═══════════════════════ */
  class CRTNoise {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      this.mobile = window.innerWidth < 768 || "ontouchstart" in window;
      this.scale = this.mobile ? 0.25 : 0.5;
      this.interval = 1000 / (this.mobile ? CFG.noise.mobileFps : CFG.noise.fps);
      this.lastFrame = 0;
      this._resize();
      this._buildGrainTile();
      this._bind();
      this._loop(0);
    }

    _resize() {
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.cw = Math.round(this.w * this.scale);
      this.ch = Math.round(this.h * this.scale);
      this.cvs.width = this.cw;
      this.cvs.height = this.ch;
      this.cvs.style.width = this.w + "px";
      this.cvs.style.height = this.h + "px";
    }

    /* Create a reusable grain texture tile (128×128) */
    _buildGrainTile() {
      const size = 128;
      this.tile = document.createElement("canvas");
      this.tile.width = size;
      this.tile.height = size;
      this.tileCtx = this.tile.getContext("2d");
      this.tileSize = size;
    }

    /* Fill the tile with fresh random noise */
    _refreshTile() {
      const ctx = this.tileCtx;
      const size = this.tileSize;
      const img = ctx.createImageData(size, size);
      const d = img.data;
      const tint = CFG.noise.tint;
      const ts = CFG.noise.tintStrength;

      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255;
        /* Mix pure white noise with the tint color */
        d[i]     = Math.round(v * (1 - ts) + tint[0] * ts); // R
        d[i + 1] = Math.round(v * (1 - ts) + tint[1] * ts); // G
        d[i + 2] = Math.round(v * (1 - ts) + tint[2] * ts); // B
        d[i + 3] = Math.round(Math.random() * 255 * CFG.noise.opacity); // A
      }
      ctx.putImageData(img, 0, 0);
    }

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this._resize(), 200);
      });
    }

    _loop(timestamp) {
      requestAnimationFrame((t) => this._loop(t));

      /* Throttle to target fps */
      const delta = timestamp - this.lastFrame;
      if (delta < this.interval) return;
      this.lastFrame = timestamp - (delta % this.interval);

      /* Refresh the noise tile with new random data */
      this._refreshTile();

      /* Tile the noise across the canvas with a random offset for shimmer */
      const ctx = this.ctx;
      const s = CFG.noise.stutter;
      const ox = Math.floor(Math.random() * this.tileSize);
      const oy = Math.floor(Math.random() * this.tileSize);

      ctx.clearRect(0, 0, this.cw, this.ch);

      /* ── Base noise fill ── */
      const pattern = ctx.createPattern(this.tile, "repeat");
      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillStyle = pattern;
      ctx.fillRect(-this.tileSize, -this.tileSize, this.cw + this.tileSize, this.ch + this.tileSize);
      ctx.restore();

      /* ── CRT stutter / glitch effects ── */
      const roll = Math.random();

      /* 1) Horizontal tear — a few strips shift sideways */
      if (roll < s.tearChance) {
        const tearCount = Math.floor(Math.random() * 3) + 1;
        for (let t = 0; t < tearCount; t++) {
          const bandH = Math.floor(Math.random() * s.tearMaxHeight * this.scale) + 1;
          const bandY = Math.floor(Math.random() * this.ch);
          const shift = (Math.random() - 0.5) * s.tearMaxShift * this.scale;

          /* Copy the strip, paste it offset */
          const imgData = ctx.getImageData(0, bandY, this.cw, Math.min(bandH, this.ch - bandY));
          ctx.putImageData(imgData, Math.round(shift), bandY);
        }
      }

      /* 2) Roll bar — a brighter horizontal band like a detuned TV */
      if (roll < s.rollBarChance) {
        const barH = Math.floor(Math.random() * s.rollBarMaxHeight * this.scale) + 2;
        const barY = Math.floor(Math.random() * this.ch);
        ctx.fillStyle = `rgba(${CFG.noise.tint[0]},${CFG.noise.tint[1]},${CFG.noise.tint[2]},${s.rollBarAlpha})`;
        ctx.fillRect(0, barY, this.cw, barH);
      }

      /* 3) Full-frame horizontal jitter */
      if (roll < s.jitterChance) {
        const jx = (Math.random() - 0.5) * s.jitterMaxShift * this.scale;
        const snap = ctx.getImageData(0, 0, this.cw, this.ch);
        ctx.clearRect(0, 0, this.cw, this.ch);
        ctx.putImageData(snap, Math.round(jx), 0);
      }
    }
  }

  /* ═══════════════════════ 2. CURSOR GLOW ═══════════════════════ */
  class CursorGlow {
    constructor(el) {
      this.el = el;
      this.cx = -400;
      this.cy = -400;
      this.tx = -400;
      this.ty = -400;
      this.running = false;

      window.addEventListener("mousemove", (e) => {
        this.tx = e.clientX;
        this.ty = e.clientY;
        if (!this.running) this._tick();
      });
    }

    _tick() {
      this.running = true;
      this.cx = lerp(this.cx, this.tx, CFG.cursorGlow.lerpFactor);
      this.cy = lerp(this.cy, this.ty, CFG.cursorGlow.lerpFactor);
      this.el.style.transform = `translate(${this.cx - 250}px, ${this.cy - 250}px)`;

      if (
        Math.abs(this.cx - this.tx) > 0.2 ||
        Math.abs(this.cy - this.ty) > 0.2
      ) {
        requestAnimationFrame(() => this._tick());
      } else {
        this.running = false;
      }
    }
  }

  /* ═══════════════════════ 3. SCROLL REVEALS ═══════════════════════ */
  function initReveals() {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("visible");
            io.unobserve(en.target);
          }
        });
      },
      {
        threshold: CFG.reveal.threshold,
        rootMargin: CFG.reveal.rootMargin,
      }
    );
    els.forEach((el) => io.observe(el));
  }

  /* ═══════════════════════ 4. 3-D TILT ═══════════════════════ */
  function initTilt() {
    document.querySelectorAll("[data-tilt]").forEach((el) => {
      let rx = 0, ry = 0;
      let trx = 0, try_ = 0;
      let active = false;

      function tick() {
        rx = lerp(rx, trx, CFG.tilt.lerpFactor);
        ry = lerp(ry, try_, CFG.tilt.lerpFactor);
        el.style.transform =
        `perspective(${CFG.tilt.perspective}px) rotateX(${rx}deg) rotateY(${ry}deg)`;

        if (Math.abs(rx - trx) > 0.02 || Math.abs(ry - try_) > 0.02) {
          requestAnimationFrame(tick);
        } else {
          active = false;
        }
      }

      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width;  // 0‥1
        const ny = (e.clientY - r.top) / r.height;
        trx = (0.5 - ny) * CFG.tilt.maxAngle;
        try_ = (nx - 0.5) * CFG.tilt.maxAngle;
        if (!active) { active = true; requestAnimationFrame(tick); }
      });

      el.addEventListener("mouseleave", () => {
        trx = 0;
        try_ = 0;
        if (!active) { active = true; requestAnimationFrame(tick); }
      });
    });
  }

  /* ═══════════════════════ 5. MAGNETIC BUTTONS ═══════════════════════ */
  function initMagnetic() {
    document.querySelectorAll(".magnetic").forEach((btn) => {
      let cx = 0, cy = 0;
      let tcx = 0, tcy = 0;
      let active = false;

      function tick() {
        cx = lerp(cx, tcx, CFG.magnetic.lerpFactor);
        cy = lerp(cy, tcy, CFG.magnetic.lerpFactor);
        btn.style.transform = `translate(${cx}px, ${cy}px)`;

        if (Math.abs(cx - tcx) > 0.15 || Math.abs(cy - tcy) > 0.15) {
          requestAnimationFrame(tick);
        } else {
          active = false;
        }
      }

      btn.addEventListener("mousemove", (e) => {
        const r = btn.getBoundingClientRect();
        const midX = r.left + r.width / 2;
        const midY = r.top + r.height / 2;
        tcx = (e.clientX - midX) * CFG.magnetic.strength;
        tcy = (e.clientY - midY) * CFG.magnetic.strength;
        if (!active) { active = true; requestAnimationFrame(tick); }
      });

      btn.addEventListener("mouseleave", () => {
        tcx = 0;
        tcy = 0;
        if (!active) { active = true; requestAnimationFrame(tick); }
      });
    });
  }

  /* ═══════════════════════ 6. TYPEWRITER ═══════════════════════ */
  function initTypewriter() {
    const el = document.querySelector(".typewriter");
    if (!el) return;

    const text = el.dataset.text || el.textContent;
    el.textContent = "";
    el.style.visibility = "visible";

    const cursor = document.createElement("span");
    cursor.className = "tw-cursor";
    cursor.textContent = "█";
    el.appendChild(cursor);

    let i = 0;
    setTimeout(function type() {
      if (i < text.length) {
        el.insertBefore(document.createTextNode(text[i]), cursor);
        i++;
        setTimeout(type, CFG.typewriter.charDelay);
      } else {
        cursor.classList.add("blink");
        setTimeout(() => cursor.remove(), CFG.typewriter.cursorBlink);
      }
    }, CFG.typewriter.startDelay);
  }

  /* ═══════════════════════ 7. STAGGER CHILDREN ═══════════════════════ */
  function initStagger() {
    document.querySelectorAll("[data-stagger]").forEach((parent) => {
      const gap = parseFloat(parent.dataset.stagger) || 0.1;
      Array.from(parent.children).forEach((ch, i) => {
        ch.style.transitionDelay = `${i * gap}s`;
      });
    });
  }

  /* ═══════════════════════ 8. GLOW BORDERS ═══════════════════════ */
  function initGlowBorders() {
    document.querySelectorAll(".glow-border").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty(
          "--glow-x",
          ((e.clientX - r.left) / r.width) * 100 + "%"
        );
        el.style.setProperty(
          "--glow-y",
          ((e.clientY - r.top) / r.height) * 100 + "%"
        );
      });
    });
  }

  /* ═══════════════════════ 9. SMOOTH SCROLL ═══════════════════════ */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const t = document.querySelector(a.getAttribute("href"));
        if (t) {
          e.preventDefault();
          t.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });
  }

  /* ═══════════════════════ INIT ═══════════════════════ */
  function boot() {
    /*
     * Mark <html> so CSS knows JS is active.
     * The fallback rule `html:not(.js-anim) .reveal` keeps
     * content visible if this script never runs.
     */
    document.documentElement.classList.add("js-anim");

    /* ── reduced-motion: just show everything, skip animations ── */
    if (reducedMotion) {
      document.querySelectorAll(".reveal").forEach((el) =>
      el.classList.add("visible")
      );
      const tw = document.querySelector(".typewriter");
      if (tw) tw.style.visibility = "visible";
      return;
    }

    /* CRT noise — isolated so a canvas error won't block reveals */
    try {
      const cvs = document.getElementById("particles");
      if (cvs) new CRTNoise(cvs);
    } catch (e) {
      console.warn("[animations] CRT noise failed:", e);
    }

    /* cursor glow — hide on touch devices */
    try {
      const glow = document.getElementById("cursor-glow");
      if (glow && window.matchMedia("(pointer: fine)").matches) {
        new CursorGlow(glow);
      }
    } catch (e) {
      console.warn("[animations] Cursor glow failed:", e);
    }

    /* These are critical — always run */
    initReveals();
    initTilt();
    initMagnetic();
    initTypewriter();
    initStagger();
    initGlowBorders();
    initSmoothScroll();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

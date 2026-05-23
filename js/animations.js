(function () {
  "use strict";

  /* ═══════════════════════ CONFIG ═══════════════════════ */
  const CFG = {
    particles: {
      count: 55,
      color: [30, 184, 231],      // RGB — alpha added dynamically
      maxSize: 2.4,
      minSize: 0.6,
      speed: 0.25,
      connectDist: 110,
      mouseRadius: 160,
      mouseForce: 0.15,
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

  /* ═══════════════════════ 1. PARTICLES ═══════════════════════ */
  class ParticleField {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      this.pts = [];
      this.mouse = { x: -9999, y: -9999 };
      this._resize();
      this._seed();
      this._bind();
      this._loop();
    }

    _resize() {
      this.w = this.cvs.width = window.innerWidth;
      this.h = this.cvs.height = window.innerHeight;
    }

    _seed() {
      const n =
      window.innerWidth < 480
      ? Math.floor(CFG.particles.count * 0.3)
      : window.innerWidth < 768
      ? Math.floor(CFG.particles.count * 0.55)
      : CFG.particles.count;
      this.pts = [];
      for (let i = 0; i < n; i++) {
        this.pts.push({
          x: Math.random() * this.w,
                      y: Math.random() * this.h,
                      vx: (Math.random() - 0.5) * CFG.particles.speed,
                      vy: (Math.random() - 0.5) * CFG.particles.speed,
                      r:
                      Math.random() * (CFG.particles.maxSize - CFG.particles.minSize) +
                      CFG.particles.minSize,
                      baseAlpha: Math.random() * 0.45 + 0.1,
                      phase: Math.random() * Math.PI * 2,
                      freq: Math.random() * 0.015 + 0.005,
        });
      }
    }

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this._resize();
          this._seed();
        }, 200);
      });
      window.addEventListener("mousemove", (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });
    }

    _loop() {
      const ctx = this.ctx;
      const col = CFG.particles.color;
      const cDist = CFG.particles.connectDist;
      const mRad = CFG.particles.mouseRadius;
      const mForce = CFG.particles.mouseForce;
      const now = performance.now() * 0.001;

      ctx.clearRect(0, 0, this.w, this.h);

      /* update + draw particles */
      for (const p of this.pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = this.w + 10;
        if (p.x > this.w + 10) p.x = -10;
        if (p.y < -10) p.y = this.h + 10;
        if (p.y > this.h + 10) p.y = -10;

        /* mouse repulsion */
        const dx = p.x - this.mouse.x;
        const dy = p.y - this.mouse.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < mRad && d > 0) {
          const f = ((mRad - d) / mRad) * mForce;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
        p.vx *= 0.985;
        p.vy *= 0.985;

        /* pulsing alpha */
        const pulse =
        Math.sin(now * p.freq * 60 + p.phase) * 0.35 + 0.65;
        const a = p.baseAlpha * pulse;

        /* core dot */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(col, a);
        ctx.fill();

        /* soft glow halo */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = rgba(col, a * 0.12);
        ctx.fill();
      }

      /* connection lines */
      for (let i = 0; i < this.pts.length; i++) {
        for (let j = i + 1; j < this.pts.length; j++) {
          const dx = this.pts[i].x - this.pts[j].x;
          const dy = this.pts[i].y - this.pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < cDist) {
            const lineAlpha = (1 - d / cDist) * 0.12;
            ctx.beginPath();
            ctx.moveTo(this.pts[i].x, this.pts[i].y);
            ctx.lineTo(this.pts[j].x, this.pts[j].y);
            ctx.strokeStyle = rgba(col, lineAlpha);
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(() => this._loop());
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

    /* particles — isolated so a canvas error won't block reveals */
    try {
      const cvs = document.getElementById("particles");
      if (cvs) new ParticleField(cvs);
    } catch (e) {
      console.warn("[animations] Particle system failed:", e);
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

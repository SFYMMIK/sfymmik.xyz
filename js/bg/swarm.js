(function () {
  "use strict";

  const CFG = {
    maxCount: 180,
    baseRadius: 1.6,
    coreColor: "rgba(170, 215, 250, 0.9)",
    lineColor: "rgba(108, 172, 236, 1)",
    lineLevels: 3,
    speed: 1,
    mouseRadius: 150,
    clickForce: 18,
    fps: 60
  };

  // pre-rendered glow sprite
  function makeGlowSprite() {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(108, 172, 236, 0.45)");
    grad.addColorStop(1, "rgba(108, 172, 236, 0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
    return c;
  }

  class InteractiveSwarm {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      this.glowSprite = makeGlowSprite();
      this.mouse = { x: -1000, y: -1000, clicked: false };
      this.levels = [];
      for (let l = 0; l < CFG.lineLevels; l++) this.levels.push([]);

      this._resize();
      this._initParticles();
      this._bind();

      this.loop = new window.BgLoop(() => this._draw(), CFG.fps);
      this.loop.start();
    }

    _resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.cvs.width = Math.round(this.w * dpr);
      this.cvs.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    _initParticles() {
      const count = Math.min(CFG.maxCount, Math.floor((this.w * this.h) / 6000));
      this.particles = [];
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          vx: (Math.random() - 0.5) * CFG.speed,
          vy: (Math.random() - 0.5) * CFG.speed,
          baseVx: (Math.random() - 0.5) * CFG.speed,
          baseVy: (Math.random() - 0.5) * CFG.speed,
          size: Math.random() * CFG.baseRadius + 0.6
        });
      }
    }

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this._resize();
          this._initParticles();
        }, 200);
      });
      window.addEventListener("mousemove", (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });
      window.addEventListener("mouseleave", () => {
        this.mouse.x = -1000;
        this.mouse.y = -1000;
      });
      window.addEventListener("mousedown", () => { this.mouse.clicked = true; });
      window.addEventListener("mouseup", () => { this.mouse.clicked = false; });
      window.addEventListener("touchstart", (e) => {
        this.mouse.x = e.touches[0].clientX;
        this.mouse.y = e.touches[0].clientY;
        this.mouse.clicked = true;
      }, { passive: true });
      window.addEventListener("touchmove", (e) => {
        this.mouse.x = e.touches[0].clientX;
        this.mouse.y = e.touches[0].clientY;
      }, { passive: true });
      window.addEventListener("touchend", () => {
        this.mouse.x = -1000;
        this.mouse.y = -1000;
        this.mouse.clicked = false;
      });
    }

    _draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      const pts = this.particles;
      const mouse = this.mouse;
      const mr = CFG.mouseRadius;
      const mr2 = mr * mr;

      // links per opacity level
      const levels = this.levels;
      for (let l = 0; l < levels.length; l++) levels[l].length = 0;

      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx += (p.baseVx - p.vx) * 0.05;
        p.vy += (p.baseVy - p.vy) * 0.05;

        if (p.x < 0 || p.x > this.w) { p.vx *= -1; p.baseVx *= -1; p.x = Math.max(0, Math.min(this.w, p.x)); }
        if (p.y < 0 || p.y > this.h) { p.vy *= -1; p.baseVy *= -1; p.y = Math.max(0, Math.min(this.h, p.y)); }

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d2 = dx * dx + dy * dy;

        if (d2 < mr2 && d2 > 0.01) {
          const dist = Math.sqrt(d2);
          if (mouse.clicked) {
            const force = (mr - dist) / mr;
            p.vx -= (dx / dist) * force * CFG.clickForce;
            p.vy -= (dy / dist) * force * CFG.clickForce;
          } else {
            const force = dist / mr;
            p.vx += (dx / dist) * force * 0.2;
            p.vy += (dy / dist) * force * 0.2;
          }

          let lvl = ((1 - dist / mr) * CFG.lineLevels) | 0;
          if (lvl >= CFG.lineLevels) lvl = CFG.lineLevels - 1;
          levels[lvl].push(p.x, p.y, mouse.x, mouse.y);
        }

        // cores in one path
        ctx.moveTo(p.x + p.size, p.y);
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      }

      // glow pass
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const gr = p.size * 4;
        ctx.drawImage(this.glowSprite, p.x - gr, p.y - gr, gr * 2, gr * 2);
      }

      ctx.fillStyle = CFG.coreColor;
      ctx.fill();

      ctx.lineWidth = 1;
      ctx.strokeStyle = CFG.lineColor;
      for (let l = 0; l < CFG.lineLevels; l++) {
        const seg = levels[l];
        if (!seg.length) continue;
        ctx.beginPath();
        for (let s = 0; s < seg.length; s += 4) {
          ctx.moveTo(seg[s], seg[s + 1]);
          ctx.lineTo(seg[s + 2], seg[s + 3]);
        }
        ctx.globalAlpha = 0.05 + 0.08 * l;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  const cvs = document.getElementById("particles");
  if (cvs) new InteractiveSwarm(cvs);
})();

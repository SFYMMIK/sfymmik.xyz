(function () {
  "use strict";

  const CFG = {
    maxCount: 90,
    maxDistance: 130,
    speed: 0.4,
    dotColor: "rgba(150, 200, 245, 0.85)",
    lineColor: "rgba(108, 172, 236, 1)",
    lineLevels: 4,
    fps: 30
  };

  class Constellation {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      this.t = 0;
      this._loop = this._loop.bind(this);

      this._resize();
      this._initParticles();
      this._bind();

      this.interval = 1000 / CFG.fps;
      this.lastFrame = 0;
      this._loop(0);
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
      const count = Math.min(CFG.maxCount, Math.floor((this.w * this.h) / 12000));
      this.particles = [];
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          vx: (Math.random() - 0.5) * CFG.speed,
          vy: (Math.random() - 0.5) * CFG.speed,
          r: 1 + Math.random() * 0.9,
          phase: Math.random() * Math.PI * 2
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
    }

    _draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);
      this.t++;

      const pts = this.particles;
      const maxD = CFG.maxDistance;
      const maxD2 = maxD * maxD;

      // links batched per opacity level
      const levels = [];
      for (let l = 0; l < CFG.lineLevels; l++) levels.push([]);

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > this.w) p.vx *= -1;
        if (p.y < 0 || p.y > this.h) p.vy *= -1;

        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < maxD2) {
            let lvl = ((1 - Math.sqrt(d2) / maxD) * CFG.lineLevels) | 0;
            if (lvl >= CFG.lineLevels) lvl = CFG.lineLevels - 1;
            const seg = levels[lvl];
            seg.push(p.x, p.y, q.x, q.y);
          }
        }
      }

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
        ctx.globalAlpha = 0.06 + 0.09 * l;
        ctx.stroke();
      }

      // dots in one fill
      ctx.globalAlpha = 1;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const r = p.r * (0.8 + 0.25 * Math.sin(this.t * 0.04 + p.phase));
        ctx.moveTo(p.x + r, p.y);
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      }
      ctx.fillStyle = CFG.dotColor;
      ctx.fill();
    }

    _loop(timestamp) {
      requestAnimationFrame(this._loop);
      // pause on reduced motion
      if (document.documentElement.matches(".reduced-motion, .motion-off")) return;
      const delta = timestamp - this.lastFrame;
      if (delta < this.interval) return;
      this.lastFrame = timestamp - (delta % this.interval);
      this._draw();
    }
  }

  const cvs = document.getElementById("particles");
  if (cvs) new Constellation(cvs);
})();

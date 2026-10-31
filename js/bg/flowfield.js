(function () {
  "use strict";

  const CFG = {
    maxCount: 1400,
    baseSpeed: 1.5,
    scale: 0.003,
    dimColor: "rgba(108, 172, 236, 1)",
    brightColor: "rgba(160, 208, 250, 1)",
    accentColor: "rgba(90, 230, 124, 1)",
    dimAlpha: 0.30,
    brightAlpha: 0.75,
    accentChance: 0.06,
    fade: "rgba(10, 10, 14, 0.12)",
    fps: 60
  };

  class FlowField {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      this.zOff = 0;

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
      const count = Math.min(CFG.maxCount, Math.floor((this.w * this.h) / 900));
      this.particles = [];
      for (let i = 0; i < count; i++) {
        const speed = Math.random() * CFG.baseSpeed + 0.5;
        this.particles.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          speed,
          life: Math.random() * 100,
          maxLife: Math.random() * 200 + 50,
          accent: Math.random() < CFG.accentChance,
          bright: speed > CFG.baseSpeed * 0.8
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

    _getAngle(x, y, z) {
      const nx = x * CFG.scale;
      const ny = y * CFG.scale;
      return (Math.sin(nx + z) + Math.cos(ny + z) + Math.sin(nx * 0.5 - ny * 0.5)) * Math.PI;
    }

    _draw() {
      const ctx = this.ctx;

      // trails
      ctx.fillStyle = CFG.fade;
      ctx.fillRect(0, 0, this.w, this.h);

      this.zOff += 0.005;

      const pts = this.particles;

      // update all, then paint in grouped passes
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const angle = this._getAngle(p.x, p.y, this.zOff);

        p.x += Math.cos(angle) * p.speed;
        p.y += Math.sin(angle) * p.speed;
        p.life++;

        if (p.x < 0 || p.x > this.w || p.y < 0 || p.y > this.h || p.life > p.maxLife) {
          p.x = Math.random() * this.w;
          p.y = Math.random() * this.h;
          p.life = 0;
          p.accent = Math.random() < CFG.accentChance;
        }
      }

      // dim dust
      ctx.globalAlpha = CFG.dimAlpha;
      ctx.fillStyle = CFG.dimColor;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (!p.accent && !p.bright) ctx.fillRect(p.x, p.y, 1.1, 1.1);
      }

      // bright = faster
      ctx.globalAlpha = CFG.brightAlpha;
      ctx.fillStyle = CFG.brightColor;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (!p.accent && p.bright) ctx.fillRect(p.x, p.y, 1.5, 1.5);
      }

      // rare green sparks
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = CFG.accentColor;
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (p.accent) ctx.fillRect(p.x, p.y, 1.5, 1.5);
      }

      ctx.globalAlpha = 1;
    }
  }

  const cvs = document.getElementById("particles");
  if (cvs) new FlowField(cvs);
})();

(function () {
  "use strict";

  const CFG = {
    font: "15px IBMBIOS2y, monospace",
    fontSize: 15,
    headColor: "rgba(207, 232, 255, 0.95)", // pale head glyph
    fade: "rgba(10, 10, 14, 0.09)",         // trail shrink per frame
    minSpeed: 0.6,
    maxSpeed: 1.4,
    fps: 30
  };

  class MatrixRain {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");

      this.chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      this._loop = this._loop.bind(this);

      this._resize();
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

      this.ctx.font = CFG.font;

      this.columns = Math.floor(this.w / CFG.fontSize) + 1;
      this.drops = [];
      for (let x = 0; x < this.columns; x++) {
        this.drops.push({
          y: Math.random() * -60,
          speed: CFG.minSpeed + Math.random() * (CFG.maxSpeed - CFG.minSpeed)
        });
      }
    }

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this._resize(), 200);
      });
    }

    _draw() {
      const ctx = this.ctx;

      // fade old glyphs
      ctx.fillStyle = CFG.fade;
      ctx.fillRect(0, 0, this.w, this.h);

      ctx.fillStyle = CFG.headColor;

      for (let i = 0; i < this.drops.length; i++) {
        const d = this.drops[i];
        const py = d.y * CFG.fontSize;

        // skip off-screen glyphs
        if (py >= -CFG.fontSize && py <= this.h) {
          const ch = this.chars[(Math.random() * this.chars.length) | 0];
          ctx.fillText(ch, i * CFG.fontSize, py);
        }

        d.y += d.speed;

        if (py > this.h && Math.random() > 0.975) {
          d.y = -Math.random() * 40;
        }
      }
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
  if (cvs) new MatrixRain(cvs);
})();

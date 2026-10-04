(function () {
  "use strict";

  const CFG = {
    maxStars: 900,
    minSpeed: 1.8,
    maxSpeed: 4,
    fade: "rgba(10, 10, 14, 0.35)",
    layers: [
      { color: "rgba(108, 172, 236, 0.30)", width: 0.7 }, // far
      { color: "rgba(150, 200, 245, 0.55)", width: 1.2 }, // mid
      { color: "rgba(210, 235, 255, 0.85)", width: 1.9 }  // near
    ],
    fps: 60
  };

  class Starfield {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      this._loop = this._loop.bind(this);

      this._resize();
      this._initStars();
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

      this.cx = this.w / 2;
      this.cy = this.h / 2;

      // one bucket per depth
      this.buckets = [[], [], []];
    }

    _initStars() {
      const count = Math.min(CFG.maxStars, Math.floor((this.w * this.h) / 1400));
      this.stars = [];
      for (let i = 0; i < count; i++) {
        this.stars.push({
          x: Math.random() * this.w - this.cx,
          y: Math.random() * this.h - this.cy,
          z: Math.random() * this.w,
          pz: 0,
          speed: CFG.minSpeed + Math.random() * (CFG.maxSpeed - CFG.minSpeed)
        });
      }
    }

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this._resize();
          this._initStars();
        }, 200);
      });
    }

    _draw() {
      const ctx = this.ctx;

      ctx.fillStyle = CFG.fade;
      ctx.fillRect(0, 0, this.w, this.h);

      const buckets = this.buckets;
      for (let b = 0; b < buckets.length; b++) buckets[b].length = 0;

      const w = this.w;
      const h = this.h;
      const cx = this.cx;
      const cy = this.cy;

      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        s.pz = s.z;
        s.z -= s.speed;

        if (s.z < 1) {
          s.x = Math.random() * w - cx;
          s.y = Math.random() * h - cy;
          s.z = w;
          s.pz = w;
        }

        const sx = (s.x / s.z) * w + cx;
        const sy = (s.y / s.z) * h + cy;
        const px = (s.x / s.pz) * w + cx;
        const py = (s.y / s.pz) * h + cy;

        const r = Math.max(0.5, (1 - s.z / w) * 3);
        const layer = r < 1 ? 0 : r < 1.8 ? 1 : 2;
        buckets[layer].push(px, py, sx, sy);
      }

      ctx.lineCap = "round";
      for (let b = 0; b < buckets.length; b++) {
        const seg = buckets[b];
        if (!seg.length) continue;
        ctx.beginPath();
        for (let i = 0; i < seg.length; i += 4) {
          ctx.moveTo(seg[i], seg[i + 1]);
          ctx.lineTo(seg[i + 2], seg[i + 3]);
        }
        ctx.strokeStyle = CFG.layers[b].color;
        ctx.lineWidth = CFG.layers[b].width;
        ctx.stroke();
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
  if (cvs) new Starfield(cvs);
})();

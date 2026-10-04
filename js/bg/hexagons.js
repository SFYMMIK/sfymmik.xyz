(function () {
  "use strict";

  const CFG = {
    hexSize: 30,
    mouseRadius: 160,
    gridColor: "rgba(108, 172, 236, 0.05)",
    glowColor: "rgba(108, 172, 236, 1)",
    levels: 3,
    waveSpeed: 0.6,
    fps: 30
  };

  class Hexagons {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      this.mouse = { x: -1000, y: -1000 };
      this.t = 0;
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

      const size = CFG.hexSize;
      this.hexWidth = Math.sqrt(3) * size;
      this.hexHeight = 2 * size;

      // precompute hex corners
      this.verts = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        this.verts.push(Math.cos(a) * size, Math.sin(a) * size);
      }

      // precompute cell centers
      const cols = Math.ceil(this.w / this.hexWidth) + 1;
      const rows = Math.ceil(this.h / (this.hexHeight * 0.75)) + 1;
      this.cells = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          this.cells.push(
            c * this.hexWidth + (r % 2 === 1 ? this.hexWidth / 2 : 0),
            r * this.hexHeight * 0.75
          );
        }
      }

      // glow buckets
      this.buckets = [];
      for (let l = 0; l < CFG.levels; l++) this.buckets.push([]);
    }

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this._resize(), 200);
      });
      window.addEventListener("mousemove", (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });
      window.addEventListener("mouseleave", () => {
        this.mouse.x = -1000;
        this.mouse.y = -1000;
      });
    }

    _hexPath(arr, off, x, y) {
      const v = this.verts;
      arr[off] = x + v[0];
      arr[off + 1] = y + v[1];
      for (let i = 1; i < 6; i++) {
        arr[off + i * 2] = x + v[i * 2];
        arr[off + i * 2 + 1] = y + v[i * 2 + 1];
      }
      return off + 12;
    }

    _draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      this.t += 0.03;
      const cells = this.cells;
      const mr = CFG.mouseRadius;
      const mx = this.mouse.x;
      const my = this.mouse.y;
      const buckets = this.buckets;
      for (let l = 0; l < buckets.length; l++) buckets[l].length = 0;

      // base grid (one path)
      ctx.beginPath();
      for (let i = 0; i < cells.length; i += 2) {
        const x = cells[i];
        const y = cells[i + 1];
        const v = this.verts;
        ctx.moveTo(x + v[0], y + v[1]);
        for (let k = 1; k < 6; k++) ctx.lineTo(x + v[k * 2], y + v[k * 2 + 1]);
        ctx.closePath();
      }
      ctx.strokeStyle = CFG.gridColor;
      ctx.lineWidth = 1;
      ctx.stroke();

      for (let i = 0; i < cells.length; i += 2) {
        const x = cells[i];
        const y = cells[i + 1];

        // idle wave
        const wave = Math.sin(x * 0.012 + y * 0.018 - this.t * CFG.waveSpeed);
        let alpha = wave > 0.55 ? (wave - 0.55) * 0.22 : 0;

        const dx = mx - x;
        const dy = my - y;
        if (dx > -mr && dx < mr && dy > -mr && dy < mr) {
          const d2 = dx * dx + dy * dy;
          if (d2 < mr * mr) {
            const glow = (1 - Math.sqrt(d2) / mr) * 0.55;
            if (glow > alpha) alpha = glow;
          }
        }

        if (alpha > 0.02) {
          let lvl = (alpha / 0.55 * CFG.levels) | 0;
          if (lvl >= CFG.levels) lvl = CFG.levels - 1;
          this._hexPath(buckets[lvl], buckets[lvl].length, x, y);
        }
      }

      // lit hexes per level
      for (let l = 0; l < CFG.levels; l++) {
        const arr = buckets[l];
        if (!arr.length) continue;
        ctx.beginPath();
        for (let o = 0; o < arr.length; o += 12) {
          ctx.moveTo(arr[o], arr[o + 1]);
          for (let k = 1; k < 6; k++) ctx.lineTo(arr[o + k * 2], arr[o + k * 2 + 1]);
          ctx.closePath();
        }
        const strength = (l + 1) / CFG.levels;
        ctx.fillStyle = `rgba(108, 172, 236, ${0.10 * strength})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(160, 205, 245, ${0.18 * strength})`;
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
  if (cvs) new Hexagons(cvs);
})();

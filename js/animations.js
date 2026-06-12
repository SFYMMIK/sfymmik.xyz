(function () {
  "use strict";

  /* ═══════════════════════ CONFIG ═══════════════════════ */
  const CFG = {
    noise: {
      grainSize: 2,
      opacity: 0.06,
      tint: [30, 184, 231],    // cyan tint for dark mode
      tintStrength: 0.15,
      fps: 12,
      mobileFps: 8,
    },
  };

  /* ═══════════════════════ UTILS ═══════════════════════ */
  const reducedMotion =
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ═══════════════════════ CRT NOISE / STATIC ═══════════════════════ */
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

    _buildGrainTile() {
      const size = 128;
      this.tile = document.createElement("canvas");
      this.tile.width = size;
      this.tile.height = size;
      this.tileCtx = this.tile.getContext("2d");
      this.tileSize = size;
    }

    _refreshTile() {
      const ctx = this.tileCtx;
      const size = this.tileSize;
      const img = ctx.createImageData(size, size);
      const d = img.data;
      const tint = CFG.noise.tint;
      const ts = CFG.noise.tintStrength;

      for (let i = 0; i < d.length; i += 4) {
        const v = Math.random() * 255;
        d[i]     = Math.round(v * (1 - ts) + tint[0] * ts);
        d[i + 1] = Math.round(v * (1 - ts) + tint[1] * ts);
        d[i + 2] = Math.round(v * (1 - ts) + tint[2] * ts);
        d[i + 3] = Math.round(Math.random() * 255 * CFG.noise.opacity);
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

      const delta = timestamp - this.lastFrame;
      if (delta < this.interval) return;
      this.lastFrame = timestamp - (delta % this.interval);

      this._refreshTile();

      const ctx = this.ctx;
      const ox = Math.floor(Math.random() * this.tileSize);
      const oy = Math.floor(Math.random() * this.tileSize);

      ctx.clearRect(0, 0, this.cw, this.ch);

      const pattern = ctx.createPattern(this.tile, "repeat");
      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillStyle = pattern;
      ctx.fillRect(-this.tileSize, -this.tileSize, this.cw + this.tileSize, this.ch + this.tileSize);
      ctx.restore();
    }
  }

  /* ═══════════════════════ INIT ═══════════════════════ */
  function boot() {
    if (reducedMotion) return;

    try {
      const cvs = document.getElementById("particles");
      if (cvs) new CRTNoise(cvs);
    } catch (e) {
      console.warn("[animations] CRT noise failed:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

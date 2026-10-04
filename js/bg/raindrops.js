(function () {
  "use strict";

  const CFG = {
    maxDrops: 160,
    maxSplashes: 600,
    minSpeed: 5,
    maxSpeed: 10,
    minLength: 10,
    maxLength: 30,
    dropColor: "rgba(120, 180, 235, 0.45)",
    headColor: "rgba(205, 232, 255, 0.8)",
    splashColor: "rgba(150, 200, 245, 1)",
    fade: "rgba(10, 10, 14, 0.4)",
    fps: 60
  };

  class Raindrops {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");

      // buckets for batched strokes
      this.slowSegs = [];
      this.fastSegs = [];
      this.headSegs = [];
      this.splashLevels = [[], [], []];

      this._loop = this._loop.bind(this);
      this._resize();
      this._initDrops();
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

    _initDrops() {
      const count = Math.min(CFG.maxDrops, Math.floor((this.w * this.h) / 7000));
      this.drops = [];
      this.splashes = [];
      for (let i = 0; i < count; i++) {
        this.drops.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          speed: Math.random() * (CFG.maxSpeed - CFG.minSpeed) + CFG.minSpeed,
          length: Math.random() * (CFG.maxLength - CFG.minLength) + CFG.minLength
        });
      }
    }

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this._resize();
          this._initDrops();
        }, 200);
      });
    }

    _createSplash(x, y) {
      if (this.splashes.length > CFG.maxSplashes) return;
      for (let i = 0; i < 3; i++) {
        this.splashes.push({
          x: x,
          y: y,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * -3 - 1,
          life: 1
        });
      }
    }

    _strokeSegs(segs) {
      if (!segs.length) return;
      const ctx = this.ctx;
      ctx.beginPath();
      for (let i = 0; i < segs.length; i += 4) {
        ctx.moveTo(segs[i], segs[i + 1]);
        ctx.lineTo(segs[i + 2], segs[i + 3]);
      }
      ctx.stroke();
    }

    _draw() {
      const ctx = this.ctx;

      ctx.fillStyle = CFG.fade;
      ctx.fillRect(0, 0, this.w, this.h);

      const slow = this.slowSegs;
      const fast = this.fastSegs;
      const heads = this.headSegs;
      slow.length = 0;
      fast.length = 0;
      heads.length = 0;

      for (let i = 0; i < this.drops.length; i++) {
        const d = this.drops[i];
        d.y += d.speed;

        if (d.y > this.h) {
          this._createSplash(d.x, this.h);
          d.y = -d.length;
          d.x = Math.random() * this.w;
        }

        (d.speed > (CFG.minSpeed + CFG.maxSpeed) / 2 ? fast : slow)
          .push(d.x, d.y, d.x, d.y - d.length);

        // bright head
        const hl = Math.min(4, d.length);
        heads.push(d.x, d.y, d.x, d.y - hl);
      }

      ctx.lineCap = "round";
      ctx.lineWidth = 1;
      ctx.strokeStyle = CFG.dropColor;
      this._strokeSegs(slow);
      ctx.lineWidth = 1.7;
      this._strokeSegs(fast);
      ctx.strokeStyle = CFG.headColor;
      ctx.lineWidth = 1.7;
      this._strokeSegs(heads);

      // splashes by life
      const levels = this.splashLevels;
      for (let l = 0; l < levels.length; l++) levels[l].length = 0;

      for (let i = this.splashes.length - 1; i >= 0; i--) {
        const s = this.splashes[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.2; // gravity
        s.life -= 0.05;

        if (s.life <= 0) {
          this.splashes.splice(i, 1);
          continue;
        }

        const lvl = s.life > 0.66 ? 0 : s.life > 0.33 ? 1 : 2;
        levels[lvl].push(s.x, s.y);
      }

      const alphas = [0.85, 0.45, 0.18];
      ctx.fillStyle = CFG.splashColor;
      for (let l = 0; l < levels.length; l++) {
        const arr = levels[l];
        if (!arr.length) continue;
        ctx.globalAlpha = alphas[l];
        for (let k = 0; k < arr.length; k += 2) {
          ctx.fillRect(arr[k], arr[k + 1], 2, 2);
        }
      }
      ctx.globalAlpha = 1;
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
  if (cvs) new Raindrops(cvs);
})();

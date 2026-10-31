(function () {
  "use strict";

  const TAU = Math.PI * 2;

  const CFG = {
    color: "rgba(108, 172, 236, 1)",
    clickColor: "rgba(205, 232, 255, 1)",
    maxRadius: 170,
    speed: 2,
    fadeSpeed: 0.02,
    maxRipples: 80,
    fps: 60
  };

  class WaterRipples {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      this.ripples = [];
      this.mouse = { x: -1000, y: -1000 };
      this.ambientTimer = 60;

      this._resize();
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

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this._resize(), 200);
      });

      let lastSpawn = 0;
      window.addEventListener("mousemove", (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        const now = performance.now();
        if (now - lastSpawn > 80) {
          this._spawn(e.clientX, e.clientY, 1, false);
          lastSpawn = now;
        }
      });

      window.addEventListener("mousedown", (e) => {
        this._spawn(e.clientX, e.clientY, 1, true);
      });
    }

    _spawn(x, y, alpha, click) {
      const rings = click ? 3 : 1;
      for (let i = 0; i < rings; i++) {
        this.ripples.push({
          x: x,
          y: y,
          radius: 1 + i * 9,
          alpha: alpha * (1 - i * 0.28),
          click: click
        });
      }
      const excess = this.ripples.length - CFG.maxRipples;
      if (excess > 0) this.ripples.splice(0, excess);
    }

    _draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      // ambient ripples (mobile)
      this.ambientTimer--;
      if (this.ambientTimer <= 0) {
        this.ambientTimer = 90 + Math.random() * 180;
        this._spawn(Math.random() * this.w, Math.random() * this.h, 0.5, false);
      }

      ctx.lineWidth = 1.5;
      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        r.radius += r.click ? CFG.speed * 2 : CFG.speed;
        r.alpha -= CFG.fadeSpeed;

        if (r.alpha <= 0 || r.radius > CFG.maxRadius) {
          this.ripples.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = r.alpha;
        ctx.strokeStyle = r.click ? CFG.clickColor : CFG.color;
        ctx.lineWidth = r.click ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  const cvs = document.getElementById("particles");
  if (cvs) new WaterRipples(cvs);
})();

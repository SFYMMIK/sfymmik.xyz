(function () {
  "use strict";

  const CFG = {
    color: "rgba(30, 184, 231, 0.4)",
    maxRadius: 150,
    speed: 2,
    fadeSpeed: 0.02,
    fps: 60
  };

  class WaterRipples {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      this.ripples = [];
      this.mouse = { x: -1000, y: -1000 };
      
      this._resize();
      this._bind();
      
      this.interval = 1000 / CFG.fps;
      this.lastFrame = 0;
      this._loop(0);
    }

    _resize() {
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.cvs.width = this.w;
      this.cvs.height = this.h;
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
        const now = Date.now();
        if (now - lastSpawn > 50) { // Throttle ripple creation
          this.ripples.push({ x: e.clientX, y: e.clientY, radius: 1, alpha: 1 });
          lastSpawn = now;
        }
      });
      
      window.addEventListener("mousedown", (e) => {
        this.ripples.push({ x: e.clientX, y: e.clientY, radius: 1, alpha: 1, click: true });
      });
    }

    _draw() {
      this.ctx.clearRect(0, 0, this.w, this.h);

      for (let i = this.ripples.length - 1; i >= 0; i--) {
        const r = this.ripples[i];
        r.radius += r.click ? CFG.speed * 2 : CFG.speed;
        r.alpha -= CFG.fadeSpeed;

        if (r.alpha <= 0) {
          this.ripples.splice(i, 1);
          continue;
        }

        this.ctx.beginPath();
        this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = `rgba(30, 184, 231, ${r.alpha})`;
        this.ctx.lineWidth = r.click ? 3 : 1.5;
        this.ctx.stroke();
      }
    }

    _loop(timestamp) {
      requestAnimationFrame((t) => this._loop(t));
      const delta = timestamp - this.lastFrame;
      if (delta < this.interval) return;
      this.lastFrame = timestamp - (delta % this.interval);
      this._draw();
    }
  }

  const cvs = document.getElementById("particles");
  if (cvs) new WaterRipples(cvs);
})();

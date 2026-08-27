(function () {
  "use strict";

  const CFG = {
    orbCount: 12,
    color1: "rgba(30, 184, 231, 0.3)", // Cyan
    color2: "rgba(10, 40, 100, 0.3)",  // Blue
    speed: 0.5,
    fps: 60
  };

  class LavaLamp {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      
      this._resize();
      this._initOrbs();
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

    _initOrbs() {
      this.orbs = [];
      for (let i = 0; i < CFG.orbCount; i++) {
        this.orbs.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          vx: (Math.random() - 0.5) * CFG.speed,
          vy: (Math.random() - 0.5) * CFG.speed,
          radius: Math.random() * 200 + 100,
          color: i % 2 === 0 ? CFG.color1 : CFG.color2
        });
      }
    }

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this._resize();
          this._initOrbs();
        }, 200);
      });
    }

    _draw() {
      this.ctx.clearRect(0, 0, this.w, this.h);
      this.ctx.globalCompositeOperation = 'screen'; // Creates beautiful light blending

      for (let i = 0; i < this.orbs.length; i++) {
        const o = this.orbs[i];
        
        o.x += o.vx;
        o.y += o.vy;

        // Smooth bounce
        if (o.x < -o.radius) o.vx = Math.abs(o.vx);
        if (o.x > this.w + o.radius) o.vx = -Math.abs(o.vx);
        if (o.y < -o.radius) o.vy = Math.abs(o.vy);
        if (o.y > this.h + o.radius) o.vy = -Math.abs(o.vy);

        // Draw radial gradient orb
        const gradient = this.ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.radius);
        gradient.addColorStop(0, o.color);
        gradient.addColorStop(1, "rgba(0,0,0,0)");
        
        this.ctx.beginPath();
        this.ctx.arc(o.x, o.y, o.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = gradient;
        this.ctx.fill();
      }
      this.ctx.globalCompositeOperation = 'source-over';
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
  if (cvs) new LavaLamp(cvs);
})();

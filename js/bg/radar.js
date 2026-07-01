(function () {
  "use strict";

  const CFG = {
    color: "rgba(30, 184, 231, 0.8)",
    gridColor: "rgba(30, 184, 231, 0.1)",
    speed: 0.02,
    fps: 60
  };

  class Radar {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      
      this._resize();
      this._bind();
      
      this.angle = 0;
      this.interval = 1000 / CFG.fps;
      this.lastFrame = 0;
      this._loop(0);
    }

    _resize() {
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.cvs.width = this.w;
      this.cvs.height = this.h;
      this.cx = this.w / 2;
      this.cy = this.h / 2;
      this.radius = Math.max(this.w, this.h) / 1.5;
    }

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this._resize(), 200);
      });
    }

    _draw() {
      // Clear with slight trail for the radar sweep effect
      this.ctx.fillStyle = "rgba(10, 10, 14, 0.05)";
      this.ctx.fillRect(0, 0, this.w, this.h);

      // Draw static grid rings
      this.ctx.strokeStyle = CFG.gridColor;
      this.ctx.lineWidth = 1;
      for (let r = 50; r < this.radius; r += 100) {
        this.ctx.beginPath();
        this.ctx.arc(this.cx, this.cy, r, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      // Draw crosshairs
      this.ctx.beginPath();
      this.ctx.moveTo(this.cx, 0);
      this.ctx.lineTo(this.cx, this.h);
      this.ctx.moveTo(0, this.cy);
      this.ctx.lineTo(this.w, this.cy);
      this.ctx.stroke();

      // Draw sweeping radar beam
      this.angle -= CFG.speed;
      
      this.ctx.save();
      this.ctx.translate(this.cx, this.cy);
      this.ctx.rotate(this.angle);

      // Create a conical gradient for the sweep beam
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.arc(0, 0, this.radius, 0, Math.PI * 0.25);
      this.ctx.lineTo(0, 0);
      
      const grad = this.ctx.createLinearGradient(0, 0, this.radius, this.radius);
      grad.addColorStop(0, "rgba(30, 184, 231, 0.8)");
      grad.addColorStop(1, "rgba(30, 184, 231, 0.0)");
      
      this.ctx.fillStyle = grad;
      this.ctx.fill();

      // Draw the solid leading edge line of the radar
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(this.radius, 0);
      this.ctx.strokeStyle = CFG.color;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      this.ctx.restore();
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
  if (cvs) new Radar(cvs);
})();

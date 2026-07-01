(function () {
  "use strict";

  const CFG = {
    dropCount: 150,
    color: "#1eb8e7",
    speedMultiplier: 5,
    fps: 60
  };

  class Raindrops {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      
      this._resize();
      this._initDrops();
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

    _initDrops() {
      this.drops = [];
      this.splashes = [];
      for (let i = 0; i < CFG.dropCount; i++) {
        this.drops.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          speed: Math.random() * CFG.speedMultiplier + 5,
          length: Math.random() * 20 + 10
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

    _draw() {
      this.ctx.fillStyle = "rgba(10, 10, 14, 0.4)";
      this.ctx.fillRect(0, 0, this.w, this.h);

      this.ctx.strokeStyle = CFG.color;
      this.ctx.lineCap = "round";

      // Draw Drops
      for (let i = 0; i < this.drops.length; i++) {
        const d = this.drops[i];
        d.y += d.speed;

        if (d.y > this.h) {
          this._createSplash(d.x, this.h);
          d.y = -d.length;
          d.x = Math.random() * this.w;
        }

        this.ctx.beginPath();
        this.ctx.moveTo(d.x, d.y);
        this.ctx.lineTo(d.x, d.y - d.length);
        this.ctx.lineWidth = d.speed * 0.2;
        this.ctx.stroke();
      }

      // Draw Splashes
      this.ctx.fillStyle = CFG.color;
      for (let i = this.splashes.length - 1; i >= 0; i--) {
        const s = this.splashes[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.2; // Gravity
        s.life -= 0.05;

        if (s.life <= 0) {
          this.splashes.splice(i, 1);
          continue;
        }

        this.ctx.globalAlpha = Math.max(0, s.life);
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
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
  if (cvs) new Raindrops(cvs);
})();

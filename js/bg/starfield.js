(function () {
  "use strict";

  const CFG = {
    starCount: 800,
    speed: 3,
    color: "#1eb8e7",
    fps: 60
  };

  class Starfield {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      
      this._resize();
      this._initStars();
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
      this.cx = this.w / 2;
      this.cy = this.h / 2;
    }

    _initStars() {
      this.stars = [];
      for (let i = 0; i < CFG.starCount; i++) {
        this.stars.push({
          x: Math.random() * this.w - this.cx,
          y: Math.random() * this.h - this.cy,
          z: Math.random() * this.w,
          pz: Math.random() * this.w
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
      this.ctx.fillStyle = "rgba(10, 10, 14, 0.4)";
      this.ctx.fillRect(0, 0, this.w, this.h);

      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        
        s.pz = s.z;
        s.z -= CFG.speed;

        if (s.z < 1) {
          s.x = Math.random() * this.w - this.cx;
          s.y = Math.random() * this.h - this.cy;
          s.z = this.w;
          s.pz = this.w;
        }

        const sx = (s.x / s.z) * this.w + this.cx;
        const sy = (s.y / s.z) * this.h + this.cy;

        const px = (s.x / s.pz) * this.w + this.cx;
        const py = (s.y / s.pz) * this.h + this.cy;

        const r = Math.max(0.5, (1 - s.z / this.w) * 3);

        this.ctx.beginPath();
        this.ctx.moveTo(px, py);
        this.ctx.lineTo(sx, sy);
        this.ctx.strokeStyle = CFG.color;
        this.ctx.lineWidth = r;
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
  if (cvs) new Starfield(cvs);
})();

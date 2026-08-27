(function () {
  "use strict";

  const CFG = {
    particleCount: 1500,
    baseSpeed: 1.5,
    color: "rgba(30, 184, 231, 0.4)",
    glowColor: "rgba(30, 184, 231, 0.8)",
    scale: 0.003,
    fps: 60
  };

  class FlowField {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      this.zOff = 0;
      
      this._resize();
      this._initParticles();
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

    _initParticles() {
      this.particles = [];
      const pCount = Math.min(CFG.particleCount, Math.floor((this.w * this.h) / 800));
      for (let i = 0; i < pCount; i++) {
        this.particles.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          speed: Math.random() * CFG.baseSpeed + 0.5,
          life: Math.random() * 100,
          maxLife: Math.random() * 200 + 50
        });
      }
    }

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this._resize();
          this._initParticles();
        }, 200);
      });
    }

    _getAngle(x, y, z) {
      const nx = x * CFG.scale;
      const ny = y * CFG.scale;
      return (Math.sin(nx + z) + Math.cos(ny + z) + Math.sin(nx * 0.5 - ny * 0.5)) * Math.PI;
    }

    _draw() {
      this.ctx.fillStyle = "rgba(10, 10, 14, 0.15)";
      this.ctx.fillRect(0, 0, this.w, this.h);

      this.zOff += 0.005;
      this.ctx.fillStyle = CFG.color;

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        const angle = this._getAngle(p.x, p.y, this.zOff);

        p.x += Math.cos(angle) * p.speed;
        p.y += Math.sin(angle) * p.speed;
        p.life++;

        this.ctx.beginPath();
        if (p.speed > CFG.baseSpeed * 0.8) {
          this.ctx.fillStyle = CFG.glowColor;
          this.ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        } else {
          this.ctx.fillStyle = CFG.color;
          this.ctx.arc(p.x, p.y, 0.8, 0, Math.PI * 2);
        }
        this.ctx.fill();

        if (p.x < 0 || p.x > this.w || p.y < 0 || p.y > this.h || p.life > p.maxLife) {
          p.x = Math.random() * this.w;
          p.y = Math.random() * this.h;
          p.life = 0;
        }
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
  if (cvs) new FlowField(cvs);
})();

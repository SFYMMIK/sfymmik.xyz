(function () {
  "use strict";

  // Constellation Config
  const CFG = {
    color: "rgba(30, 184, 231, 0.6)", // Cyan matching the theme
    lineColor: "rgba(30, 184, 231, 0.15)",
    particleCount: 80,
    maxDistance: 120, // Max distance to draw a line between nodes
    speed: 0.5,
    radius: 1.5,
    fps: 30
  };

  class Constellation {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      this.particles = [];
      
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
      const pCount = Math.min(CFG.particleCount, Math.floor((this.w * this.h) / 10000));
      for (let i = 0; i < pCount; i++) {
        this.particles.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          vx: (Math.random() - 0.5) * CFG.speed,
          vy: (Math.random() - 0.5) * CFG.speed
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

    _draw() {
      this.ctx.clearRect(0, 0, this.w, this.h);

      // Move particles
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off walls
        if (p.x < 0 || p.x > this.w) p.vx *= -1;
        if (p.y < 0 || p.y > this.h) p.vy *= -1;

        // Draw particle
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, CFG.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = CFG.color;
        this.ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < this.particles.length; j++) {
          const p2 = this.particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CFG.maxDistance) {
            this.ctx.beginPath();
            this.ctx.moveTo(p.x, p.y);
            this.ctx.lineTo(p2.x, p2.y);
            // Fade line based on distance
            const opacity = 1 - (dist / CFG.maxDistance);
            this.ctx.strokeStyle = `rgba(30, 184, 231, ${opacity * 0.3})`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
          }
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

  function boot() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    try {
      const cvs = document.getElementById("particles");
      if (cvs) new Constellation(cvs);
    } catch (e) {
      console.warn("[animations] Constellation failed:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

(function () {
  "use strict";

  const CFG = {
    particleCount: 200,
    baseRadius: 1.5,
    color: "rgba(30, 184, 231, 0.7)",
    glow: "rgba(30, 184, 231, 0.2)",
    speed: 1,
    mouseRadius: 150,
    clickForce: 20,
    fps: 60
  };

  class InteractiveSwarm {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      this.mouse = { x: -1000, y: -1000, clicked: false };
      
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
      const pCount = Math.min(CFG.particleCount, Math.floor((this.w * this.h) / 5000));
      for (let i = 0; i < pCount; i++) {
        this.particles.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          vx: (Math.random() - 0.5) * CFG.speed,
          vy: (Math.random() - 0.5) * CFG.speed,
          baseVx: (Math.random() - 0.5) * CFG.speed,
          baseVy: (Math.random() - 0.5) * CFG.speed,
          size: Math.random() * CFG.baseRadius + 0.5
        });
      }
    }

    _bind() {
      window.addEventListener("resize", () => this._resize());
      window.addEventListener("mousemove", (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
      window.addEventListener("mouseleave", () => { this.mouse.x = -1000; this.mouse.y = -1000; });
      window.addEventListener("mousedown", () => { this.mouse.clicked = true; });
      window.addEventListener("mouseup", () => { this.mouse.clicked = false; });
      window.addEventListener("touchstart", (e) => { this.mouse.x = e.touches[0].clientX; this.mouse.y = e.touches[0].clientY; this.mouse.clicked = true; });
      window.addEventListener("touchend", () => { this.mouse.x = -1000; this.mouse.y = -1000; this.mouse.clicked = false; });
    }

    _draw() {
      this.ctx.clearRect(0, 0, this.w, this.h);

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vx += (p.baseVx - p.vx) * 0.05;
        p.vy += (p.baseVy - p.vy) * 0.05;

        if (p.x < 0 || p.x > this.w) { p.vx *= -1; p.baseVx *= -1; p.x = Math.max(0, Math.min(this.w, p.x)); }
        if (p.y < 0 || p.y > this.h) { p.vy *= -1; p.baseVy *= -1; p.y = Math.max(0, Math.min(this.h, p.y)); }

        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < CFG.mouseRadius) {
          if (this.mouse.clicked) {
            const force = (CFG.mouseRadius - dist) / CFG.mouseRadius;
            p.vx -= (dx / dist) * force * CFG.clickForce;
            p.vy -= (dy / dist) * force * CFG.clickForce;
          } else {
            const force = (dist / CFG.mouseRadius);
            p.vx += (dx / dist) * force * 0.2;
            p.vy += (dy / dist) * force * 0.2;
          }
          
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(this.mouse.x, this.mouse.y);
          this.ctx.strokeStyle = `rgba(30, 184, 231, ${(1 - dist/CFG.mouseRadius) * 0.2})`;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }

        this.ctx.beginPath();
        this.ctx.fillStyle = CFG.color;
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.fillStyle = CFG.glow;
        this.ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        this.ctx.fill();
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
  if (cvs) new InteractiveSwarm(cvs);
})();

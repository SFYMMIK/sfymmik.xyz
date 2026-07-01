(function () {
  "use strict";

  const CFG = {
    ringCount: 30,
    speed: 1.02,     // How fast the rings scale up (zoom speed)
    rotationSpeed: 0.005,
    color: "rgba(30, 184, 231, 0.5)",
    glowColor: "rgba(30, 184, 231, 0.9)",
    sides: 6,        // Hexagonal tunnel
    fps: 60
  };

  class Wormhole {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      
      this._resize();
      this._initRings();
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
      this.maxRadius = Math.max(this.w, this.h);
    }

    _initRings() {
      this.rings = [];
      // Distribute rings exponentially for 3D depth effect
      for (let i = 0; i < CFG.ringCount; i++) {
        this.rings.push({
          radius: Math.pow(CFG.speed, i * (300 / CFG.ringCount)), // Initial size
          angle: i * 0.1
        });
      }
    }

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this._resize(), 200);
      });
    }

    _drawPolygon(x, y, radius, sides, angle) {
      this.ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const a = angle + (Math.PI * 2 * i) / sides;
        const px = x + radius * Math.cos(a);
        const py = y + radius * Math.sin(a);
        if (i === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }

    _draw() {
      // Very faint trail to blur the deep tunnel
      this.ctx.fillStyle = "rgba(10, 10, 14, 0.3)";
      this.ctx.fillRect(0, 0, this.w, this.h);

      for (let i = 0; i < this.rings.length; i++) {
        const r = this.rings[i];
        
        // Zoom and rotate
        r.radius *= CFG.speed;
        r.angle += CFG.rotationSpeed;

        // Reset if it gets too large
        if (r.radius > this.maxRadius) {
          r.radius = 1; // Send back to the very center
        }

        // Calculate opacity based on depth (smaller = darker/further away)
        const opacity = Math.min(1, r.radius / (this.maxRadius * 0.3));
        const fadeOut = Math.max(0, 1 - (r.radius / this.maxRadius)); // Fade slightly before clipping

        this.ctx.strokeStyle = `rgba(30, 184, 231, ${opacity * fadeOut * 0.8})`;
        this.ctx.lineWidth = Math.max(0.5, r.radius * 0.005);
        
        // Glow effect
        this.ctx.shadowBlur = r.radius > this.maxRadius * 0.5 ? 15 : 0;
        this.ctx.shadowColor = CFG.glowColor;

        this._drawPolygon(this.cx, this.cy, r.radius, CFG.sides, r.angle);
      }
      this.ctx.shadowBlur = 0;
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
  if (cvs) new Wormhole(cvs);
})();

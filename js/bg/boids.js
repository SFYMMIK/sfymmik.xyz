(function () {
  "use strict";

  const CFG = {
    boidCount: 150,
    color: "#1eb8e7",
    maxSpeed: 2,
    maxForce: 0.05,
    visualRange: 50,
    fps: 60
  };

  class Boids {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      
      this._resize();
      this._initBoids();
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

    _initBoids() {
      this.boids = [];
      const count = Math.min(CFG.boidCount, Math.floor((this.w * this.h) / 8000));
      for (let i = 0; i < count; i++) {
        this.boids.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          vx: (Math.random() - 0.5) * CFG.maxSpeed,
          vy: (Math.random() - 0.5) * CFG.maxSpeed
        });
      }
    }

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          this._resize();
          this._initBoids();
        }, 200);
      });
    }

    _distance(b1, b2) {
      return Math.sqrt((b1.x - b2.x)**2 + (b1.y - b2.y)**2);
    }

    _draw() {
      this.ctx.fillStyle = "rgba(10, 10, 14, 0.4)";
      this.ctx.fillRect(0, 0, this.w, this.h);

      for (let i = 0; i < this.boids.length; i++) {
        let b = this.boids[i];
        
        // Flocking variables
        let centerX = 0, centerY = 0, avgVx = 0, avgVy = 0, numNeighbors = 0;
        let sepX = 0, sepY = 0;

        for (let j = 0; j < this.boids.length; j++) {
          if (i === j) continue;
          let other = this.boids[j];
          let dist = this._distance(b, other);

          if (dist < CFG.visualRange) {
            centerX += other.x;
            centerY += other.y;
            avgVx += other.vx;
            avgVy += other.vy;
            numNeighbors++;

            if (dist < 20) {
              sepX += b.x - other.x;
              sepY += b.y - other.y;
            }
          }
        }

        if (numNeighbors > 0) {
          // Cohesion
          centerX /= numNeighbors;
          centerY /= numNeighbors;
          b.vx += (centerX - b.x) * 0.005;
          b.vy += (centerY - b.y) * 0.005;

          // Alignment
          avgVx /= numNeighbors;
          avgVy /= numNeighbors;
          b.vx += (avgVx - b.vx) * 0.05;
          b.vy += (avgVy - b.vy) * 0.05;
        }

        // Separation
        b.vx += sepX * 0.05;
        b.vy += sepY * 0.05;

        // Limit speed
        let speed = Math.sqrt(b.vx**2 + b.vy**2);
        if (speed > CFG.maxSpeed) {
          b.vx = (b.vx / speed) * CFG.maxSpeed;
          b.vy = (b.vy / speed) * CFG.maxSpeed;
        }

        // Move
        b.x += b.vx;
        b.y += b.vy;

        // Wrap edges
        if (b.x < 0) b.x = this.w;
        if (b.x > this.w) b.x = 0;
        if (b.y < 0) b.y = this.h;
        if (b.y > this.h) b.y = 0;

        // Draw Triangle
        let angle = Math.atan2(b.vy, b.vx);
        this.ctx.save();
        this.ctx.translate(b.x, b.y);
        this.ctx.rotate(angle);
        this.ctx.beginPath();
        this.ctx.moveTo(4, 0);
        this.ctx.lineTo(-4, 3);
        this.ctx.lineTo(-4, -3);
        this.ctx.closePath();
        this.ctx.fillStyle = CFG.color;
        this.ctx.fill();
        this.ctx.restore();
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
  if (cvs) new Boids(cvs);
})();

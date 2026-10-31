(function () {
  "use strict";

  const CFG = {
    maxCount: 140,
    color: "rgba(108, 172, 236, 0.9)",
    accentColor: "rgba(90, 230, 124, 0.8)",
    accentChance: 0.04,
    maxSpeed: 2,
    visualRange: 50,
    separationRange: 20,
    fade: "rgba(10, 10, 14, 0.35)",
    fps: 60
  };

  class Boids {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");

      this._resize();
      this._initBoids();
      this._bind();

      this.loop = new window.BgLoop(() => this._draw(), CFG.fps);
      this.loop.start();
    }

    _resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.w = window.innerWidth;
      this.h = window.innerHeight;
      this.cvs.width = Math.round(this.w * dpr);
      this.cvs.height = Math.round(this.h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    _initBoids() {
      const count = Math.min(CFG.maxCount, Math.floor((this.w * this.h) / 9000));
      this.boids = [];
      for (let i = 0; i < count; i++) {
        this.boids.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          vx: (Math.random() - 0.5) * CFG.maxSpeed,
          vy: (Math.random() - 0.5) * CFG.maxSpeed,
          accent: Math.random() < CFG.accentChance
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

    // spatial grid: only check neighbours
    _buildGrid() {
      const cell = CFG.visualRange;
      const cols = Math.ceil(this.w / cell) + 1;
      const rows = Math.ceil(this.h / cell) + 1;
      const size = cols * rows;

      // reuse the grid between frames
      if (!this.grid || this.grid.length !== size) {
        this.grid = new Array(size);
        for (let i = 0; i < size; i++) this.grid[i] = [];
      } else {
        for (let i = 0; i < size; i++) this.grid[i].length = 0;
      }

      const grid = this.grid;
      for (let i = 0; i < this.boids.length; i++) {
        const b = this.boids[i];
        const cx = Math.min(cols - 1, Math.max(0, (b.x / cell) | 0));
        const cy = Math.min(rows - 1, Math.max(0, (b.y / cell) | 0));
        grid[cy * cols + cx].push(b);
      }

      this.cols = cols;
      this.rows = rows;
      this.cell = cell;
    }

    _draw() {
      const ctx = this.ctx;
      ctx.fillStyle = CFG.fade;
      ctx.fillRect(0, 0, this.w, this.h);

      this._buildGrid();

      const range = CFG.visualRange;
      const range2 = range * range;
      const sep2 = CFG.separationRange * CFG.separationRange;
      const maxSpeed2 = CFG.maxSpeed * CFG.maxSpeed;

      for (let i = 0; i < this.boids.length; i++) {
        const b = this.boids[i];

        let centerX = 0, centerY = 0, avgVx = 0, avgVy = 0, num = 0;
        let sepX = 0, sepY = 0;

        const cx = Math.min(this.cols - 1, Math.max(0, (b.x / this.cell) | 0));
        const cy = Math.min(this.rows - 1, Math.max(0, (b.y / this.cell) | 0));

        for (let gy = cy - 1; gy <= cy + 1; gy++) {
          if (gy < 0 || gy >= this.rows) continue;
          for (let gx = cx - 1; gx <= cx + 1; gx++) {
            if (gx < 0 || gx >= this.cols) continue;
            const bucket = this.grid[gy * this.cols + gx];
            if (!bucket) continue;

            for (let k = 0; k < bucket.length; k++) {
              const other = bucket[k];
              if (other === b) continue;

              const dx = other.x - b.x;
              const dy = other.y - b.y;
              const d2 = dx * dx + dy * dy;
              if (d2 > range2 || d2 === 0) continue;

              centerX += other.x;
              centerY += other.y;
              avgVx += other.vx;
              avgVy += other.vy;
              num++;

              if (d2 < sep2) {
                sepX += b.x - other.x;
                sepY += b.y - other.y;
              }
            }
          }
        }

        if (num > 0) {
          // cohesion
          b.vx += ((centerX / num) - b.x) * 0.005;
          b.vy += ((centerY / num) - b.y) * 0.005;
          // alignment
          b.vx += ((avgVx / num) - b.vx) * 0.05;
          b.vy += ((avgVy / num) - b.vy) * 0.05;
        }

        // separation
        b.vx += sepX * 0.05;
        b.vy += sepY * 0.05;

        // limit speed
        const speed2 = b.vx * b.vx + b.vy * b.vy;
        if (speed2 > maxSpeed2) {
          const inv = CFG.maxSpeed / Math.sqrt(speed2);
          b.vx *= inv;
          b.vy *= inv;
        }

        // move + wrap
        b.x += b.vx;
        b.y += b.vy;
        if (b.x < 0) b.x = this.w;
        if (b.x > this.w) b.x = 0;
        if (b.y < 0) b.y = this.h;
        if (b.y > this.h) b.y = 0;
      }

      // all triangles in one path
      this._fillBoids(ctx, false);
      this._fillBoids(ctx, true);
    }

    _fillBoids(ctx, accent) {
      ctx.beginPath();
      let any = false;

      for (let i = 0; i < this.boids.length; i++) {
        const b = this.boids[i];
        if (b.accent !== accent) continue;
        any = true;

        const angle = Math.atan2(b.vy, b.vx);
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);

        ctx.moveTo(b.x + ca * 4, b.y + sa * 4);
        ctx.lineTo(b.x + (-4 * ca - 3 * sa), b.y + (-4 * sa + 3 * ca));
        ctx.lineTo(b.x + (-4 * ca + 3 * sa), b.y + (-4 * sa - 3 * ca));
        ctx.closePath();
      }

      if (!any) return;
      ctx.fillStyle = accent ? CFG.accentColor : CFG.color;
      ctx.fill();
    }
  }

  const cvs = document.getElementById("particles");
  if (cvs) new Boids(cvs);
})();

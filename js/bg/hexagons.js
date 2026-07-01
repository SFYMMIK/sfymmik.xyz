(function () {
  "use strict";

  const CFG = {
    hexSize: 30, // Radius of hexagon
    color: "rgba(30, 184, 231, 0.1)", // Base color
    glowColor: "rgba(30, 184, 231, 0.8)", // Highlight color
    mouseRadius: 150, // Hover radius
    fps: 30
  };

  class Hexagons {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      this.mouse = { x: -1000, y: -1000 };
      
      this._resize();
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
      
      // Calculate hexagon math
      this.hexWidth = Math.sqrt(3) * CFG.hexSize;
      this.hexHeight = 2 * CFG.hexSize;
      
      this.cols = Math.ceil(this.w / this.hexWidth) + 1;
      this.rows = Math.ceil(this.h / (this.hexHeight * 0.75)) + 1;
    }

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this._resize(), 200);
      });
      window.addEventListener("mousemove", (e) => {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });
      window.addEventListener("mouseleave", () => {
        this.mouse.x = -1000;
        this.mouse.y = -1000;
      });
    }

    _drawHex(x, y, r, opacity) {
      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - (Math.PI / 6);
        const px = x + r * Math.cos(angle);
        const py = y + r * Math.sin(angle);
        if (i === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();
      
      this.ctx.strokeStyle = CFG.color;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      if (opacity > 0) {
        this.ctx.fillStyle = `rgba(30, 184, 231, ${opacity})`;
        this.ctx.fill();
      }
    }

    _draw() {
      this.ctx.clearRect(0, 0, this.w, this.h);

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const x = c * this.hexWidth + (r % 2 === 1 ? this.hexWidth / 2 : 0);
          const y = r * this.hexHeight * 0.75;

          const dx = this.mouse.x - x;
          const dy = this.mouse.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let opacity = 0;
          if (dist < CFG.mouseRadius) {
            opacity = (1 - (dist / CFG.mouseRadius)) * 0.6; // Fade out based on distance
          }

          this._drawHex(x, y, CFG.hexSize, opacity);
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
  if (cvs) new Hexagons(cvs);
})();

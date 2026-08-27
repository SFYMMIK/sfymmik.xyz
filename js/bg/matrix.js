(function () {
  "use strict";

  const CFG = {
    color: "#1eb8e7",
    font: "15px IBMBIOS2y, monospace",
    fps: 30
  };

  class MatrixRain {
    constructor(canvas) {
      this.cvs = canvas;
      this.ctx = canvas.getContext("2d");
      
      this.chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
      this.fontSize = 15;
      
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
      
      this.columns = Math.floor(this.w / this.fontSize) + 1;
      this.drops = [];
      for (let x = 0; x < this.columns; x++) {
        this.drops[x] = Math.random() * -100; // Start off screen
      }
    }

    _bind() {
      let resizeTimer;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => this._resize(), 200);
      });
    }

    _draw() {
      this.ctx.fillStyle = "rgba(10, 10, 14, 0.1)";
      this.ctx.fillRect(0, 0, this.w, this.h);

      this.ctx.fillStyle = CFG.color;
      this.ctx.font = CFG.font;

      for (let i = 0; i < this.drops.length; i++) {
        const text = this.chars[Math.floor(Math.random() * this.chars.length)];
        this.ctx.fillText(text, i * this.fontSize, this.drops[i] * this.fontSize);

        if (this.drops[i] * this.fontSize > this.h && Math.random() > 0.975) {
          this.drops[i] = 0;
        }
        this.drops[i]++;
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
  if (cvs) new MatrixRain(cvs);
})();

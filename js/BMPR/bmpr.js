/*
 * bmpr.js
 * Copyright 2026 Lings
 *
 * Main developer: Szymon Grajner (SfymmiK)
 *
 * Licensed under the Apache License 2.0
 */

(() => {
    class BMPR extends HTMLElement {
        static get observedAttributes() {
            return ["src", "alt", "width", "height"];
        }

        constructor() {
            super();
            this.attachShadow({ mode: "open" });

            this.canvas = document.createElement("canvas");
            this.ctx = this.canvas.getContext("2d");

            this.fallback = document.createElement("span");

            const style = document.createElement("style");
            style.textContent = `
            :host {
                display: inline-block;
                overflow: hidden;
                vertical-align: middle;
            }

            canvas {
                display: block;
                max-width: 100%;
                height: auto;
                image-rendering: pixelated;
            }

            .fallback {
                display: none;
                font: 14px sans-serif;
                color: #666;
            }

            :host([error]) canvas {
                display: none;
            }

            :host([error]) .fallback {
                display: inline;
            }
            `;

            this.fallback.className = "fallback";
            this.shadowRoot.append(style, this.canvas, this.fallback);
        }

        connectedCallback() {
            this.updateAlt();
            this.updateSize();
            this.loadBMP();
        }

        attributeChangedCallback(name, oldValue, newValue) {
            if (oldValue === newValue) return;
            if (name === "alt") this.updateAlt();
            if (name === "width" || name === "height") this.updateSize();
            if (name === "src") this.loadBMP();
        }

        get src() {
            return this.getAttribute("src") || "";
        }

        set src(value) {
            if (value == null) this.removeAttribute("src");
            else this.setAttribute("src", value);
        }

        get alt() {
            return this.getAttribute("alt") || "";
        }

        set alt(value) {
            if (value == null) this.removeAttribute("alt");
            else this.setAttribute("alt", value);
        }

        updateAlt() {
            const alt = this.alt;
            this.fallback.textContent = alt;
            this.setAttribute("role", "img");

            if (alt) this.setAttribute("aria-label", alt);
            else this.removeAttribute("aria-label");
        }

        updateSize() {
            const width = this.getAttribute("width");
            const height = this.getAttribute("height");

            if (width) this.style.width = this.normalizeSize(width);
            else this.style.removeProperty("width");

            if (height) this.style.height = this.normalizeSize(height);
            else this.style.removeProperty("height");
        }

        normalizeSize(value) {
            const v = String(value).trim();
            if (/^\d+$/.test(v)) return v + "px";
            return v;
        }

        async loadBMP() {
            const src = this.src;
            if (!src) return;

            try {
                this.removeAttribute("error");

                const res = await fetch(src);
                if (!res.ok) throw new Error("BMP-IMG: Failed to fetch BMP");

                const buffer = await res.arrayBuffer();
                const bmp = this.parseBMP(buffer);
                this.drawBMP(bmp);

                this.dispatchEvent(new Event("load"));
            } catch (err) {
                this.setAttribute("error", "");
                console.error("BMP-IMG error:", err);
                this.dispatchEvent(new Event("error"));
            }
        }

        parseBMP(buffer) {
            const dv = new DataView(buffer);

            if (dv.getUint16(0, true) !== 0x4D42) {
                throw new Error("BMP-IMG: Not a BMP file");
            }

            const pixelOffset = dv.getUint32(10, true);
            const dibSize = dv.getUint32(14, true);
            const width = dv.getInt32(18, true);
            let height = dv.getInt32(22, true);
            const planes = dv.getUint16(26, true);
            const bpp = dv.getUint16(28, true);
            const compression = dv.getUint32(30, true);
            const colorsUsed = dv.getUint32(46, true);

            if (planes !== 1) throw new Error("BMP-IMG: Invalid BMP");
            if (compression !== 0) throw new Error("BMP-IMG: Compressed BMP not supported");

            const topDown = height < 0;
            if (topDown) height = -height;

            if (![1, 4, 8, 24, 32].includes(bpp)) {
                throw new Error("BMP-IMG: Unsupported BMP bit depth: " + bpp);
            }

            let palette = null;

            if (bpp <= 8) {
                const paletteSize = colorsUsed || (1 << bpp);
                palette = [];
                let offset = 14 + dibSize;

                for (let i = 0; i < paletteSize; i++) {
                    const b = dv.getUint8(offset++);
                    const g = dv.getUint8(offset++);
                    const r = dv.getUint8(offset++);
                    offset++;
                    palette.push([r, g, b, 255]);
                }
            }

            return {
                width,
 height,
 bpp,
 topDown,
 pixelOffset,
 palette,
 dv
            };
        }

        drawBMP(bmp) {
            const { width, height, bpp, topDown, pixelOffset, palette, dv } = bmp;

            this.canvas.width = width;
            this.canvas.height = height;

            if (!this.hasAttribute("width") && !this.hasAttribute("height")) {
                this.style.width = width + "px";
                this.style.height = height + "px";
            } else if (this.hasAttribute("width") && !this.hasAttribute("height")) {
                this.style.height = "auto";
            }

            const imageData = this.ctx.createImageData(width, height);
            const out = imageData.data;
            const rowSize = Math.floor((bpp * width + 31) / 32) * 4;

            for (let y = 0; y < height; y++) {
                const srcY = topDown ? y : (height - 1 - y);
                const rowStart = pixelOffset + srcY * rowSize;

                if (bpp === 24) {
                    for (let x = 0; x < width; x++) {
                        const src = rowStart + x * 3;
                        const dst = (y * width + x) * 4;

                        out[dst] = dv.getUint8(src + 2);
                        out[dst + 1] = dv.getUint8(src + 1);
                        out[dst + 2] = dv.getUint8(src);
                        out[dst + 3] = 255;
                    }
                } else if (bpp === 32) {
                    for (let x = 0; x < width; x++) {
                        const src = rowStart + x * 4;
                        const dst = (y * width + x) * 4;

                        out[dst] = dv.getUint8(src + 2);
                        out[dst + 1] = dv.getUint8(src + 1);
                        out[dst + 2] = dv.getUint8(src);
                        out[dst + 3] = dv.getUint8(src + 3);
                    }
                } else if (bpp === 8) {
                    for (let x = 0; x < width; x++) {
                        const idx = dv.getUint8(rowStart + x);
                        const c = palette[idx] || [0, 0, 0, 255];
                        const dst = (y * width + x) * 4;

                        out[dst] = c[0];
                        out[dst + 1] = c[1];
                        out[dst + 2] = c[2];
                        out[dst + 3] = c[3];
                    }
                } else if (bpp === 4) {
                    for (let x = 0; x < width; x++) {
                        const byte = dv.getUint8(rowStart + (x >> 1));
                        const idx = (x % 2 === 0) ? ((byte >> 4) & 0x0f) : (byte & 0x0f);
                        const c = palette[idx] || [0, 0, 0, 255];
                        const dst = (y * width + x) * 4;

                        out[dst] = c[0];
                        out[dst + 1] = c[1];
                        out[dst + 2] = c[2];
                        out[dst + 3] = c[3];
                    }
                } else if (bpp === 1) {
                    for (let x = 0; x < width; x++) {
                        const byte = dv.getUint8(rowStart + (x >> 3));
                        const bit = 7 - (x & 7);
                        const idx = (byte >> bit) & 1;
                        const c = palette[idx] || [0, 0, 0, 255];
                        const dst = (y * width + x) * 4;

                        out[dst] = c[0];
                        out[dst + 1] = c[1];
                        out[dst + 2] = c[2];
                        out[dst + 3] = c[3];
                    }
                }
            }

            this.ctx.putImageData(imageData, 0, 0);
        }
    }

    if (!customElements.get("bmp-img")) {
        customElements.define("bmp-img", BMPR);
    }
})();

"use strict";

const MC_UUID = "a7ef912181ed4291b4d6cfc1105bcb5a";
const MINETOOLS_API = `https://api.minetools.eu/profile/${MC_UUID}`;
// skinview3d: only load when the card opens
const SKINVIEW3D_CDN = "https://cdn.jsdelivr.net/npm/skinview3d@3.0.0-alpha.1/bundles/skinview3d.bundle.min.js";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const mcNicknameEl = document.getElementById("mc-nickname");
  const mcViewerContainer = document.getElementById("mc-3d-viewer");
  const cardItem = document.getElementById("game-mc");

  if (!mcNicknameEl || !mcViewerContainer || !cardItem) return;

  let initialized = false;

  // lazy: first open only
  async function loadViewer() {
    if (initialized) return;
    initialized = true;

    try {
      const response = await fetch(MINETOOLS_API);
      if (!response.ok) throw new Error("Failed to fetch MC profile");

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const profile = data.decoded;
      mcNicknameEl.textContent = profile.profileName;

      // textures
      let skinUrl = profile.textures.SKIN?.url;
      let capeUrl = profile.textures.CAPE?.url;

      // force https
      if (skinUrl) skinUrl = skinUrl.replace("http://", "https://");
      if (capeUrl) capeUrl = capeUrl.replace("http://", "https://");

      if (typeof skinview3d === "undefined") {
        await loadScript(SKINVIEW3D_CDN);
      }

      // init viewer
      const viewer = new skinview3d.SkinViewer({
        canvas: document.createElement("canvas"),
        width: 300,
        height: 300,
        skin: skinUrl
      });

      mcViewerContainer.appendChild(viewer.canvas);

      // keep canvas sized
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            viewer.width = entry.contentRect.width;
            viewer.height = entry.contentRect.height;
          }
        }
      });
      resizeObserver.observe(mcViewerContainer);

      if (capeUrl) {
        Promise.resolve(viewer.loadCape(capeUrl)).catch(() => {
          console.warn("MC Stats: failed to load cape");
        });
      }

      // walk + rotate
      viewer.animation = new skinview3d.WalkingAnimation();
      viewer.autoRotate = true;
    } catch (err) {
      console.error("MC Stats Error:", err);
      mcNicknameEl.textContent = "Error loading";
      mcViewerContainer.textContent = err.message;
    }
  }

  document.addEventListener("gamecard:open", (e) => {
    if (e.target === cardItem) loadViewer();
  });
});

"use strict";

const MC_UUID = "a7ef912181ed4291b4d6cfc1105bcb5a";
const MINETOOLS_API = `https://api.minetools.eu/profile/${MC_UUID}`;

document.addEventListener("DOMContentLoaded", async () => {
  const mcNicknameEl = document.getElementById("mc-nickname");
  const mcViewerContainer = document.getElementById("mc-3d-viewer");

  try {
    const response = await fetch(MINETOOLS_API);
    if (!response.ok) throw new Error("Failed to fetch MC profile");
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const profile = data.decoded;
    mcNicknameEl.textContent = profile.profileName;

    // Retrieve textures
    let skinUrl = profile.textures.SKIN?.url;
    let capeUrl = profile.textures.CAPE?.url;

    // Force HTTPS to avoid mixed content and CORS issues
    if (skinUrl) skinUrl = skinUrl.replace("http://", "https://");
    if (capeUrl) capeUrl = capeUrl.replace("http://", "https://");

    // Initialize skinview3d
    if (typeof skinview3d !== 'undefined') {
      const viewer = new skinview3d.SkinViewer({
        canvas: document.createElement("canvas"),
        width: mcViewerContainer.clientWidth || 300,
        height: mcViewerContainer.clientHeight || 300,
        skin: skinUrl
      });
      
      mcViewerContainer.appendChild(viewer.canvas);

      if (capeUrl) {
        viewer.loadCape(capeUrl);
      }

      // Add animations
      viewer.animation = new skinview3d.WalkingAnimation();
      viewer.autoRotate = true;

      // Handle window resize for responsive canvas
      window.addEventListener("resize", () => {
        viewer.width = mcViewerContainer.clientWidth || 300;
        viewer.height = mcViewerContainer.clientHeight || 300;
      });
    } else {
      mcViewerContainer.textContent = "Error: 3D Viewer failed to load.";
    }
  } catch (err) {
    console.error("MC Stats Error:", err);
    mcNicknameEl.textContent = "Error loading";
    mcViewerContainer.textContent = err.message;
  }
});

// fade in only when js runs
document.documentElement.classList.add("js");

// motion off = OS setting or the footer toggle, mirrored onto <html>
const MOTION_STORE_KEY = "sfymmik.motionOff";
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

let siteMotionOff = false;
try {
  siteMotionOff = window.localStorage.getItem(MOTION_STORE_KEY) === "1";
} catch (e) { /* storage unavailable — keep the default */ }

function applyMotionState() {
  const root = document.documentElement;
  root.classList.toggle("reduced-motion", motionQuery.matches);
  root.classList.toggle("motion-off", siteMotionOff);
  window.dispatchEvent(new CustomEvent("motionchange"));
}

applyMotionState();
motionQuery.addEventListener("change", applyMotionState);

// never leave the page invisible
setTimeout(() => {
  if (document.body) document.body.classList.add("loaded");
}, 1500);

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("loaded");

  // linkback tabs
  const tabBmpr = document.getElementById("tabBmpr");
  const tabImg = document.getElementById("tabImg");
  const codeBmpr = document.getElementById("codeBmpr");
  const codeImg = document.getElementById("codeImg");

  function selectTab(showBmpr) {
    if (!tabBmpr || !tabImg || !codeBmpr || !codeImg) return;
    codeBmpr.hidden = !showBmpr;
    codeImg.hidden = showBmpr;
    tabBmpr.classList.toggle("active", showBmpr);
    tabImg.classList.toggle("active", !showBmpr);
  }

  tabBmpr?.addEventListener("click", () => selectTab(true));
  tabImg?.addEventListener("click", () => selectTab(false));

  // stop animations toggle
  const motionToggle = document.getElementById("motionToggle");
  if (motionToggle) {
    const syncButton = () => {
      motionToggle.textContent = siteMotionOff ? "resume animations" : "stop animations";
      motionToggle.setAttribute("aria-pressed", String(siteMotionOff));
      motionToggle.title = motionQuery.matches
        ? "Your system's reduce-motion setting is disabling animations"
        : "Pause the background and interface animations";
    };

    syncButton();
    motionToggle.addEventListener("click", () => {
      siteMotionOff = !siteMotionOff;
      try {
        window.localStorage.setItem(MOTION_STORE_KEY, siteMotionOff ? "1" : "0");
      } catch (e) { /* ignore */ }
      applyMotionState();
      syncButton();
    });
  }
});

// fade in only when js runs
document.documentElement.classList.add("js");

// null = follow the OS, "off" = user disabled, "force" = user forced it back on
const MOTION_STORE_KEY = "sfymmik.motionOff";
const motionQuery = typeof window.matchMedia === "function"
  ? window.matchMedia("(prefers-reduced-motion: reduce)")
  : { matches: false, addEventListener: null, addListener: null };

let motionChoice = null;
try {
  const stored = window.localStorage.getItem(MOTION_STORE_KEY);
  if (stored === "1") motionChoice = "off";
  else if (stored === "force") motionChoice = "force";
  else if (stored === "0") {
    // old "0" meant on; follow the OS now
    window.localStorage.removeItem(MOTION_STORE_KEY);
  }
} catch (e) { /* storage unavailable, follow the OS */ }

function motionIsReduced() {
  if (motionChoice === "off") return true;
  if (motionChoice === "force") return false;
  return !!motionQuery.matches;
}

function applyMotionState() {
  const root = document.documentElement;
  const reduced = motionIsReduced();
  root.classList.toggle("reduced-motion", reduced);
  root.classList.toggle("motion-off", motionChoice === "off");
  root.classList.toggle("force-motion", motionChoice === "force");
  window.dispatchEvent(new CustomEvent("motionchange"));
}

applyMotionState();
// safari < 14 uses addListener
if (typeof motionQuery.addEventListener === "function") {
  motionQuery.addEventListener("change", applyMotionState);
} else if (typeof motionQuery.addListener === "function") {
  motionQuery.addListener(applyMotionState);
}

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
    tabBmpr.setAttribute("aria-pressed", String(showBmpr));
    tabImg.setAttribute("aria-pressed", String(!showBmpr));
  }

  tabBmpr?.addEventListener("click", () => selectTab(true));
  tabImg?.addEventListener("click", () => selectTab(false));

  // stop animations toggle
  const motionToggle = document.getElementById("motionToggle");
  if (motionToggle) {
    const syncButton = () => {
      const reduced = motionIsReduced();
      const osReduce = !!motionQuery.matches;

      motionToggle.textContent = reduced
        ? (osReduce ? "enable animations" : "resume animations")
        : "stop animations";
      motionToggle.setAttribute("aria-pressed", String(reduced));

      if (reduced && osReduce) {
        motionToggle.title = "Your system requests reduced motion. Click to enable animations for this site.";
      } else if (reduced) {
        motionToggle.title = "Resume the background and interface animations.";
      } else if (osReduce && motionChoice === "force") {
        motionToggle.title = "Animations are on because you enabled them for this site.";
      } else {
        motionToggle.title = "Pause the background and interface animations.";
      }
    };

    syncButton();
    motionToggle.addEventListener("click", () => {
      if (motionIsReduced()) {
        if (motionQuery.matches) {
          // user wants animations despite reduced-motion
          motionChoice = "force";
          try {
            window.localStorage.setItem(MOTION_STORE_KEY, "force");
          } catch (e) { /* ignore */ }
        } else {
          // back to following the OS
          motionChoice = null;
          try {
            window.localStorage.removeItem(MOTION_STORE_KEY);
          } catch (e) { /* ignore */ }
        }
      } else {
        motionChoice = "off";
        try {
          window.localStorage.setItem(MOTION_STORE_KEY, "1");
        } catch (e) { /* ignore */ }
      }
      applyMotionState();
    });

    window.addEventListener("motionchange", syncButton);
  }
});

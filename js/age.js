"use strict";

// age counter
// birth date (local time)
const BIRTH_DATE = new Date("2010-09-04T00:00:00");

document.addEventListener("DOMContentLoaded", () => {
  const els = document.querySelectorAll(".my-age");
  if (!els.length) return;

  const YEAR_MS = 1000 * 60 * 60 * 24 * 365.25;
  let timer = null;

  function update() {
    const now = Date.now();
    const age = (now - BIRTH_DATE.getTime()) / YEAR_MS;

    // days until birthday (tooltip)
    const next = new Date(BIRTH_DATE);
    next.setFullYear(new Date(now).getFullYear());
    if (now > next.getTime()) next.setFullYear(next.getFullYear() + 1);
    const daysLeft = Math.floor((next.getTime() - now) / (1000 * 60 * 60 * 24));

    for (const el of els) {
      el.textContent = age.toFixed(15);
      el.title = `${daysLeft} days left until my birthday`;
    }
  }

  // slow down when motion is off
  function calm() {
    return document.documentElement.matches(".reduced-motion, .motion-off");
  }

  function schedule() {
    clearInterval(timer);
    timer = setInterval(update, calm() ? 1000 : 100);
  }

  update();
  schedule();
  window.addEventListener("motionchange", schedule);
});

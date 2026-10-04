"use strict";

// game card toggle
document.addEventListener("DOMContentLoaded", () => {
  const triggers = document.querySelectorAll(".game-trigger");

  triggers.forEach((trigger) => {
    const listItem = trigger.closest(".game-list-item");
    if (!listItem) return;

    const toggleCard = (e) => {
      e.preventDefault();
      const open = listItem.classList.toggle("active");
      trigger.setAttribute("aria-expanded", String(open));
      if (open) {
        // tell lazy loaders the card opened
        listItem.dispatchEvent(new CustomEvent("gamecard:open", { bubbles: true }));
      }
    };

    trigger.addEventListener("click", toggleCard);
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        toggleCard(e);
      }
    });
  });
});

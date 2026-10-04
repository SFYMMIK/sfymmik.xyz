"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const quoteTextEl = document.getElementById("quoteText");
  const quoteAuthorEl = document.getElementById("quoteAuthor");

  if (!quoteTextEl || !quoteAuthorEl) return;

  try {
    // from quotes_data.js
    if (typeof ALL_QUOTES === "undefined" || !ALL_QUOTES.length) {
      throw new Error("ALL_QUOTES array is not loaded");
    }

    // only short quotes fit
    const shortQuotes = ALL_QUOTES.filter(q => q.text && q.text.length <= 100);
    if (!shortQuotes.length) {
      throw new Error("No quotes available");
    }

    // random quote, don't repeat the last one
    let index = Math.floor(Math.random() * shortQuotes.length);
    try {
      const last = Number(sessionStorage.getItem("sfymmik.lastQuote"));
      if (shortQuotes.length > 1 && index === last) {
        index = (index + 1 + Math.floor(Math.random() * (shortQuotes.length - 1))) % shortQuotes.length;
      }
      sessionStorage.setItem("sfymmik.lastQuote", String(index));
    } catch (e) { /* storage unavailable — random is still fine */ }

    const quote = shortQuotes[index];
    quoteTextEl.textContent = `"${quote.text}"`;
    quoteAuthorEl.textContent = `- ${quote.author || "Unknown"}`;
  } catch (err) {
    console.error("[Quotes] Error loading quote:", err);
    quoteTextEl.textContent = `"Talk is cheap. Show me the code."`;
    quoteAuthorEl.textContent = `- Linus Torvalds`;
  }
});

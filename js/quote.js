document.addEventListener("DOMContentLoaded", () => {
  const quoteTextEl = document.getElementById("quoteText");
  const quoteAuthorEl = document.getElementById("quoteAuthor");

  if (!quoteTextEl || !quoteAuthorEl) return;

  try {
    // ALL_QUOTES is defined in js/quotes_data.js which is loaded before this script
    if (typeof ALL_QUOTES === "undefined" || !ALL_QUOTES.length) {
      throw new Error("ALL_QUOTES array is not loaded");
    }

    // Filter for short quotes only (max 100 characters)
    const shortQuotes = ALL_QUOTES.filter(q => q.text && q.text.length <= 100);

    // Pick a completely random short quote each time the page loads
    const randomIndex = Math.floor(Math.random() * shortQuotes.length);
    const randomQuote = shortQuotes[randomIndex];

    quoteTextEl.textContent = `"${randomQuote.text}"`;
    quoteAuthorEl.textContent = `- ${randomQuote.author || "Unknown"}`;
  } catch (err) {
    console.error("[Quotes] Error loading daily quote:", err);
    quoteTextEl.textContent = `"Talk is cheap. Show me the code."`;
    quoteAuthorEl.textContent = `- Linus Torvalds`;
  }
});

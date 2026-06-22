const STEAM_64_ID = "76561199104390936"; // JustSfymmiK's Steam ID
const LEETIFY_API_URL = `https://api-public.cs-prod.leetify.com/v3/profile?id=${STEAM_64_ID}`;

// Wingman Rank Names matching CS2 internal IDs (1-18)
const CS_RANK_NAMES = [
  "Unranked",
  "Silver I",
  "Silver II",
  "Silver III",
  "Silver IV",
  "Silver Elite",
  "Silver Elite Master",
  "Gold Nova I",
  "Gold Nova II",
  "Gold Nova III",
  "Gold Nova Master",
  "Master Guardian I",
  "Master Guardian II",
  "Master Guardian Elite",
  "Distinguished Master Guardian",
  "Legendary Eagle",
  "Legendary Eagle Master",
  "Supreme Master First Class",
  "Global Elite"
];

function getPremierColor(rating) {
  if (rating >= 30000) return "gold";
  if (rating >= 25000) return "red";
  if (rating >= 20000) return "fuchsia";
  if (rating >= 15000) return "purple";
  if (rating >= 10000) return "blue";
  if (rating >= 5000) return "lightblue";
  return "grey";
}

document.addEventListener("DOMContentLoaded", async () => {
  const pfpEl = document.getElementById("cs2-pfp");
  const premierEl = document.getElementById("cs2-premier");
  const wingmanNameEl = document.getElementById("cs2-wingman-name");
  const wingmanImgEl = document.getElementById("cs2-wingman-img");

  try {
    const response = await fetch(LEETIFY_API_URL);
    if (!response.ok) throw new Error("Failed to fetch Leetify stats");
    
    const data = await response.json();
    
    // 1. Profile Picture (Optional: Leetify doesn't provide pfp in /v3/profile, so use local or a steam static one)
    pfpEl.src = "images/pfp.png";

    // 2. Premier Rating
    const premierRating = data.ranks?.premier || 0;
    if (premierRating > 0) {
      premierEl.textContent = premierRating.toLocaleString();
      premierEl.className = "cs2-premier-rating"; 
      premierEl.classList.add(`cs2-color-${getPremierColor(premierRating)}`);
    } else {
      premierEl.textContent = "Unranked";
    }

    // 3. Wingman Rank
    const wingmanRankId = data.ranks?.wingman || 0;
    if (wingmanRankId > 0 && wingmanRankId <= 18) {
      wingmanNameEl.textContent = "";
      wingmanImgEl.src = `https://csstats.gg/images/ranks/${wingmanRankId}.png`;
      wingmanImgEl.hidden = false;
    } else {
      wingmanNameEl.textContent = "Unranked";
      wingmanImgEl.hidden = true;
    }

  } catch (error) {
    console.error("CS2 Stats Error:", error);
    premierEl.textContent = "Err: " + error.message;
    wingmanNameEl.textContent = "Error loading";
    wingmanImgEl.hidden = true;
  }
});

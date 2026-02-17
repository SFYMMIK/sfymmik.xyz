document.addEventListener("DOMContentLoaded", () => {
  const USER_ID = "764834366161420299";
  const API_URL = `https://api.lanyard.rest/v1/users/${USER_ID}`;

  // ---- Elements
  const dot = document.getElementById("rpcDot");
  const statusText = document.getElementById("rpcStatusText");

  const avatar = document.getElementById("rpcAvatar");
  const nameEl = document.getElementById("rpcName");

  const gameIcon = document.getElementById("gameIcon");
  const gameEl = document.getElementById("rpcGame");
  const detailsEl = document.getElementById("rpcDetails");

  const spotifyBlock = document.getElementById("spotifyBlock");
  const spCover = document.getElementById("spCover");
  const spTrack = document.getElementById("spTrack");
  const spArtist = document.getElementById("spArtist");

  const copySpotifyBtn = document.getElementById("copySpotifyBtn");
  const copySpotifyStatus = document.getElementById("copySpotifyStatus");

  // ---- Sanity check
  const required = {
    dot, statusText, avatar, nameEl,
    gameIcon, gameEl, detailsEl,
    spotifyBlock, spCover, spTrack, spArtist,
    copySpotifyBtn, copySpotifyStatus
  };

  for (const [k, v] of Object.entries(required)) {
    if (!v) {
      console.error(`[Lanyard widget] Missing element for id="${k}". Check your HTML IDs.`);
      return;
    }
  }

  // ---- Status color
  const statusColor = {
    online: "#3ba55d",
    idle: "#faa61a",
    dnd: "#ed4245",
    offline: "#747f8d"
  };

  function statusLabel(s) {
    return s === "online" ? "Online"
      : s === "idle" ? "Idle"
      : s === "dnd" ? "Do Not Disturb"
      : "Offline";
  }

  // ---- Spotify link copy
  let currentSpotifyUrl = null;

  function spotifyTrackUrl(trackId) {
    return trackId ? `https://open.spotify.com/track/${trackId}` : null;
  }

  async function copyText(text) {
    // Works only on HTTPS/localhost in most browsers
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  function setCopyUi({ enabled, status }) {
    copySpotifyBtn.disabled = !enabled;
    copySpotifyStatus.textContent = status || "";
  }

  copySpotifyBtn.addEventListener("click", async () => {
    if (!currentSpotifyUrl) return;
    try {
      await copyText(currentSpotifyUrl);
      setCopyUi({ enabled: true, status: "Copied to clipboard!!!" });
      setTimeout(() => setCopyUi({ enabled: true, status: "" }), 2000);
    } catch (e) {
      console.error("[Lanyard widget] copy failed:", e);
      setCopyUi({ enabled: true, status: "Copying failed." });
    }
  });

  // ---- Discord Avatar
  function discordAvatarUrl(user) {
    if (user?.avatar) {
      return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
    }
    const disc = Number(user?.discriminator || 0);
    const idx = Number.isFinite(disc) ? (disc % 5) : 0;
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  }

  function pickGame(activities = []) {
    // pick a normal "Playing" activity (ignore spotify)
    return activities.find(a => a.type === 0 && (a.name || "").toLowerCase() !== "spotify")
      || activities.find(a => a.type === 0)
      || null;
  }

  function activityAssetUrl(activity, which = "large") {
    if (!activity?.application_id || !activity?.assets) return null;

    const key = which === "small" ? activity.assets.small_image : activity.assets.large_image;
    if (!key) return null;
    if (key.startsWith("mp:")) return null;

    return `https://cdn.discordapp.com/app-assets/${activity.application_id}/${key}.png`;
  }

  // -------------------------
  // Spotify rendering (FIXED)
  // -------------------------

  // Keep the card visible & stable; just change text.
  // That way it doesn't "randomly disappear" when presence flickers.
  function hideSpotify() {
    spotifyBlock.hidden = false;

    spTrack.textContent = "Not listening to Spotify";
    spArtist.textContent = "—";

    spCover.src = "";
    spCover.hidden = true;

    currentSpotifyUrl = null;
    setCopyUi({ enabled: false, status: "" });
  }

  function showSpotify({ song, artist, albumArtUrl, trackId }) {
    spotifyBlock.hidden = false;

    spTrack.textContent = song || "Unknown track";
    spArtist.textContent = artist || "Unknown artist";

    if (albumArtUrl) {
      spCover.src = albumArtUrl;
      spCover.hidden = false;
    } else {
      spCover.src = "";
      spCover.hidden = true;
    }

    currentSpotifyUrl = spotifyTrackUrl(trackId);
    setCopyUi({ enabled: !!currentSpotifyUrl, status: "" });
  }

  // =========================
  // Main update (REST)
  // =========================
  async function update() {
    try {
      const res = await fetch(`${API_URL}?_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const data = json.data;
      if (!data) throw new Error("No data");

      const user = data.discord_user;
      nameEl.textContent = user?.global_name || user?.username || "—";
      avatar.src = discordAvatarUrl(user);

      // Status
      const st = data.discord_status || "offline";
      dot.style.background = statusColor[st] || statusColor.offline;
      statusText.textContent = statusLabel(st);

      // Spotify (robust)
      // Instead of requiring listening_to_spotify + track_id, we render whenever data.spotify exists.
      // When paused / presence flickers, the card stays stable.
      if (data.spotify) {
        showSpotify({
          song: data.spotify.song || "Unknown track",
          artist: data.spotify.artist || "Unknown artist",
          albumArtUrl: data.spotify.album_art_url || null,
          trackId: data.spotify.track_id || null
        });
      } else {
        hideSpotify();
      }

      // Game + Details + Icon
      const game = pickGame(data.activities || []);
      if (game) {
        gameEl.textContent = game.name || "—";
        detailsEl.textContent = [game.details, game.state].filter(Boolean).join(" • ") || "—";

        const iconUrl = activityAssetUrl(game, "large") || activityAssetUrl(game, "small");
        if (iconUrl) {
          gameIcon.src = iconUrl;
          gameIcon.hidden = false;
        } else {
          gameIcon.hidden = true;
        }
      } else {
        gameEl.textContent = "Not playing any game right now";
        detailsEl.textContent = "—";
        gameIcon.hidden = true;
      }
    } catch (e) {
      console.error("[Lanyard widget] update failed:", e);
      statusText.textContent = "Error";
      dot.style.background = statusColor.offline;
      detailsEl.textContent = "Couldn’t load presence";

      // keep spotify sane
      hideSpotify();

      currentSpotifyUrl = null;
      setCopyUi({ enabled: false, status: "Error" });
    }
  }

  update();
  setInterval(update, 3000);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) update();
  });
  window.addEventListener("focus", () => update());
});
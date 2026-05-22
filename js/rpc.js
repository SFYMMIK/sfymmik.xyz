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
  const spCover = document.getElementById("spCover");
  const spTrack = document.getElementById("spTrack");
  const spArtist = document.getElementById("spArtist");
  const copySpotifyBtn = document.getElementById("copySpotifyBtn");
  const copySpotifyStatus = document.getElementById("copySpotifyStatus");
  // ---- Lyrics Elements
  const lyricsSection = document.getElementById("lyricsSection");
  const lyricsContainer = document.getElementById("lyricsContainer");
  const lyricsStatus = document.getElementById("lyricsStatus");
  // ---- Sanity check
  const required = {
    dot, statusText, avatar, nameEl,
    gameIcon, gameEl, detailsEl,
    spCover, spTrack, spArtist,
    copySpotifyBtn, copySpotifyStatus,
    lyricsSection, lyricsContainer, lyricsStatus
  };
  for (const [k, v] of Object.entries(required)) {
    if (!v) {
      console.error(`[Lanyard widget] Missing element for id="${k}". Check your HTML IDs.`);
      return;
    }
  }
  // ---- Status
  const statusColor = {
    online: "#3ba55d",
    idle: "#faa61a",
    dnd: "#ed4245",
    offline: "#747f8d"
  };
  // ---- Spotify link copy
  let currentSpotifyUrl = null;
  function spotifyTrackUrl(trackId) {
    return trackId ? `https://open.spotify.com/track/${trackId}` : null;
  }
  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
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
      setCopyUi({ enabled: true, status: "Copied ✅" });
      setTimeout(() => setCopyUi({ enabled: true, status: "" }), 1200);
    } catch (e) {
      console.error("[Lanyard widget] copy failed:", e);
      setCopyUi({ enabled: true, status: "Copy failed ❌" });
    }
  });
  function statusLabel(s) {
    return s === "online" ? "Online"
    : s === "idle" ? "Idle"
    : s === "dnd" ? "Do Not Disturb"
    : "Offline";
  }
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
  // =========================================
  //  LYRICS ENGINE
  // =========================================
  let syncedLyrics = [];       // [{time: float (seconds), text: string}]
  let lastLyricsTrackId = null; // avoid refetching the same track
  let spotifyStartMs = null;    // timestamp.start from Lanyard
  let lyricsRafId = null;       // requestAnimationFrame handle
  let lastActiveIdx = -1;       // last highlighted line index
  /**
   * Parse an LRC string into [{time, text}] sorted by time.
   * Supports both [mm:ss.xx] and [mm:ss.xxx] formats.
   */
  function parseLRC(lrc) {
    if (!lrc) return [];
    const parsed = [];
    const re = /\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/;
    for (const raw of lrc.split("\n")) {
      const m = raw.match(re);
      if (m) {
        const t = parseInt(m[1]) * 60 + parseInt(m[2]) + parseInt(m[3].padEnd(3, "0")) / 1000;
        const text = m[4].trim();
        if (text) parsed.push({ time: t, text });
      }
    }
    return parsed.sort((a, b) => a.time - b.time);
  }
  /**
   * Fetch synced lyrics from lrclib.net.
   * Tries an exact /api/get first, then falls back to /api/search
   * with a cleaned-up song name (strips parenthetical/bracket suffixes).
   */
  async function fetchSyncedLyrics(song, artist) {
    try {
      // Use first artist only — Lanyard often gives "Artist1; Artist2"
      const primaryArtist = artist.split(/[,;]/)[0].trim();
      // 1) Exact match via /api/get
      const getParams = new URLSearchParams({
        track_name: song,
        artist_name: primaryArtist
      });
      let res = await fetch(`https://lrclib.net/api/get?${getParams}`);
      if (res.ok) {
        const data = await res.json();
        if (data.syncedLyrics) return parseLRC(data.syncedLyrics);
      }
      // 2) Fallback: search with cleaned song name
      const cleanSong = song.replace(/\s*[\(\[].*$/g, "").trim();
      const searchParams = new URLSearchParams({
        q: `${cleanSong} ${primaryArtist}`
      });
      res = await fetch(`https://lrclib.net/api/search?${searchParams}`);
      if (res.ok) {
        const results = await res.json();
        // Pick the first result that has synced lyrics
        const match = results.find(r => r.syncedLyrics);
        if (match) return parseLRC(match.syncedLyrics);
      }
      return [];
    } catch (e) {
      console.error("[Lyrics] fetch error:", e);
      return [];
    }
  }
  /**
   * Build DOM lines inside the lyrics container.
   */
  function renderLyricsLines(lyrics) {
    lyricsContainer.innerHTML = "";
    // Top spacer so the first line can scroll to center
    const topSpacer = document.createElement("div");
    topSpacer.className = "lyrics-spacer";
    lyricsContainer.appendChild(topSpacer);
    for (let i = 0; i < lyrics.length; i++) {
      const div = document.createElement("div");
      div.className = "lyrics-line";
      div.textContent = lyrics[i].text;
      div.dataset.index = i;
      lyricsContainer.appendChild(div);
    }
    // Bottom spacer so the last line can scroll to center
    const bottomSpacer = document.createElement("div");
    bottomSpacer.className = "lyrics-spacer";
    lyricsContainer.appendChild(bottomSpacer);
  }
  /**
   * Animation-frame tick: highlight the current line and scroll it into view.
   */
  function tickLyrics() {
    if (!syncedLyrics.length || spotifyStartMs == null) return;
    const elapsedSec = (Date.now() - spotifyStartMs) / 1000;
    // Find the latest line whose timestamp ≤ elapsed
    let idx = -1;
    for (let i = 0; i < syncedLyrics.length; i++) {
      if (syncedLyrics[i].time <= elapsedSec) idx = i;
      else break;
    }
    // Only touch the DOM when the active line actually changes
    if (idx !== lastActiveIdx) {
      lastActiveIdx = idx;
      const lines = lyricsContainer.querySelectorAll(".lyrics-line");
      lines.forEach((el, i) => {
        const dist = idx < 0 ? lines.length : Math.abs(i - idx);
        if (i === idx) {
          el.classList.add("active");
          el.style.opacity = "1";
        } else {
          el.classList.remove("active");
          el.style.opacity = dist <= 1 ? "0.55" : dist <= 3 ? "0.3" : "0.15";
        }
      });
      // Scroll active line to the vertical centre of the container
      if (idx >= 0 && lines[idx]) {
        lines[idx].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    lyricsRafId = requestAnimationFrame(tickLyrics);
  }
  function startLyricsTicker() {
    stopLyricsTicker();
    lastActiveIdx = -1;
    lyricsRafId = requestAnimationFrame(tickLyrics);
  }
  function stopLyricsTicker() {
    if (lyricsRafId) {
      cancelAnimationFrame(lyricsRafId);
      lyricsRafId = null;
    }
  }
  function clearLyrics() {
    stopLyricsTicker();
    syncedLyrics = [];
    lastLyricsTrackId = null;
    spotifyStartMs = null;
    lastActiveIdx = -1;
    lyricsContainer.innerHTML = "";
    lyricsStatus.textContent = "";
    lyricsSection.hidden = true;
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
      // ---- Spotify ----
      if (data.spotify?.track_id) {
        spTrack.textContent = data.spotify.song || "—";
        spArtist.textContent = data.spotify.artist || "—";
        currentSpotifyUrl = spotifyTrackUrl(data.spotify.track_id);
        setCopyUi({ enabled: !!currentSpotifyUrl, status: "" });
        if (data.spotify.album_art_url) {
          spCover.src = data.spotify.album_art_url;
          spCover.hidden = false;
        } else {
          spCover.hidden = true;
        }
        // ---- Lyrics sync ----
        spotifyStartMs = data.spotify.timestamps?.start ?? null;
        if (data.spotify.track_id !== lastLyricsTrackId) {
          // New track — fetch lyrics
          lastLyricsTrackId = data.spotify.track_id;
          lyricsSection.hidden = false;
          lyricsStatus.textContent = "Loading lyrics…";
          lyricsContainer.innerHTML = "";
          stopLyricsTicker();
          fetchSyncedLyrics(
            data.spotify.song || "",
            data.spotify.artist || ""
          ).then(lyrics => {
            syncedLyrics = lyrics;
            if (lyrics.length) {
              lyricsStatus.textContent = "";
              renderLyricsLines(lyrics);
              startLyricsTicker();
            } else {
              lyricsStatus.textContent = "No synced lyrics available for this track";
            }
          });
        }
        // ---- /Lyrics ----
      } else {
        spTrack.textContent = "Not listening to anything right now";
        spArtist.textContent = "—";
        spCover.hidden = true;
        currentSpotifyUrl = null;
        setCopyUi({ enabled: false, status: "Not listening" });
        clearLyrics();
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
      detailsEl.textContent = "Couldn't load presence";
      spTrack.textContent = "Not listening to anything right now";
      spArtist.textContent = "—";
      spCover.hidden = true;
      currentSpotifyUrl = null;
      setCopyUi({ enabled: false, status: "Error" });
      clearLyrics();
    }
  }
  update();
  setInterval(update, 3000);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) update();
  });
    window.addEventListener("focus", () => update());
});

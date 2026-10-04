"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const USER_ID = "764834366161420299";
  const WS_URL = "wss://api.lanyard.rest/socket";
  const API_URL = `https://api.lanyard.rest/v1/users/${USER_ID}`;

  // elements
  const dot = document.getElementById("rpcDot");
  const statusText = document.getElementById("rpcStatusText");
  const avatar = document.getElementById("rpcAvatar");
  const nameEl = document.getElementById("rpcName");
  const gameIcon = document.getElementById("gameIcon");
  const gameEl = document.getElementById("rpcGame");
  const detailsEl = document.getElementById("rpcDetails");
  const spCover = document.getElementById("spCover");
  const spRecord = document.getElementById("spRecord");
  const spTrack = document.getElementById("spTrack");
  const spArtist = document.getElementById("spArtist");
  // game + spotify blocks
  const rpcGameBlock = document.getElementById("rpcGameBlock");
  const rpcSep = document.getElementById("rpcSep");
  const rpcSpotifyBlock = document.getElementById("rpcSpotifyBlock");
  // lyrics elements
  const lyricsSection = document.getElementById("lyricsSection");
  const lyricsContainer = document.getElementById("lyricsContainer");
  const lyricsStatus = document.getElementById("lyricsStatus");
  // overlay elements
  const contentEl = document.getElementById("content");
  const spExpand = document.getElementById("spExpand");
  const overlay = document.getElementById("lyricsOverlay");
  const ovClose = document.getElementById("ovClose");
  const ovCover = document.getElementById("ovCover");
  const ovTitle = document.getElementById("ovTitle");
  const ovArtist = document.getElementById("ovArtist");
  const ovLyrics = document.getElementById("ovLyrics");
  const ovLyricList = document.getElementById("ovLyricList");
  const ovBgArt = document.getElementById("ovBgArt");
  const ovBgLyrics = document.getElementById("ovBgLyrics");
  const ovBgPrev = document.getElementById("ovBgPrev");
  const ovBgCur = document.getElementById("ovBgCur");
  const ovBgNext = document.getElementById("ovBgNext");

  // bail if anything's missing
  const required = {
    dot, statusText, avatar, nameEl,
    gameIcon, gameEl, detailsEl,
    spCover, spRecord, spTrack, spArtist,
    rpcGameBlock, rpcSep, rpcSpotifyBlock,
    lyricsSection, lyricsContainer, lyricsStatus,
    spExpand, overlay, ovClose, ovCover, ovTitle, ovArtist, ovLyrics, ovLyricList,
    ovBgArt, ovBgLyrics, ovBgPrev, ovBgCur, ovBgNext
  };
  for (const [k, v] of Object.entries(required)) {
    if (!v) {
      console.error(`[Lanyard] Missing element for id="${k}". Check your HTML IDs.`);
      return;
    }
  }

  // status
  const statusColor = {
    online: "#3ba55d",
    idle: "#faa61a",
    dnd: "#ed4245",
    offline: "#747f8d"
  };

  // album art
  function setAlbumArt(url) {
    if (url) {
      spCover.src = url;
      spCover.hidden = false;
      spRecord.hidden = false;
    } else {
      spCover.hidden = true;
      spRecord.hidden = true;
    }
  }

  // set text + tooltip, animate on change
  function setText(el, text) {
    if (el.textContent === text) return;
    el.textContent = text;
    el.title = text;
    restartAnim(el);
  }

  function statusLabel(s) {
    return s === "online" ? "Online"
      : s === "idle" ? "Idle"
      : s === "dnd" ? "Do Not Disturb"
      : "Offline";
  }

  // discord avatar
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

  // lyrics engine
  let syncedLyrics = [];
  let lastLyricsTrackId = null;
  let spotifyStartMs = null;
  let lyricsRafId = null;
  let lastActiveIdx = -1;
  const lyricsCache = new Map();
  let currentTrack = { song: "", artist: "", cover: null };
  let lyricEls = [];
  let builtLyricsRef = null;

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

  function safeFetch(url) {
    return fetch(url).catch(() => null);
  }

  async function fetchSyncedLyrics(song, artist) {
    const cacheKey = `${song}||${artist}`;
    if (lyricsCache.has(cacheKey)) return lyricsCache.get(cacheKey);
    try {
      const primaryArtist = artist.split(/[,;]/)[0].trim();
      const exactParams = new URLSearchParams({
        track_name: song,
        artist_name: primaryArtist
      });
      const cleanSong = song.replace(/\s*[\(\[].*$/g, "").trim();
      const searchParams = new URLSearchParams({
        q: `${cleanSong} ${primaryArtist}`
      });

      // first fetch to return lyrics wins
      const result = await new Promise(resolve => {
        let done = false;
        let pending = 2;
        function tryResolve(parsed) {
          if (done) return;
          if (parsed && parsed.length) { done = true; resolve(parsed); }
          else if (--pending <= 0) resolve([]);
        }

        safeFetch(`https://lrclib.net/api/get?${exactParams}`)
          .then(async res => {
            if (res?.ok) {
              const data = await res.json();
              if (data.syncedLyrics) return tryResolve(parseLRC(data.syncedLyrics));
            }
            tryResolve(null);
          }).catch(() => tryResolve(null));

        safeFetch(`https://lrclib.net/api/search?${searchParams}`)
          .then(async res => {
            if (res?.ok) {
              const results = await res.json();
              const match = results.find(r => r.syncedLyrics);
              if (match) return tryResolve(parseLRC(match.syncedLyrics));
            }
            tryResolve(null);
          }).catch(() => tryResolve(null));
      });

      lyricsCache.set(cacheKey, result);
      return result;
    } catch (e) {
      console.error("[Lyrics] fetch error:", e);
      return [];
    }
  }



  function renderCurrentLine(idx) {
    lyricsContainer.innerHTML = "";
    if (idx >= 0) {
      const span = document.createElement("span");
      span.className = "lyric-current";
      span.textContent = syncedLyrics[idx].text;
      lyricsContainer.appendChild(span);
    }
  }

  function tickLyrics() {
    if (!syncedLyrics.length || spotifyStartMs == null) return;
    const elapsedSec = (Date.now() - spotifyStartMs) / 1000;
    let idx = -1;
    for (let i = 0; i < syncedLyrics.length; i++) {
      if (syncedLyrics[i].time <= elapsedSec) idx = i;
      else break;
    }
    if (idx !== lastActiveIdx) {
      lastActiveIdx = idx;
      renderCurrentLine(idx);
      if (!overlay.hidden) renderOverlayLyrics(idx);
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
    closeOverlay();
  }

  // lyrics overlay
  function setPlayable(on) {
    rpcSpotifyBlock.classList.toggle("is-playing", on);
    spExpand.hidden = !on;
    if (on) {
      rpcSpotifyBlock.setAttribute("role", "button");
      rpcSpotifyBlock.setAttribute("tabindex", "0");
      rpcSpotifyBlock.setAttribute("aria-haspopup", "dialog");
    } else {
      rpcSpotifyBlock.removeAttribute("role");
      rpcSpotifyBlock.removeAttribute("tabindex");
      rpcSpotifyBlock.removeAttribute("aria-haspopup");
    }
  }

  let closeTimer = null;

  function openOverlay() {
    // clicking while closing = cancel close
    if (overlay.classList.contains("closing")) {
      clearTimeout(closeTimer);
      overlay.classList.remove("closing");
      return;
    }
    if (!overlay.hidden || !currentTrack.song) return;
    clearTimeout(closeTimer);
    overlay.hidden = false;
    document.body.classList.add("overlay-open");
    // block the page behind
    if (contentEl) contentEl.inert = true;
    updateOverlayTrack();
    renderOverlayLyrics(lastActiveIdx);
    ovClose.focus();
  }

  function closeOverlay() {
    if (overlay.hidden || overlay.classList.contains("closing")) return;
    const hadFocus = overlay.contains(document.activeElement);

    const finish = () => {
      clearTimeout(closeTimer);
      overlay.classList.remove("closing");
      overlay.hidden = true;
      document.body.classList.remove("overlay-open");
      if (contentEl) contentEl.inert = false;
      // restore focus
      if (hadFocus && rpcSpotifyBlock.hasAttribute("tabindex")) {
        rpcSpotifyBlock.focus();
      }
    };

    // no motion = instant close
    if (document.documentElement.matches(".reduced-motion, .motion-off")) {
      finish();
      return;
    }

    overlay.classList.add("closing");
    const onEnd = (e) => {
      if (e.target !== overlay || e.animationName !== "ov-out") return;
      overlay.removeEventListener("animationend", onEnd);
      finish();
    };
    overlay.addEventListener("animationend", onEnd);
    // fallback
    closeTimer = setTimeout(() => {
      overlay.removeEventListener("animationend", onEnd);
      finish();
    }, 450);
  }

  function updateOverlayTrack() {
    setText(ovTitle, currentTrack.song || "—");
    setText(ovArtist, currentTrack.artist || "—");
    if (currentTrack.cover) {
      const coverChanged = ovCover.getAttribute("src") !== currentTrack.cover;
      ovCover.src = currentTrack.cover;
      ovBgArt.src = currentTrack.cover;
      if (coverChanged) restartAnim(ovCover, "swap");
    }
  }

  // restart css animation (reflow trick)
  function restartAnim(el, cls) {
    cls = cls || "tick";
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  // build lyric lines once per track
  function buildOverlayLyrics() {
    ovLyricList.textContent = "";
    lyricEls = [];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < syncedLyrics.length; i++) {
      const el = document.createElement("div");
      el.className = "ov-line future";
      el.textContent = syncedLyrics[i].text;
      frag.appendChild(el);
      lyricEls.push(el);
    }
    ovLyricList.appendChild(frag);
  }

  function renderOverlayLyrics(idx) {
    if (overlay.hidden) return;

    // no lyrics: show message
    if (!syncedLyrics.length) {
      ovLyricList.textContent = "";
      lyricEls = [];
      builtLyricsRef = null;
      const msg = document.createElement("div");
      msg.className = "ov-line future";
      msg.textContent = lyricsStatus.textContent || "No synced lyrics for this track";
      ovLyricList.appendChild(msg);

      const msgOffset = Math.round(ovLyrics.clientHeight / 2 - (msg.offsetTop + msg.offsetHeight / 2));
      ovLyricList.style.transition = "none";
      ovLyricList.style.transform = `translateY(${msgOffset}px)`;

      ovBgPrev.textContent = "";
      ovBgCur.textContent = currentTrack.song || "";
      ovBgNext.textContent = currentTrack.artist || "";
      restartAnim(ovBgLyrics);
      return;
    }

    // new track = rebuild
    let instant = false;
    if (builtLyricsRef !== syncedLyrics) {
      buildOverlayLyrics();
      builtLyricsRef = syncedLyrics;
      instant = true;
    }

    for (let i = 0; i < lyricEls.length; i++) {
      const cls = i < idx ? "ov-line past" : i === idx ? "ov-line current" : "ov-line future";
      if (lyricEls[i].className !== cls) lyricEls[i].className = cls;
    }

    // center active line
    const centerIdx = idx >= 0 && idx < lyricEls.length ? idx : 0;
    const el = lyricEls[centerIdx];
    if (el) {
      const offset = Math.round(ovLyrics.clientHeight / 2 - (el.offsetTop + el.offsetHeight / 2));
      if (instant) {
        ovLyricList.style.transition = "none";
        ovLyricList.style.transform = `translateY(${offset}px)`;
        void ovLyricList.offsetHeight;
        ovLyricList.style.transition = "";
      } else {
        ovLyricList.style.transform = `translateY(${offset}px)`;
      }
    }

    ovBgPrev.textContent = idx > 0 ? syncedLyrics[idx - 1].text : "";
    ovBgCur.textContent = idx >= 0 ? syncedLyrics[idx].text : syncedLyrics[0].text;
    ovBgNext.textContent = idx + 1 < syncedLyrics.length ? syncedLyrics[idx + 1].text : "";
    restartAnim(ovBgLyrics);
  }

  // apply presence (ws + rest)
  function applyPresence(data) {
    if (!data) return;

    const user = data.discord_user;
    setText(nameEl, user?.global_name || user?.username || "—");
    avatar.src = discordAvatarUrl(user);

    // status
    const st = data.discord_status || "offline";
    dot.style.background = statusColor[st] || statusColor.offline;
    statusText.textContent = statusLabel(st);

    // hide blocks when offline
    const showBlocks = (st === "online" || st === "dnd");
    rpcGameBlock.hidden = !showBlocks;
    rpcSep.hidden = !showBlocks;
    rpcSpotifyBlock.hidden = !showBlocks;
    if (!showBlocks) {
      clearLyrics();
    }

    // spotify
    if (showBlocks && data.spotify?.track_id) {
      setText(spTrack, data.spotify.song || "—");
      setText(spArtist, data.spotify.artist || "—");
      setAlbumArt(data.spotify.album_art_url);
      currentTrack = {
        song: data.spotify.song || "",
        artist: data.spotify.artist || "",
        cover: data.spotify.album_art_url || null
      };
      setPlayable(true);
      if (!overlay.hidden) updateOverlayTrack();
      // lyrics sync
      spotifyStartMs = data.spotify.timestamps?.start ?? null;
      if (spotifyStartMs == null) {
        clearLyrics();
      } else if (data.spotify.track_id !== lastLyricsTrackId) {
        lastLyricsTrackId = data.spotify.track_id;
        lyricsSection.hidden = false;
        lyricsStatus.textContent = "Loading lyrics…";
        lyricsContainer.innerHTML = "";
        stopLyricsTicker();
        const fetchTrackId = data.spotify.track_id;
        fetchSyncedLyrics(
          data.spotify.song || "",
          data.spotify.artist || ""
        ).then(lyrics => {
          // song changed mid-fetch
          if (fetchTrackId !== lastLyricsTrackId) return;
          syncedLyrics = lyrics;
          if (lyrics.length) {
            lyricsStatus.textContent = "";
            lyricsContainer.innerHTML = "";
            startLyricsTicker();
          } else {
            lyricsStatus.textContent = "No synced lyrics available for this track";
          }
          if (!overlay.hidden) renderOverlayLyrics(-1);
        });
      }
    } else {
      setText(spTrack, "Not listening to anything right now");
      setText(spArtist, "—");
      setAlbumArt(null);
      currentTrack = { song: "", artist: "", cover: null };
      setPlayable(false);
      clearLyrics();
    }

    // game
    const game = pickGame(data.activities || []);
    if (game) {
      setText(gameEl, game.name || "—");
      setText(detailsEl, [game.details, game.state].filter(Boolean).join(" • ") || "—");
      const iconUrl = activityAssetUrl(game, "large") || activityAssetUrl(game, "small");
      if (iconUrl) {
        gameIcon.src = iconUrl;
        gameIcon.hidden = false;
      } else {
        gameIcon.hidden = true;
      }
    } else {
      setText(gameEl, "Not playing any game right now");
      setText(detailsEl, "—");
      gameIcon.hidden = true;
    }
  }

  function applyError() {
    statusText.textContent = "Error";
    dot.style.background = statusColor.offline;
    setText(detailsEl, "Couldn't load presence");
    setText(gameEl, "Not playing any game right now");
    gameIcon.hidden = true;
    setText(spTrack, "Not listening to anything right now");
    setText(spArtist, "—");
    setAlbumArt(null);
    currentTrack = { song: "", artist: "", cover: null };
    setPlayable(false);
    clearLyrics();
  }


  // websocket
  let ws = null;
  let heartbeatInterval = null;
  let wsConnected = false;
  let reconnectTimeout = null;
  let reconnectDelay = 1000; // backoff start

  function connectWebSocket() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return; // already connecting
    }

    try {
      ws = new WebSocket(WS_URL);
    } catch (e) {
      console.warn("[Lanyard WS] Failed to create WebSocket, falling back to REST:", e);
      startRESTFallback();
      return;
    }

    ws.onopen = () => {
      console.log("[Lanyard WS] Connected");
      reconnectDelay = 1000; // reset backoff
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.op) {
        // hello: heartbeat interval
        case 1:
          startHeartbeat(msg.d.heartbeat_interval);
          // subscribe to user
          ws.send(JSON.stringify({
            op: 2,
            d: { subscribe_to_id: USER_ID }
          }));
          break;

        // presence events
        case 0:
          wsConnected = true;
          stopRESTFallback(); // ws live
          if (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE") {
            applyPresence(msg.d);
          }
          break;
      }
    };

    ws.onerror = (e) => {
      console.warn("[Lanyard WS] Error:", e);
    };

    ws.onclose = (e) => {
      if (ws !== e.target) return; // stale socket
      console.log(`[Lanyard WS] Closed (code ${e.code}). Reconnecting in ${reconnectDelay}ms...`);
      wsConnected = false;
      stopHeartbeat();
      // poll while reconnecting
      startRESTFallback();
      // reconnect w/ backoff
      reconnectTimeout = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, 30000);
        connectWebSocket();
      }, reconnectDelay);
    };
  }

  function startHeartbeat(intervalMs) {
    stopHeartbeat();
    heartbeatInterval = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ op: 3 }));
      }
    }, intervalMs);
  }

  function stopHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  // rest fallback
  let restPollId = null;

  async function restUpdate() {
    try {
      const res = await fetch(`${API_URL}?_=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.data) throw new Error("No data");
      applyPresence(json.data);
    } catch (e) {
      console.error("[Lanyard REST] update failed:", e);
      applyError();
    }
  }

  function startRESTFallback() {
    if (restPollId) return; // already running
    console.log("[Lanyard] Starting REST fallback polling");
    restUpdate(); // immediate first fetch
    restPollId = setInterval(restUpdate, 5000);
  }

  function stopRESTFallback() {
    if (restPollId) {
      console.log("[Lanyard] Stopping REST fallback (WebSocket is live)");
      clearInterval(restPollId);
      restPollId = null;
    }
  }

  // init
  // first fetch so card isn't empty
  restUpdate();
  connectWebSocket();

  // overlay controls
  rpcSpotifyBlock.addEventListener("click", openOverlay);
  rpcSpotifyBlock.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openOverlay();
    }
  });
  ovClose.addEventListener("click", closeOverlay);
  overlay.addEventListener("click", (e) => {
    if (e.target.closest(".ov-content")) return;
    closeOverlay();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeOverlay();
  });

  // tab visible: check connection
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      if (!wsConnected) {
        restUpdate();
        // reconnect now
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectDelay = 1000;
        connectWebSocket();
      }
    }
  });
});

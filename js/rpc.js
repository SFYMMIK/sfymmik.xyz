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
  let currentTrack = { id: "", song: "", artist: "", album: "", cover: null, duration: 0 };
  let lyricEls = [];
  let builtLyricsRef = null;
  let lyricsRequestSeq = 0;
  let lyricsRetryTimer = null;
  let lyricsRetryCount = 0;
  let lyricsState = "idle";

  const LYRICS_TIMEOUT_MS = 6000;
  const LYRICS_CACHE_MAX = 60;
  const LRCLIB_CLIENT = "SfymmiK-Website/1.0 (+https://sfymmik.xyz)";
  let lrclibCooldownUntil = 0;

  function fetchWithTimeout(url, options = {}) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = options.timeout || LYRICS_TIMEOUT_MS;
    const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
    const fetchOptions = { cache: "no-store" };
    if (options.headers) fetchOptions.headers = options.headers;
    if (controller) fetchOptions.signal = controller.signal;

    return fetch(url, fetchOptions).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  function parseLRC(lrc) {
    if (typeof lrc !== "string" || !lrc) return [];
    const parsed = [];
    const timeTag = /\[(\d{1,3}):([0-5]?\d)(?:[.:](\d{1,3}))?\]/g;
    const offsetMatch = lrc.match(/\[offset:\s*([+-]?\d+)\s*\]/i);
    const offset = offsetMatch ? parseInt(offsetMatch[1], 10) / 1000 : 0;

    for (const rawLine of lrc.replace(/^\uFEFF/, "").split(/\r?\n/)) {
      // drop <mm:ss.xx> word tags
      const line = rawLine.replace(/<[^>]*>/g, "");
      const times = [];
      timeTag.lastIndex = 0;
      let match;
      while ((match = timeTag.exec(line)) !== null) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const fraction = match[3]
          ? parseInt(match[3].padEnd(3, "0").slice(0, 3), 10) / 1000
          : 0;
        const time = Math.max(0, minutes * 60 + seconds + fraction + offset);
        if (Number.isFinite(time)) times.push(time);
      }
      if (!times.length) continue;
      timeTag.lastIndex = 0;
      const text = line.replace(timeTag, "").trim();
      if (!text) continue;
      for (const time of times) parsed.push({ time, text });
    }

    parsed.sort((a, b) => a.time - b.time);
    return parsed;
  }

  function normalizeName(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\[[^\]]*\]|\([^)]*\)/g, " ")
      .replace(/\b(feat|ft|featuring|remastered|remaster|version|edit|live|mono|stereo)\b/g, " ")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function cleanQueries(song, artist) {
    const primaryArtist = String(artist || "")
      .split(/\s*(?:[,;]|\bfeat\.|\bft\.|\bfeaturing\b)\s*/i)[0]
      .trim();
    const cleanSong = String(song || "").replace(/\s*[\(\[].*$/g, "").trim();
    return { cleanSong, primaryArtist };
  }

  function scoreMatch(candidate, song, artist, durationSec) {
    const targetTitle = normalizeName(song);
    const targetArtist = normalizeName(artist);
    const title = normalizeName(candidate.trackName || candidate.name);
    const candidateArtist = normalizeName(candidate.artistName);
    let score = 0;
    let identityMatch = false;

    if (title && targetTitle) {
      if (title === targetTitle) {
        score += 60;
        identityMatch = true;
      } else if (title.includes(targetTitle) || targetTitle.includes(title)) {
        score += 35;
        identityMatch = true;
      } else {
        const words = targetTitle.split(" ").filter(w => w.length > 2);
        const hits = words.filter(w => title.includes(w)).length;
        if (hits) {
          score += Math.min(20, hits * 6);
          if (hits >= 2) identityMatch = true;
        }
      }
    }

    if (candidateArtist && targetArtist) {
      if (candidateArtist === targetArtist) {
        score += 35;
        identityMatch = true;
      } else if (candidateArtist.includes(targetArtist) || targetArtist.includes(candidateArtist)) {
        score += 20;
        identityMatch = true;
      } else {
        score -= 20;
      }
    }

    const candidateDuration = Number(candidate.duration);
    if (durationSec > 0 && Number.isFinite(candidateDuration) && candidateDuration > 0) {
      const diff = Math.abs(candidateDuration - durationSec);
      if (diff <= 2) score += 50;
      else if (diff <= 5) score += 25;
      else if (diff <= 15) score += 5;
      else if (diff > 30) score -= 20;
    }

    // duration alone isn't enough
    return identityMatch ? score : -Infinity;
  }

  function pickBestMatch(results, song, artist, durationSec) {
    if (!Array.isArray(results)) return null;
    let best = null;
    for (const candidate of results) {
      if (!candidate || !candidate.syncedLyrics || candidate.instrumental) continue;
      const score = scoreMatch(candidate, song, artist, durationSec);
      if (!best || score > best.score) best = { candidate, score };
    }
    return best && best.score >= 20 ? best.candidate : null;
  }

  async function lrclibFetch(pathAndQuery) {
    // back off if lrclib is down or rate-limiting
    if (Date.now() < lrclibCooldownUntil) return null;

    try {
      // lrclib allows this header + higher limits for identified clients
      const res = await fetchWithTimeout(`https://lrclib.net/api/${pathAndQuery}`, {
        headers: { "Lrclib-Client": LRCLIB_CLIENT }
      });

      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get("retry-after")) || 0;
        lrclibCooldownUntil = Date.now() + Math.max(retryAfter * 1000, 30000);
      } else if (res.ok || res.status === 404) {
        lrclibCooldownUntil = 0;
      }
      return res;
    } catch (error) {
      // network/preflight failed, probably an outage
      lrclibCooldownUntil = Date.now() + 30000;
      throw error;
    }
  }

  async function lrclibGet(song, artist, album, durationSec) {
    const { primaryArtist } = cleanQueries(song, artist);
    const params = new URLSearchParams({
      track_name: song,
      artist_name: primaryArtist || artist
    });
    if (album) params.set("album_name", album);
    if (durationSec > 0) params.set("duration", String(Math.round(durationSec)));

    const res = await lrclibFetch(`get?${params}`);
    if (!res) return { kind: "error", skipped: true };
    if (res.status === 404) return { kind: "miss" };
    if (!res.ok) return { kind: "error", status: res.status };
    const data = await res.json();
    if (data?.instrumental) return { kind: "instrumental" };
    if (!data?.syncedLyrics) return { kind: "miss" };
    const lines = parseLRC(data.syncedLyrics);
    return lines.length ? { kind: "ok", lines } : { kind: "miss" };
  }

  async function lrclibSearch(song, artist, durationSec) {
    const { cleanSong, primaryArtist } = cleanQueries(song, artist);
    const query = `${cleanSong || song} ${primaryArtist || artist}`.trim();
    const params = new URLSearchParams({ q: query });

    const res = await lrclibFetch(`search?${params}`);
    if (!res) return { kind: "error", skipped: true };
    if (!res.ok) return { kind: res.status === 404 ? "miss" : "error", status: res.status };
    const results = await res.json();
    const match = pickBestMatch(results, song, artist, durationSec);
    if (!match) return { kind: "miss" };
    const lines = parseLRC(match.syncedLyrics);
    return lines.length ? { kind: "ok", lines } : { kind: "miss" };
  }

  async function lrcmuxGet(song, artist, album, durationSec) {
    const { primaryArtist } = cleanQueries(song, artist);
    const params = new URLSearchParams({
      track_name: song,
      artist_name: primaryArtist || artist
    });
    if (album) params.set("album_name", album);
    if (durationSec > 0) params.set("duration", String(Math.round(durationSec)));

    const res = await fetchWithTimeout(`https://api.lrcmux.dev/compat/lrclib/api/get?${params}`);
    if (res.status === 404) return { kind: "miss" };
    if (!res.ok) return { kind: "error", status: res.status };
    const data = await res.json();
    if (data?.instrumental) return { kind: "instrumental" };
    if (!data?.syncedLyrics) return { kind: "miss" };
    const lines = parseLRC(data.syncedLyrics);
    return lines.length ? { kind: "ok", lines } : { kind: "miss" };
  }

  async function lrcmuxSearch(song, artist, durationSec) {
    const { cleanSong, primaryArtist } = cleanQueries(song, artist);
    const params = new URLSearchParams({
      track_name: cleanSong || song,
      artist_name: primaryArtist || artist
    });

    const res = await fetchWithTimeout(`https://api.lrcmux.dev/compat/lrclib/api/search?${params}`);
    if (!res.ok) return { kind: res.status === 404 ? "miss" : "error", status: res.status };
    const results = await res.json();
    const match = pickBestMatch(results, song, artist, durationSec);
    if (!match) return { kind: "miss" };
    const lines = parseLRC(match.syncedLyrics);
    return lines.length ? { kind: "ok", lines } : { kind: "miss" };
  }

  async function safeLyricsCall(call) {
    try {
      return await call();
    } catch (error) {
      return { kind: "error", error };
    }
  }

  async function fetchSyncedLyrics(song, artist, album, durationSec) {
    const duration = Math.max(0, Math.round(Number(durationSec) || 0));
    const cacheKey = `${song}\u0000${artist}\u0000${album}\u0000${duration}`;
    const cached = lyricsCache.get(cacheKey);
    if (cached) return cached;

    let instrumental = false;
    let failed = false;

    function remember(result) {
      if (result.kind === "instrumental") instrumental = true;
      if (result.kind === "error") failed = true;
      return result;
    }

    function finalize(status, lines = [], source = null) {
      const result = { status, lines, source };
      // don't cache failures so the track can retry
      if (status !== "error") {
        if (lyricsCache.size >= LYRICS_CACHE_MAX) {
          lyricsCache.delete(lyricsCache.keys().next().value);
        }
        lyricsCache.set(cacheKey, result);
      }
      return result;
    }

    // exact lrclib lookup first
    const exact = remember(await safeLyricsCall(() => lrclibGet(song, artist, album, duration)));
    if (exact.kind === "ok") return finalize("ok", exact.lines, "lrclib");

    // lrclib search + lrcmux exact lookup run together
    if (!failed) {
      const [search, fallbackGet] = await Promise.all([
        safeLyricsCall(() => lrclibSearch(song, artist, duration)),
        safeLyricsCall(() => lrcmuxGet(song, artist, album, duration))
      ]);
      remember(search);
      remember(fallbackGet);
      if (search.kind === "ok") return finalize("ok", search.lines, "lrclib");
      if (fallbackGet.kind === "ok") return finalize("ok", fallbackGet.lines, "lrcmux");
    } else {
      const fallbackGet = remember(await safeLyricsCall(() => lrcmuxGet(song, artist, album, duration)));
      if (fallbackGet.kind === "ok") return finalize("ok", fallbackGet.lines, "lrcmux");
    }

    // last chance: lrcmux search
    const fallbackSearch = remember(await safeLyricsCall(() => lrcmuxSearch(song, artist, duration)));
    if (fallbackSearch.kind === "ok") return finalize("ok", fallbackSearch.lines, "lrcmux");

    if (instrumental) return finalize("instrumental");
    if (failed) return finalize("error");
    return finalize("none");
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
    clearTimeout(lyricsRetryTimer);
    lyricsRetryTimer = null;
    lyricsRetryCount = 0;
    lyricsState = "idle";
    lyricsRequestSeq++;
    syncedLyrics = [];
    builtLyricsRef = null;
    lastLyricsTrackId = null;
    spotifyStartMs = null;
    lastActiveIdx = -1;
    lyricsContainer.innerHTML = "";
    lyricsStatus.textContent = "";
    lyricsSection.hidden = true;
    closeOverlay();
  }

  function scheduleLyricsRetry() {
    clearTimeout(lyricsRetryTimer);
    if (lyricsRetryCount >= 3) return false;
    lyricsRetryCount++;
    lyricsRetryTimer = setTimeout(() => {
      lyricsRetryTimer = null;
      if (lyricsState !== "error" || !currentTrack.id) return;
      startLyricsFetch(true);
    }, 15000 * lyricsRetryCount);
    return true;
  }

  function startLyricsFetch(isRetry = false) {
    const requestId = ++lyricsRequestSeq;
    clearTimeout(lyricsRetryTimer);
    lyricsRetryTimer = null;
    lyricsState = "loading";
    syncedLyrics = [];
    builtLyricsRef = null;
    lastActiveIdx = -1;
    stopLyricsTicker();
    lyricsSection.hidden = false;
    lyricsContainer.innerHTML = "";
    lyricsStatus.textContent = isRetry ? "Retrying lyrics…" : "Loading lyrics…";
    if (!overlay.hidden) renderOverlayLyrics(-1);

    fetchSyncedLyrics(
      currentTrack.song,
      currentTrack.artist,
      currentTrack.album,
      currentTrack.duration
    ).then(result => {
      if (requestId !== lyricsRequestSeq) return;

      if (result.lines && result.lines.length) {
        syncedLyrics = result.lines;
        lyricsState = "ok";
        lyricsRetryCount = 0;
        lyricsStatus.textContent = "";
        startLyricsTicker();
      } else if (result.status === "instrumental") {
        lyricsState = "instrumental";
        lyricsStatus.textContent = "Instrumental track — no lyrics";
      } else if (result.status === "none") {
        lyricsState = "none";
        lyricsStatus.textContent = "No synced lyrics available for this track";
      } else {
        lyricsState = "error";
        lyricsStatus.textContent = scheduleLyricsRetry()
          ? "Couldn't load lyrics — retrying…"
          : "Couldn't load lyrics right now";
      }

      if (!overlay.hidden) renderOverlayLyrics(-1);
    }).catch(error => {
      if (requestId !== lyricsRequestSeq) return;
      lyricsState = "error";
      lyricsStatus.textContent = scheduleLyricsRetry()
        ? "Couldn't load lyrics — retrying…"
        : "Couldn't load lyrics right now";
      if (!overlay.hidden) renderOverlayLyrics(-1);
      console.warn("[Lyrics] unexpected error:", error);
    });
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
    } else {
      ovCover.removeAttribute("src");
      ovBgArt.removeAttribute("src");
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

    // idle/dnd users can still be listening
    const showBlocks = st !== "offline";
    rpcGameBlock.hidden = !showBlocks;
    rpcSep.hidden = !showBlocks;
    rpcSpotifyBlock.hidden = !showBlocks;
    if (!showBlocks) {
      clearLyrics();
    }

    // spotify
    if (showBlocks && data.spotify?.track_id) {
      const spotify = data.spotify;
      setText(spTrack, spotify.song || "—");
      setText(spArtist, spotify.artist || "—");
      setAlbumArt(spotify.album_art_url);

      const start = spotify.timestamps?.start ?? null;
      const end = spotify.timestamps?.end ?? null;
      const duration = start != null && end != null && end > start
        ? Math.round((end - start) / 1000)
        : 0;

      currentTrack = {
        id: spotify.track_id,
        song: spotify.song || "",
        artist: spotify.artist || "",
        album: spotify.album || "",
        cover: spotify.album_art_url || null,
        duration
      };
      setPlayable(true);
      if (!overlay.hidden) updateOverlayTrack();

      // lyrics sync
      spotifyStartMs = start;
      if (spotifyStartMs == null) {
        clearLyrics();
      } else if (spotify.track_id !== lastLyricsTrackId) {
        lastLyricsTrackId = spotify.track_id;
        lyricsRetryCount = 0;
        startLyricsFetch();
      }
    } else {
      setText(spTrack, "Not listening to anything right now");
      setText(spArtist, "—");
      setAlbumArt(null);
      currentTrack = { id: "", song: "", artist: "", album: "", cover: null, duration: 0 };
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
    currentTrack = { id: "", song: "", artist: "", album: "", cover: null, duration: 0 };
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

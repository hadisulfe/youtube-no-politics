// Content script: watches YouTube's DOM and hides/blurs political cards.
(() => {
  if (window.__ypfLoaded) return;
  window.__ypfLoaded = true;

  const CARD_SEL = YPF_SELECTORS.cards.join(",");
  const COMMENT_SEL = YPF_SELECTORS.comments.join(",");
  const SHELF_SEL = YPF_SELECTORS.shelves.join(",");
  const LOG_LIMIT = 300;

  let settings = { ...YPF_DEFAULTS };
  let classifier = null;
  let pageCount = 0;
  const counted = new Set();   // keys of items already counted on this page
  let pendingLog = [];
  let pendingStats = 0;

  const q = (root, sels) => { for (const s of sels) { const el = root.querySelector(s); if (el) return el; } return null; };
  const text = (root, sels) => { const el = q(root, sels); return el ? (el.getAttribute?.("title") || el.textContent || "").trim() : ""; };

  function extract(card) {
    const title = text(card, YPF_SELECTORS.title);
    let channel = text(card, YPF_SELECTORS.channel);
    let handle = "";
    const link = q(card, YPF_SELECTORS.channelLink);
    if (link) {
      const m = link.getAttribute("href")?.match(/\/(@[^/?#]+)/);
      if (m) handle = m[1];
      if (!channel) channel = (link.textContent || "").trim();
    }
    if (!channel) {
      const av = q(card, YPF_SELECTORS.channelAvatar);
      if (av) channel = av.getAttribute("aria-label").replace(/^Go to channel:?\s*/, "").trim();
    }
    const description = settings.sensitivity === "strict" ? text(card, YPF_SELECTORS.description) : "";
    return { title, channel, handle, description };
  }

  function overlay(card, info, verdict) {
    let ov = card.querySelector(":scope > .ypf-overlay");
    if (ov) return;
    ov = document.createElement("div");
    ov.className = "ypf-overlay";
    const label = document.createElement("div");
    label.textContent = verdict.reason === "channel" ? "Blocked channel" : `Political: "${verdict.match}"`;
    const sub = document.createElement("small");
    sub.textContent = info.title;
    const btn = document.createElement("button");
    btn.textContent = "Show anyway";
    btn.addEventListener("click", (e) => {
      e.preventDefault(); e.stopPropagation();
      card.dataset.ypf = "allowed";
      ov.remove();
    });
    ov.append(label, sub, btn);
    card.appendChild(ov);
  }

  function blockButton(card, info) {
    if (!(info.channel || info.handle) || card.querySelector(":scope > .ypf-block-btn")) return;
    if (card.matches("ytd-reel-item-renderer, ytm-shorts-lockup-view-model, ytm-shorts-lockup-view-model-v2")) return;
    const btn = document.createElement("button");
    btn.className = "ypf-block-btn";
    btn.textContent = "Block channel";
    btn.title = `Hide all videos from ${info.channel || info.handle}`;
    btn.addEventListener("click", async (e) => {
      e.preventDefault(); e.stopPropagation();
      const key = info.handle || info.channel;
      const { channels = [] } = await chrome.storage.local.get("channels");
      if (!channels.includes(key)) channels.push(key);
      await chrome.storage.local.set({ channels });
    });
    card.appendChild(btn);
  }

  function hide(card, info, verdict) {
    const key = `${info.title}|${info.channel || info.handle}`;
    if (!counted.has(key)) {
      counted.add(key);
      pageCount++;
      pendingStats++;
      pendingLog.push({ t: Date.now(), title: info.title, channel: info.channel || info.handle, reason: verdict.reason, match: verdict.match, url: location.pathname });
      scheduleFlush();
      chrome.runtime.sendMessage({ type: "ypf:count", count: pageCount }).catch(() => {});
    }
    if (settings.mode === "blur") { card.dataset.ypf = "blurred"; overlay(card, info, verdict); }
    else card.dataset.ypf = "hidden";
  }

  function restore(card) {
    if (card.dataset.ypf === "hidden" || card.dataset.ypf === "blurred") delete card.dataset.ypf;
    card.querySelector(":scope > .ypf-overlay")?.remove();
  }

  function processCard(card) {
    // Only the outermost card wrapper is handled so we do not double-process nested renderers.
    if (card.parentElement?.closest(CARD_SEL)) return;
    const info = extract(card);
    if (!info.title && !info.channel) return;      // not rendered yet, retry on next mutation
    const sig = `${info.title}|${info.channel}|${info.handle}`;
    if (card.dataset.ypfSig === sig && card.dataset.ypf === "allowed") return;
    if (card.dataset.ypfSig !== sig) { delete card.dataset.ypf; card.querySelector(":scope > .ypf-overlay")?.remove(); }
    card.dataset.ypfSig = sig;
    const verdict = classifier.classify(info);
    if (verdict) hide(card, info, verdict);
    else { restore(card); blockButton(card, info); }
  }

  function processShelf(shelf) {
    if (shelf.parentElement?.closest(SHELF_SEL)) return;
    const t = text(shelf, YPF_SELECTORS.shelfTitle);
    if (!t) return;
    if (classifier.isNewsShelf(t)) {
      if (shelf.dataset.ypf !== "hidden") {
        shelf.dataset.ypf = "hidden";
        if (!counted.has(`shelf|${t}`)) { counted.add(`shelf|${t}`); pageCount++; chrome.runtime.sendMessage({ type: "ypf:count", count: pageCount }).catch(() => {}); }
      }
    } else if (shelf.dataset.ypf === "hidden") delete shelf.dataset.ypf;
  }

  function processComment(c) {
    const body = text(c, ["#content-text", ".yt-core-attributed-string"]);
    const author = text(c, ["#author-text", "#header-author a", "h3 a"]);
    if (!body) return;
    const verdict = classifier.classify({ title: body, channel: author });
    if (verdict) { if (c.dataset.ypf !== "hidden") c.dataset.ypf = "hidden"; }
    else if (c.dataset.ypf === "hidden") delete c.dataset.ypf;
  }

  function scan() {
    if (!settings.enabled || !classifier) return;
    document.querySelectorAll(CARD_SEL).forEach(processCard);
    document.querySelectorAll(SHELF_SEL).forEach(processShelf);
    if (settings.filterComments) document.querySelectorAll(COMMENT_SEL).forEach(processComment);
  }

  function unhideAll() {
    document.querySelectorAll("[data-ypf]").forEach((el) => { delete el.dataset.ypf; delete el.dataset.ypfSig; });
    document.querySelectorAll(".ypf-overlay, .ypf-block-btn").forEach((el) => el.remove());
  }

  let scheduled = false;
  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; scan(); });
  }

  let flushTimer = null;
  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      const add = pendingStats, items = pendingLog;
      pendingStats = 0; pendingLog = [];
      if (!add) return;
      const { stats = { total: 0, today: 0, todayDate: "" }, log = [] } = await chrome.storage.local.get(["stats", "log"]);
      const today = new Date().toDateString();
      if (stats.todayDate !== today) { stats.todayDate = today; stats.today = 0; }
      stats.total += add; stats.today += add;
      const newLog = [...items.reverse(), ...log].slice(0, LOG_LIMIT);
      await chrome.storage.local.set({ stats, log: newLog });
    }, 1500);
  }

  function applySettings(s) {
    settings = { ...YPF_DEFAULTS, ...s };
    classifier = new YPFClassifier(settings);
    counted.clear(); pageCount = 0;
    unhideAll();
    if (settings.enabled) { scan(); chrome.runtime.sendMessage({ type: "ypf:count", count: pageCount }).catch(() => {}); }
    else chrome.runtime.sendMessage({ type: "ypf:disabled" }).catch(() => {});
  }

  chrome.storage.local.get(null).then((s) => {
    applySettings(s);
    const obs = new MutationObserver(scheduleScan);
    obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    window.addEventListener("yt-navigate-finish", () => { counted.clear(); pageCount = 0; scheduleScan(); });
    window.addEventListener("yt-page-data-updated", scheduleScan);
    setInterval(scheduleScan, 2000); // safety net for in-place renderer recycling without mutations we catch
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if (Object.keys(changes).every((k) => k === "stats" || k === "log")) return;
    chrome.storage.local.get(null).then(applySettings);
  });
})();

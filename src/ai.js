// AI tier: batches unknown titles to an OpenAI-compatible chat endpoint (Ollama by default) and caches verdicts per video id.
// Runs inside the background service worker.
export const YPF_AI = (() => {
  const CACHE_KEY = "aiCache";
  const CACHE_MAX = 5000;
  const BATCH_MAX = 25;
  const DEBOUNCE_MS = 400;

  const SYSTEM_PROMPT = `You label YouTube videos as POLITICAL or NOT from their title and channel name.
POLITICAL means: politicians, elections, parties, government policy or legislation, geopolitics, wars and armed conflicts, protests, partisan news or commentary, culture-war controversies (immigration, abortion, gun control, gender politics, etc.), political satire.
NOT political: gaming, tech, music, sports, science, history older than ~30 years, cooking, vlogs, entertainment, business/finance without policy focus.
Answer with exactly one line per item, in order, formatted "<n>: Y" or "<n>: N". No other text.`;

  let settings = {};
  const pending = new Map();   // id -> {title, channel, tabs:Set<tabId>}
  let timer = null;
  let cache = null;            // id -> 1|0
  let cacheOrder = null;       // ids in insertion order for pruning
  let saveTimer = null;

  async function loadCache() {
    if (cache) return;
    const { [CACHE_KEY]: c = {} } = await chrome.storage.local.get(CACHE_KEY);
    cache = c;
    cacheOrder = Object.keys(c);
  }

  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      while (cacheOrder.length > CACHE_MAX) delete cache[cacheOrder.shift()];
      chrome.storage.local.set({ [CACHE_KEY]: cache });
    }, 2000);
  }

  function remember(id, political) {
    if (!(id in cache)) cacheOrder.push(id);
    cache[id] = political ? 1 : 0;
    scheduleSave();
  }

  function configure(s) { settings = s; }

  function endpoint() {
    return settings.aiBaseUrl.replace(/\/+$/, "") + "/chat/completions";
  }

  async function callModel(items) {
    const user = items.map((it, i) => `${i + 1}: ${it.title}${it.channel ? ` — ${it.channel}` : ""}`).join("\n");
    const headers = { "Content-Type": "application/json" };
    if (settings.aiApiKey) headers.Authorization = `Bearer ${settings.aiApiKey}`;
    const res = await fetch(endpoint(), {
      method: "POST", headers,
      body: JSON.stringify({
        model: settings.aiModel,
        temperature: 0,
        max_tokens: Math.max(64, items.length * 8),
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: user }]
      })
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    return parse(text, items.length);
  }

  // Accepts "1: Y", "1. N", "1 - yes", one per line; anything unparsed counts as not political.
  function parse(text, n) {
    const out = new Array(n).fill(0);
    for (const line of text.split(/\n+/)) {
      const m = line.match(/^\s*(\d+)\s*[:.)\-]\s*(y|n|yes|no|political|not)/i);
      if (!m) continue;
      const i = Number(m[1]) - 1;
      if (i >= 0 && i < n) out[i] = /^(y|yes|political)$/i.test(m[2]) ? 1 : 0;
    }
    return out;
  }

  async function flush() {
    timer = null;
    const batch = [...pending.entries()].slice(0, BATCH_MAX);
    for (const [id] of batch) pending.delete(id);
    if (pending.size) timer = setTimeout(flush, 50);
    const items = batch.map(([id, v]) => ({ id, ...v }));
    let verdicts;
    try { verdicts = await callModel(items); }
    catch (e) {
      console.warn("[YPF] AI request failed:", e.message);
      lastError = e.message;
      return;
    }
    lastError = "";
    const byTab = new Map();
    items.forEach((it, i) => {
      remember(it.id, verdicts[i]);
      for (const tabId of it.tabs) {
        if (!byTab.has(tabId)) byTab.set(tabId, {});
        byTab.get(tabId)[it.id] = verdicts[i];
      }
    });
    for (const [tabId, results] of byTab) chrome.tabs.sendMessage(tabId, { type: "ypf:ai-result", results }).catch(() => {});
  }

  let lastError = "";

  // Returns cached verdicts immediately; queues the rest and answers them later via ypf:ai-result.
  async function classify(items, tabId) {
    await loadCache();
    const known = {};
    for (const it of items) {
      if (!it.id) continue;
      if (it.id in cache) { known[it.id] = cache[it.id]; continue; }
      const p = pending.get(it.id);
      if (p) p.tabs.add(tabId);
      else pending.set(it.id, { title: it.title, channel: it.channel, tabs: new Set([tabId]) });
    }
    if (pending.size && !timer) timer = setTimeout(flush, DEBOUNCE_MS);
    return known;
  }

  async function test() {
    const items = [{ id: "t1", title: "Senate passes sweeping immigration bill after heated debate", channel: "News" },
                   { id: "t2", title: "I built a mechanical keyboard from scratch", channel: "Maker" }];
    const t0 = Date.now();
    const v = await callModel(items);
    return { ok: v[0] === 1 && v[1] === 0, verdicts: v, ms: Date.now() - t0 };
  }

  async function clearCache() { cache = {}; cacheOrder = []; await chrome.storage.local.remove(CACHE_KEY); }

  async function cacheSize() { await loadCache(); return cacheOrder.length; }

  return { configure, classify, test, clearCache, cacheSize, parse, get lastError() { return lastError; } };
})();

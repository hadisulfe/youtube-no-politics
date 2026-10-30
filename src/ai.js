// AI tier: batches unknown titles to an OpenAI-compatible chat endpoint (Ollama by default) and caches verdicts per video id.
// Runs inside the background service worker.
export const YPF_AI = (() => {
  const CACHE_KEY = "aiCache";
  const CACHE_MAX = 5000;
  const BATCH_MAX = 25;
  const DEBOUNCE_MS = 400;

  const SYSTEM_PROMPT = `You are a strict filter that decides whether a YouTube video is about CURRENT POLITICS, using only its title and channel name.
Answer Y only if the video is clearly about: politicians or political parties; elections and voting; government policy, legislation or court rulings; ongoing wars, geopolitics or international relations; protests and activism; partisan news or political commentary; hot-button political controversies (immigration, abortion, gun control, gender politics, racism debates, climate policy).
Answer N for everything else, including: history documentaries about events older than about 30 years (WW2, Cold War, Civil War, ancient history), true crime and local crime news, nature, science, space, tech, gaming, music, sports, business and finance, celebrities, mysteries and conspiracies, religion, lifestyle, travel.
If unsure, answer N.
Reply with exactly one line per item, in order: "<n>: Y" or "<n>: N". No other text.`;

  const EXAMPLE_USER = `Label these 6 videos:
1: Senate passes budget bill after late-night vote — CNN
2: I built a PC in a shoebox — Linus Tech Tips
3: D-Day to the Rhine: The Complete WW2 Western Front Documentary — Get.factual
4: Tiger Island: Part One | PBS Nature | Full Documentary — Nature on PBS
5: Why Germany's far-right AfD is surging — DW News
6: He Killed Jeffrey Dahmer - True Crime Documentary — True Crime`;
  const EXAMPLE_ASSISTANT = `1: Y
2: N
3: N
4: N
5: Y
6: N`;

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
    const user = `Label these ${items.length} videos:\n` +
      items.map((it, i) => `${i + 1}: ${it.title}${it.channel ? ` — ${it.channel}` : ""}`).join("\n");
    const headers = { "Content-Type": "application/json" };
    if (settings.aiApiKey) headers.Authorization = `Bearer ${settings.aiApiKey}`;
    const res = await fetch(endpoint(), {
      method: "POST", headers,
      body: JSON.stringify({
        model: settings.aiModel,
        temperature: 0,
        max_tokens: Math.max(64, items.length * 8),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: EXAMPLE_USER },
          { role: "assistant", content: EXAMPLE_ASSISTANT },
          { role: "user", content: user }
        ]
      })
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      const hint = res.status === 403 && /\/\/(localhost|127\.0\.0\.1):11434\b/.test(endpoint())
        ? ' — Ollama blocks browser extensions by default; start it with OLLAMA_ORIGINS="chrome-extension://*" (see README)'
        : "";
      throw new Error(`${res.status} ${res.statusText}: ${body}${hint}`);
    }
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content ?? "";
    lastRaw = { prompt: user, response: text };
    return parse(text, items.length);
  }

  // Accepts "1: Y", "1. N", "1 - yes", one per line; anything unparsed counts as not political.
  function parse(text, n) {
    const out = new Array(n).fill(0);
    let numbered = 0;
    for (const line of text.split(/\n+/)) {
      const m = line.match(/^\s*(\d+)\s*[:.)\-]\s*(y|n|yes|no|political|not)/i);
      if (!m) continue;
      const i = Number(m[1]) - 1;
      if (i >= 0 && i < n) {
        out[i] = /^(y|yes|political)$/i.test(m[2]) ? 1 : 0;
        numbered++;
      }
    }
    if (numbered) return out;
    // Small models sometimes drop the numbers and emit a bare "Y, N, Y…" sequence.
    const bare = text.match(/\b(y|n|yes|no)\b/gi) || [];
    if (bare.length === n) return bare.map((t) => (/^y/i.test(t) ? 1 : 0));
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
  let lastRaw = null;

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

  return { configure, classify, test, clearCache, cacheSize, parse, get lastError() { return lastError; }, get lastRaw() { return lastRaw; } };
})();

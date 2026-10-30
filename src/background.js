// Keeps the toolbar badge in sync with the hidden counter, seeds defaults on install and brokers AI requests.
import { YPF_AI } from "./ai.js";
chrome.runtime.onInstalled.addListener(async () => {
  const cur = await chrome.storage.local.get(null);
  const seeded = {};
  for (const [k, v] of Object.entries(YPF_DEFAULTS_BG)) if (!(k in cur)) seeded[k] = v;
  if (Object.keys(seeded).length) await chrome.storage.local.set(seeded);
});

// Minimal copy of the defaults the worker needs (the full list lives in src/defaults.js for the content script).
const YPF_DEFAULTS_BG = {
  enabled: true, mode: "hide", sensitivity: "normal", filterComments: false, hideNewsShelves: true,
  useDefaultKeywords: true, useDefaultChannels: true, keywords: [], channels: [], whitelistChannels: [], whitelistKeywords: [],
  aiEnabled: false, aiBaseUrl: "http://localhost:11434/v1", aiModel: "qwen2.5:7b", aiApiKey: ""
};

const AI_KEYS = ["aiEnabled", "aiBaseUrl", "aiModel", "aiApiKey"];
chrome.storage.local.get(AI_KEYS).then((s) => YPF_AI.configure({ ...YPF_DEFAULTS_BG, ...s }));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && AI_KEYS.some((k) => k in changes)) chrome.storage.local.get(AI_KEYS).then((s) => YPF_AI.configure({ ...YPF_DEFAULTS_BG, ...s }));
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "ypf:ai-classify" && sender.tab?.id != null) {
    YPF_AI.classify(msg.items, sender.tab.id).then(sendResponse);
    return true;
  }
  if (msg?.type === "ypf:ai-test") {
    chrome.storage.local.get(AI_KEYS).then((s) => { YPF_AI.configure({ ...YPF_DEFAULTS_BG, ...s }); return YPF_AI.test(); })
      .then(sendResponse, (e) => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg?.type === "ypf:ai-clear-cache") { YPF_AI.clearCache().then(() => sendResponse({ ok: true })); return true; }
  if (msg?.type === "ypf:ai-status") { YPF_AI.cacheSize().then((n) => sendResponse({ cacheSize: n, lastError: YPF_AI.lastError, lastRaw: YPF_AI.lastRaw })); return true; }
  if (msg?.type === "ypf:count" && sender.tab?.id != null) {
    chrome.action.setBadgeBackgroundColor({ color: "#c00" });
    chrome.action.setBadgeText({ tabId: sender.tab.id, text: msg.count ? String(msg.count) : "" });
  }
  if (msg?.type === "ypf:disabled" && sender.tab?.id != null) {
    chrome.action.setBadgeText({ tabId: sender.tab.id, text: "off" });
    chrome.action.setBadgeBackgroundColor({ color: "#777" });
  }
});

// Keeps the toolbar badge in sync with the hidden counter and seeds defaults on install.
chrome.runtime.onInstalled.addListener(async () => {
  const cur = await chrome.storage.local.get(null);
  const seeded = {};
  for (const [k, v] of Object.entries(YPF_DEFAULTS_BG)) if (!(k in cur)) seeded[k] = v;
  if (Object.keys(seeded).length) await chrome.storage.local.set(seeded);
});

// Minimal copy of the defaults the worker needs (the full list lives in src/defaults.js for the content script).
const YPF_DEFAULTS_BG = {
  enabled: true, mode: "hide", sensitivity: "normal", filterComments: false, hideNewsShelves: true,
  useDefaultKeywords: true, useDefaultChannels: true, keywords: [], channels: [], whitelistChannels: [], whitelistKeywords: []
};

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === "ypf:count" && sender.tab?.id != null) {
    chrome.action.setBadgeBackgroundColor({ color: "#c00" });
    chrome.action.setBadgeText({ tabId: sender.tab.id, text: msg.count ? String(msg.count) : "" });
  }
  if (msg?.type === "ypf:disabled" && sender.tab?.id != null) {
    chrome.action.setBadgeText({ tabId: sender.tab.id, text: "off" });
    chrome.action.setBadgeBackgroundColor({ color: "#777" });
  }
});

const $ = (id) => document.getElementById(id);
(async () => {
  const s = await chrome.storage.local.get(["enabled", "mode", "sensitivity", "stats"]);
  $("enabled").checked = s.enabled !== false;
  $("mode").value = s.mode || "hide";
  $("sensitivity").value = s.sensitivity || "normal";
  const st = s.stats || {};
  $("today").textContent = st.todayDate === new Date().toDateString() ? st.today : 0;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const badge = tab ? await chrome.action.getBadgeText({ tabId: tab.id }) : "";
    $("page").textContent = /^\d+$/.test(badge) ? badge : "0";
  } catch {}
})();
$("enabled").onchange = (e) => chrome.storage.local.set({ enabled: e.target.checked });
$("mode").onchange = (e) => chrome.storage.local.set({ mode: e.target.value });
$("sensitivity").onchange = (e) => chrome.storage.local.set({ sensitivity: e.target.value });
$("options").onclick = (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); };

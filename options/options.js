const $ = (id) => document.getElementById(id);
const lines = (s) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const radio = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;
const setRadio = (name, v) => { const el = document.querySelector(`input[name="${name}"][value="${v}"]`); if (el) el.checked = true; };

async function load() {
  const s = { ...YPF_DEFAULTS, ...(await chrome.storage.local.get(null)) };
  $("enabled").checked = s.enabled;
  setRadio("mode", s.mode);
  setRadio("sensitivity", s.sensitivity);
  $("hideNewsShelves").checked = s.hideNewsShelves;
  $("filterComments").checked = s.filterComments;
  $("useDefaultKeywords").checked = s.useDefaultKeywords;
  $("useDefaultChannels").checked = s.useDefaultChannels;
  $("keywords").value = s.keywords.join("\n");
  $("whitelistKeywords").value = s.whitelistKeywords.join("\n");
  $("channels").value = s.channels.join("\n");
  $("whitelistChannels").value = s.whitelistChannels.join("\n");
  $("today").textContent = s.stats.todayDate === new Date().toDateString() ? s.stats.today : 0;
  $("total").textContent = s.stats.total;
  renderLog(s.log);
}

function renderLog(log) {
  const tb = $("log").querySelector("tbody");
  tb.innerHTML = "";
  for (const item of log) {
    const tr = document.createElement("tr");
    const when = new Date(item.t);
    const cells = [
      when.toLocaleDateString() === new Date().toLocaleDateString() ? when.toLocaleTimeString() : when.toLocaleDateString(),
      item.title, item.channel || "", item.reason === "channel" ? "blocked channel" : `"${item.match}"`
    ];
    cells.forEach((c, i) => { const td = document.createElement("td"); td.textContent = c; if (i === 1) td.className = "title"; tr.appendChild(td); });
    const act = document.createElement("td");
    if (item.channel) {
      const b = document.createElement("button"); b.className = "small"; b.textContent = "Allow channel";
      b.onclick = () => { addLine("whitelistChannels", item.channel); if (item.reason === "channel") removeLine("channels", item.channel); };
      act.appendChild(b);
    }
    if (item.reason === "keyword") {
      const b = document.createElement("button"); b.className = "small"; b.textContent = "Allow word";
      b.onclick = () => addLine("whitelistKeywords", item.match);
      act.appendChild(b);
    }
    tr.appendChild(act);
    tb.appendChild(tr);
  }
}

function addLine(id, v) { const l = lines($(id).value); if (!l.some((x) => x.toLowerCase() === v.toLowerCase())) l.push(v); $(id).value = l.join("\n"); flash("Added — remember to Save"); }
function removeLine(id, v) { $(id).value = lines($(id).value).filter((x) => x.toLowerCase() !== v.toLowerCase()).join("\n"); }

async function save() {
  await chrome.storage.local.set({
    enabled: $("enabled").checked,
    mode: radio("mode"),
    sensitivity: radio("sensitivity"),
    hideNewsShelves: $("hideNewsShelves").checked,
    filterComments: $("filterComments").checked,
    useDefaultKeywords: $("useDefaultKeywords").checked,
    useDefaultChannels: $("useDefaultChannels").checked,
    keywords: lines($("keywords").value),
    whitelistKeywords: lines($("whitelistKeywords").value),
    channels: lines($("channels").value),
    whitelistChannels: lines($("whitelistChannels").value)
  });
  flash("Saved");
}

let flashTimer;
function flash(msg) { $("status").textContent = msg; clearTimeout(flashTimer); flashTimer = setTimeout(() => ($("status").textContent = ""), 2500); }

$("save").onclick = save;
$("reset").onclick = async () => { if (confirm("Reset all settings, lists and stats?")) { await chrome.storage.local.clear(); await chrome.storage.local.set(YPF_DEFAULTS); load(); flash("Reset"); } };
$("clearLog").onclick = async () => { await chrome.storage.local.set({ log: [] }); renderLog([]); };
$("showDefaults").onclick = (e) => {
  e.preventDefault();
  $("defaultsText").textContent =
    `CORE KEYWORDS (all levels)\n${YPF_CORE_KEYWORDS.join(", ")}\n\nEXTENDED (normal + strict)\n${YPF_EXTENDED_KEYWORDS.join(", ")}\n\nSTRICT ONLY\n${YPF_STRICT_KEYWORDS.join(", ")}\n\nCHANNELS\n${YPF_DEFAULT_CHANNELS.join(", ")}`;
  $("defaultsDialog").showModal();
};
$("closeDefaults").onclick = () => $("defaultsDialog").close();
chrome.storage.onChanged.addListener((ch) => { if (ch.stats || ch.log) load(); });
load();

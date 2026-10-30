// Run with: node tests/classifier.test.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const src = ["defaults.js", "classifier.js"].map((f) => fs.readFileSync(path.join(__dirname, "..", "src", f), "utf8")).join("\n");
const { YPF_DEFAULTS, YPFClassifier } = vm.runInNewContext(src + "\n;({ YPF_DEFAULTS, YPFClassifier })");

const cases = [
  // [title, channel, sensitivity, shouldHide]
  ["Trump announces new tariffs on China", "Some Channel", "normal", true],
  ["I built a $500 budget gaming PC", "LinusTechTips", "normal", false],
  ["Senate hearing erupts over immigration bill", "C-SPAN", "low", true],
  ["osu! top plays of the week", "osu!", "strict", false],
  ["Hyprland rice tour 2026", "@somelinuxguy", "strict", false],
  ["Why Israel and Iran are on the brink", "Vox", "low", true],
  ["Random cooking video", "CNN", "low", true],
  ["Random cooking video", "@cnn", "low", true],
  ["Chess world championship game 6", "GothamChess", "normal", false],
  ["Why the US economy is failing", "Economics Explained", "normal", false],
  ["Why the US economy is failing", "Economics Explained", "strict", true],
  ["GOP leaders react", "x", "normal", true],
  ["Indian street food tour", "Mark Wiens", "normal", false],
  ["Minecraft but every block is a Senate seat", "x", "low", true]
];
let fails = 0;
const check = (ok, label) => { console.log((ok ? "PASS " : "FAIL ") + label); if (!ok) fails++; };
for (const [title, channel, sensitivity, expect] of cases) {
  const v = new YPFClassifier({ ...YPF_DEFAULTS, sensitivity }).classify({ title, channel });
  check(!!v === expect, `[${sensitivity}] ${JSON.stringify(title)} -> ${v ? v.reason + ":" + v.match : "keep"}`);
}
const wl = new YPFClassifier({ ...YPF_DEFAULTS, whitelistChannels: ["Grian"], whitelistKeywords: ["minecraft"] });
check(!wl.classify({ title: "Presidential suite", channel: "Grian" }), "whitelisted channel kept");
check(!wl.classify({ title: "Trump tower in minecraft", channel: "x" }), "whitelisted keyword kept");
const custom = new YPFClassifier({ ...YPF_DEFAULTS, useDefaultKeywords: false, useDefaultChannels: false, keywords: ["re:elect\\w*"], channels: ["@foo"] });
check(!!custom.classify({ title: "Electoral college explained", channel: "x" }), "re: keyword works");
check(!!custom.classify({ title: "x", handle: "@FOO" }), "handle match is case-insensitive");
check(!custom.classify({ title: "Trump", channel: "x" }), "defaults off -> core keywords not used");
check(custom.isNewsShelf("Breaking news"), "news shelf detected");
check(!custom.isNewsShelf("Shorts"), "shorts shelf kept");
console.log(fails ? `${fails} failure(s)` : "all passed");
process.exit(fails ? 1 : 0);

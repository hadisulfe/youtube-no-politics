// Run with: node tests/ai.test.js
const fs = require("fs"), path = require("path"), vm = require("vm");
const src = fs.readFileSync(path.join(__dirname, "..", "src", "ai.js"), "utf8").replace(/^export /m, "");
const YPF_AI = vm.runInNewContext(src + "\n;YPF_AI", { chrome: { storage: { local: { get: async () => ({}), set: async () => {}, remove: async () => {} } } }, setTimeout, clearTimeout, console });
let fails = 0;
const check = (ok, label) => { console.log((ok ? "PASS " : "FAIL ") + label); if (!ok) fails++; };
check(JSON.stringify(YPF_AI.parse("1: Y\n2: N\n3: Y", 3)) === "[1,0,1]", "basic Y/N lines");
check(JSON.stringify(YPF_AI.parse("1. yes\n2) no\n3 - Political", 3)) === "[1,0,1]", "loose formats");
check(JSON.stringify(YPF_AI.parse("Sure! Here are the labels:\n1: N\n2: Y\nHope this helps", 2)) === "[0,1]", "chatter around the answer");
check(JSON.stringify(YPF_AI.parse("garbage", 2)) === "[0,0]", "unparsable -> not political");
check(JSON.stringify(YPF_AI.parse("1: Y\n5: Y", 2)) === "[1,0]", "out-of-range index ignored");
check(JSON.stringify(YPF_AI.parse("N: Y: N", 3)) === "[0,1,0]", "bare Y/N sequence fallback");
check(JSON.stringify(YPF_AI.parse("Y, N, Y, N", 3)) === "[0,0,0]", "bare sequence with wrong count ignored");
console.log(fails ? `${fails} failure(s)` : "all passed");
process.exit(fails ? 1 : 0);

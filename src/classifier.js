// Pure classification logic. No DOM access here so it can be unit tested and swapped for smarter tiers later.
class YPFClassifier {
  constructor(settings) { this.update(settings); }

  update(s) {
    this.settings = s;
    const kws = [...(s.useDefaultKeywords ? YPF_CORE_KEYWORDS : []), ...(s.keywords || [])];
    if (s.useDefaultKeywords && (s.sensitivity === "normal" || s.sensitivity === "strict")) kws.push(...YPF_EXTENDED_KEYWORDS);
    if (s.useDefaultKeywords && s.sensitivity === "strict") kws.push(...YPF_STRICT_KEYWORDS);
    this.keywordRe = YPFClassifier.compile(kws);
    this.whitelistRe = YPFClassifier.compile(s.whitelistKeywords || []);
    this.channels = new Set([...(s.useDefaultChannels ? YPF_DEFAULT_CHANNELS : []), ...(s.channels || [])].map(YPFClassifier.normChannel));
    this.whitelistChannels = new Set((s.whitelistChannels || []).map(YPFClassifier.normChannel));
    this.shelfRe = YPFClassifier.compile(YPF_SHELF_TITLES);
  }

  static normChannel(c) { return String(c || "").trim().toLowerCase().replace(/^https?:\/\/(www\.)?youtube\.com\//, "").replace(/\/$/, ""); }

  static escape(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  // Compile a list of keywords into one regex. "re:" prefix = raw regex, otherwise a word-bounded literal.
  static compile(list) {
    const parts = [];
    for (let raw of list) {
      raw = String(raw || "").trim();
      if (!raw) continue;
      if (raw.startsWith("re:")) { parts.push(`(?:${raw.slice(3)})`); continue; }
      const lit = YPFClassifier.escape(raw.toLowerCase()).replace(/\s+/g, "\\s+");
      // \b does not work next to non-word chars like "@" or "-", so use lookarounds on letters/digits.
      parts.push(`(?<![\\p{L}\\p{N}])${lit}(?![\\p{L}\\p{N}])`);
    }
    if (!parts.length) return null;
    try { return new RegExp(parts.join("|"), "iu"); }
    catch (e) { console.warn("[YPF] bad keyword regex", e); return null; }
  }

  // Returns null when the item should stay, otherwise {reason, match}.
  classify({ title = "", channel = "", handle = "", description = "" }) {
    const ch = YPFClassifier.normChannel(channel);
    const hd = YPFClassifier.normChannel(handle);
    if ((ch && this.whitelistChannels.has(ch)) || (hd && this.whitelistChannels.has(hd))) return null;
    if (this.whitelistRe && this.whitelistRe.test(title)) return null;

    if ((ch && this.channels.has(ch)) || (hd && this.channels.has(hd))) return { reason: "channel", match: channel || handle };

    if (this.keywordRe) {
      let text = `${title}\n${channel}`;
      if (this.settings.sensitivity === "strict") text += `\n${description}`;
      const m = this.keywordRe.exec(text);
      if (m) return { reason: "keyword", match: m[0] };
    }
    return null;
  }

  isNewsShelf(title) { return !!(this.settings.hideNewsShelves && this.shelfRe && title && this.shelfRe.test(title.trim())); }
}

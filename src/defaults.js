// Default settings and word lists. Everything here is user-editable from the options page.
// Keywords are matched case-insensitively on word boundaries. Multi-word phrases are allowed.
// Prefix a keyword with "re:" to use a regular expression.
const YPF_DEFAULTS = {
  enabled: true,
  mode: "hide",            // "hide" removes the card, "blur" blurs it with a "show anyway" button
  sensitivity: "normal",   // "low" = channels + core keywords, "normal" = + extended keywords, "strict" = + description/metadata text
  filterComments: false,
  hideNewsShelves: true,
  useDefaultKeywords: true,
  useDefaultChannels: true,
  keywords: [],            // user-added keywords
  channels: [],            // user-blocked channels (lower-cased channel names or @handles)
  whitelistChannels: [],   // never filter these channels
  whitelistKeywords: [],   // a title containing one of these is never filtered
  aiEnabled: false,        // opt-in: ask an LLM about titles the keyword lists did not catch
  aiBaseUrl: "http://localhost:11434/v1",  // any OpenAI-compatible endpoint (Ollama, LM Studio, OpenRouter, Groq...)
  aiModel: "qwen2.5:7b",
  aiApiKey: "",
  stats: { total: 0, today: 0, todayDate: "" },
  log: []                  // last N hidden items for auditing false positives
};

// Core: almost always political when it appears in a title.
const YPF_CORE_KEYWORDS = [
  // institutions / process
  "election", "elections", "electoral", "midterm", "midterms", "midterm elections", "voter", "voters", "voting rights", "ballot", "ballots", "primaries", "primary election", "caucus",
  "congress", "congressional", "senate", "senator", "senators", "house of representatives", "speaker of the house",
  "parliament", "parliamentary", "legislature", "legislation", "bill passes", "filibuster", "impeach", "impeachment",
  "white house", "oval office", "downing street", "kremlin", "supreme court", "scotus", "attorney general",
  "president", "presidential", "vice president", "prime minister", "chancellor", "governor", "mayor",
  "republican", "republicans", "gop", "democrat", "democrats", "dnc", "rnc", "maga", "libertarian",
  "conservative", "conservatives", "liberal", "liberals", "progressive", "progressives", "socialist", "socialism",
  "communist", "communism", "marxist", "fascist", "fascism", "far-right", "far right", "far-left", "far left",
  "alt-right", "woke", "antifa", "nationalist", "nationalism", "populist", "populism",
  "left-wing", "right-wing", "leftist", "leftists", "rightist", "bipartisan", "partisan",
  "political", "politics", "politician", "politicians", "geopolitics", "geopolitical",
  "policy", "policies", "executive order", "tariff", "tariffs", "sanction", "sanctions",
  "immigration", "immigrants", "border crisis", "deportation", "deportations", "ice raids", "asylum seekers",
  "abortion", "pro-life", "pro-choice", "roe v wade", "gun control", "second amendment", "2nd amendment",
  "lobbying", "lobbyist", "campaign trail", "debate night", "town hall", "press conference", "press secretary",
  "propaganda", "regime", "coup", "dictator", "authoritarian", "censorship",
  // conflict / world affairs
  "war in", "ceasefire", "airstrike", "airstrikes", "invasion", "invades", "nato", "united nations", "un security council",
  "gaza", "hamas", "israel", "israeli", "palestine", "palestinian", "west bank", "hezbollah", "idf",
  "ukraine", "ukrainian", "zelensky", "zelenskyy", "putin", "russia", "russian", "moscow",
  "iran", "iranian", "tehran", "houthi", "houthis", "yemen", "syria", "syrian", "assad", "taliban", "afghanistan",
  "china", "chinese", "beijing", "ccp", "xi jinping", "taiwan", "hong kong", "north korea", "kim jong",
  "india", "modi", "pakistan", "kashmir", "erdogan", "turkey", "netanyahu", "al-sharaa", "sisi",
  // people (frequently political; edit freely)
  "trump", "biden", "kamala", "harris", "obama", "clinton", "pelosi", "aoc", "ocasio-cortez", "desantis",
  "vance", "jd vance", "musk doge", "doge", "rfk", "newsom", "bernie", "sanders", "schumer", "mcconnell",
  "pence", "ramaswamy", "haley", "tulsi", "gabbard", "hegseth", "rubio", "walz", "bannon",
  "farage", "starmer", "sunak", "le pen", "macron", "scholz", "merz", "orban", "milei", "lula", "bolsonaro",
  "trudeau", "poilievre", "carney", "albanese", "dutton",
  // media / commentary genres
  "breaking news", "news conference", "fox news", "cnn", "msnbc", "newsmax", "oann",
  "daily wire", "ben shapiro", "tucker carlson", "charlie kirk", "candace owens", "jordan peterson politics",
  "hasan piker", "hasanabi", "destiny debate", "vaush", "piers morgan", "tyt", "young turks", "majority report"
];

// Extended: political most of the time; a few false positives (history, economics). Used at "normal" and above.
const YPF_EXTENDED_KEYWORDS = [
  "government", "govt", "federal government", "minister", "ministry", "administration", "diplomat", "diplomacy",
  "embassy", "treaty", "referendum", "constitution", "constitutional", "amendment",
  "lawmakers", "indictment", "indicted", "subpoena", "testifies", "testimony", "hearing",
  "protest", "protests", "protesters", "riot", "riots", "unrest", "activist", "activists",
  "corruption", "whistleblower",
  "troops", "missile strike", "drone strike", "pentagon", "defense secretary", "military parade",
  "terrorist", "terrorism", "extremist", "genocide", "ethnic cleansing", "refugee", "refugees", "humanitarian crisis",
  "inflation", "recession", "federal reserve", "stimulus", "debt ceiling", "national debt",
  "taxes", "taxation", "welfare", "medicare", "medicaid", "obamacare", "social security",
  "climate policy", "green new deal", "net zero",
  "transgender", "gender ideology", "pronouns", "dei", "critical race theory",
  "free speech", "cancel culture", "misinformation", "disinformation", "fact check", "fact-check",
  "blm", "black lives matter", "defund the police", "cartel", "cartels",
  "vaccine mandate", "lockdowns",
  "headlines", "pundit", "op-ed", "rally", "swing state", "red state", "blue state",
  "poll", "polls", "polling", "approval rating"
];

// Strict: broad words that are often political but also common elsewhere. Only used at "strict".
const YPF_STRICT_KEYWORDS = [
  "federal", "cabinet", "summit", "law", "lawsuit", "trial", "verdict", "court", "judge", "ruling",
  "strike", "scandal", "leak", "leaked", "military", "army", "missile", "missiles", "nuclear",
  "economy", "interest rates", "budget", "tax", "lgbtq", "drag queen", "crt",
  "police", "cops", "border", "mandate", "lockdown", "world health organization",
  "news", "reporter", "journalist", "anchor", "commentary", "debate", "debates", "speech", "interview"
];

// Channels that primarily publish news/politics. Matched against channel name or @handle, case-insensitive.
// Kept across the spectrum on purpose; remove or add from the options page.
const YPF_DEFAULT_CHANNELS = [
  "fox news", "@foxnews", "cnn", "@cnn", "msnbc", "@msnbc", "ms now", "@msnow", "the new york times", "@nytimes", "the washington post", "@washingtonpost", "the guardian", "@guardiannews", "reuters", "@reuters", "associated press", "@ap", "bloomberg television", "@markets", "the daily show", "@thedailyshow", "last week tonight", "@lastweektonight", "newsmax", "@newsmaxtv", "one america news",
  "abc news", "@abcnews", "nbc news", "@nbcnews", "cbs news", "@cbsnews", "pbs newshour", "@pbsnewshour",
  "bbc news", "@bbcnews", "sky news", "@skynews", "al jazeera english", "@aljazeeraenglish", "dw news", "@dwnews",
  "france 24 english", "@france24_en", "cbc news", "@cbcnews", "global news", "@globalnews", "abc news (australia)",
  "the hill", "@thehill", "politico", "@politico", "c-span", "@cspan", "forbes breaking news", "@forbesbreakingnews",
  "the daily wire", "@dailywire", "ben shapiro", "@benshapiro", "tucker carlson", "@tuckercarlson",
  "the young turks", "@thedamagereport", "@tyt", "the majority report w/ sam seder", "@samseder",
  "hasanabi", "@hasanabi", "@hasanabihighlights", "destiny", "@destiny", "vaush", "@vaush",
  "brian tyler cohen", "@briantylercohen", "david pakman show", "@thedavidpakmanshow", "the rubin report", "@rubinreport",
  "steven crowder", "@stevencrowder", "candace owens", "@realcandaceo", "charlie kirk", "@realcharliekirk",
  "breaking points", "@breakingpoints", "the hill rising", "meidastouch", "@meidastouch", "the lincoln project",
  "piers morgan uncensored", "@piersmorganuncensored", "gbnews", "@gbnews", "talktv", "novara media", "@novaramedia",
  "sky news australia", "@skynewsaustralia", "rebel news", "@rebelnews", "ndtv", "@ndtv", "wion", "@wion",
  "trt world", "@trtworld", "rt", "cgtn", "@cgtn", "firstpost", "@firstpost", "times now", "@timesnow"
];

// Shelf / section titles on the home page that get removed entirely when hideNewsShelves is on.
const YPF_SHELF_TITLES = ["breaking news", "top news", "news", "latest news posts", "politics", "election"];

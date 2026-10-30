# YouTube Political Filter

A small Manifest V3 extension for Chromium browsers (Brave, Chrome, Edge…) that removes political videos from YouTube's
home feed, search results, watch-page sidebar, Shorts shelves and (optionally) comments.

No build step, no dependencies, nothing leaves your browser.

## How it decides what is political

1. **Blocked channels** – a built-in list of news / politics channels across the spectrum, plus anything you add.
   Hover any video card and click **Block channel**.
2. **Keywords** – matched case-insensitively on whole words against the title and channel name:
   - *low*: core list only (election, senate, Trump, Gaza, Putin, …)
   - *normal* (default): also broader terms (protests, inflation, refugees, …)
   - *strict*: also vague words (news, debate, court, interview, …) and the video description
3. **News shelves** – home-page shelves titled "Breaking news", "News", … are removed wholesale.

Whitelists (channels and words) always win, so you can fix false positives from the **Recently hidden** log on the options page.

## Install (unpacked)

```sh
git clone https://github.com/hadisulfe/youtube-no-politics.git ~/youtube-no-politics
```

1. Open `brave://extensions` (or `chrome://extensions`)
2. Turn on **Developer mode** (top right)
3. **Load unpacked** → pick the `~/youtube-no-politics` folder
4. Open YouTube. The toolbar badge shows how many items were hidden on the current page.

After `git pull`, click the reload icon on the extension card.

## Options

Toolbar popup: on/off, remove vs blur, sensitivity.
Options page (`Open options & lists`): keyword and channel lists, whitelists, comment filtering, hidden-items log, stats.

Keyword lines starting with `re:` are treated as regular expressions, e.g. `re:elect\w*`.

## Layout

| File | Purpose |
|---|---|
| `src/defaults.js` | default settings and the built-in keyword / channel lists |
| `src/selectors.js` | every YouTube DOM selector, in one place for when YouTube renames things |
| `src/classifier.js` | pure matching logic (no DOM) |
| `src/content.js` | MutationObserver, hide/blur, block button, counters |
| `src/background.js` | badge + default seeding |
| `options/`, `popup/` | UI |
| `tests/classifier.test.js` | `node tests/classifier.test.js` |

## Ideas for later

- On-device zero-shot classifier (Transformers.js) as an opt-in tier for titles the keyword list misses
- Optional LLM API batch classification
- Blur the player itself when the current video is political
- Export/import lists

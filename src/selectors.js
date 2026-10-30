// All YouTube DOM knowledge lives here so it is easy to patch when YouTube changes tag names.
const YPF_SELECTORS = {
  // A "card" is the element that gets removed/blurred. Order matters only for readability.
  cards: [
    "ytd-rich-item-renderer",            // home grid (wraps ytd-rich-grid-media / yt-lockup-view-model)
    "ytd-video-renderer",                // search results, subscriptions list
    "ytd-compact-video-renderer",        // watch page sidebar (old)
    "ytd-compact-radio-renderer",
    "ytd-compact-playlist-renderer",
    "ytd-grid-video-renderer",           // channel pages (old)
    "ytd-playlist-video-renderer",
    "ytd-playlist-renderer",
    "ytd-radio-renderer",
    "ytd-channel-renderer",              // channel result in search
    "ytd-movie-renderer",
    "ytd-reel-item-renderer",            // shorts shelf (old)
    "ytm-shorts-lockup-view-model",      // shorts shelf (new)
    "ytm-shorts-lockup-view-model-v2",
    "yt-lockup-view-model",              // new unified card (sidebar, shelves) when not inside a rich item
    "ytd-post-renderer",                 // community posts in feed
    "ytd-backstage-post-thread-renderer",
    // mobile web
    "ytm-rich-item-renderer",
    "ytm-video-with-context-renderer",
    "ytm-compact-video-renderer",
    "ytm-item-section-renderer"
  ],
  comments: ["ytd-comment-thread-renderer", "ytd-comment-view-model"],
  // Shelves that are removed wholesale when their header matches YPF_SHELF_TITLES.
  shelves: ["ytd-rich-section-renderer", "ytd-rich-shelf-renderer", "ytd-shelf-renderer", "ytd-reel-shelf-renderer", "ytd-item-section-renderer"],
  shelfTitle: ["#title", "#title-text", "h2", ".yt-shelf-header-layout-wiz__title", "span#title"],
  title: [
    "#video-title", "a#video-title-link", "#video-title-link",
    "h3 a", "h3", ".yt-lockup-metadata-view-model-wiz__title", ".yt-lockup-metadata-view-model__title",
    ".shortsLockupViewModelHostMetadataTitle", ".shortsLockupViewModelHostOutsideMetadataTitle",
    "#content-text", ".media-item-headline", ".yt-core-attributed-string"
  ],
  channel: [
    "ytd-channel-name #text", "ytd-channel-name a", "#channel-name #text", "#channel-name a", "#byline", "#byline a",
    ".yt-content-metadata-view-model-wiz__metadata-text", ".yt-content-metadata-view-model__metadata-text",
    "#text.ytd-channel-name", "#author-text", "a.yt-simple-endpoint.style-scope.yt-formatted-string",
    ".ytm-channel-name", ".ytm-badge-and-byline-renderer"
  ],
  channelLink: ["a[href^='/@']", "a[href^='/channel/']", "a[href^='/c/']", "a[href*='youtube.com/@']", "a[href*='/channel/']"],
  description: ["#description-text", ".metadata-snippet-text", "#description", "yt-formatted-string#description-text", "#metadata-line"],
  // Where to put the "block channel" button on a card.
  menuAnchor: ["#menu", "ytd-menu-renderer", ".yt-lockup-metadata-view-model-wiz__menu-button", "#details"],
  // Watch page: the currently playing video's title and channel, used to blur the player if the current video is political.
  watchTitle: ["ytd-watch-metadata h1 yt-formatted-string", "h1.ytd-watch-metadata", "#title h1"],
  watchChannel: ["ytd-watch-metadata ytd-channel-name #text", "#owner #channel-name #text", "#upload-info #channel-name a"]
};

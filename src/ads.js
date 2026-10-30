export const AD_CLIENT = "ca-pub-4576154921851098";
export const AD_SLOT = "7285522592";

export function mayRequestAd(mode, actual, expected) {
  return mode === "live" && actual.protocol === "https:" &&
    actual.origin === expected.origin && actual.pathname.startsWith(expected.pathname) &&
    !["localhost", "127.0.0.1", "[::1]"].includes(actual.hostname);
}

// One slot and one request per document. Draws, reset and game changes never refresh ads.
export function initializeAd(doc = document, win = window) {
  const section = doc.getElementById("guide-ad");
  if (!section || section.dataset.requested) return;
  const expected = new URL(section.dataset.site);
  if (!mayRequestAd(section.dataset.mode, new URL(win.location.href), expected)) return;
  section.dataset.requested = "true";
  const script = doc.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;
  // Failure or ad blockers must not affect drawing or copying.
  script.onerror = () => { section.dataset.loadState = "unavailable"; };
  doc.head.append(script);
  win.adsbygoogle = win.adsbygoogle || [];
  win.adsbygoogle.push({});
}

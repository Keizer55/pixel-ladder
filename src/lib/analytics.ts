// Umami custom events (https://stats.zikzero.com). The tracker script loads from
// index.html; window.umami is missing when it is blocked or still loading, so
// every call is optional and never breaks the app.
type EventData = Record<string, string | number | boolean>;

export function track(event: string, data?: EventData) {
  try {
    window.umami?.track(event, data);
  } catch {
    // Analytics must never interfere with the tool.
  }
}

declare global {
  interface Window {
    umami?: { track: (event: string, data?: EventData) => void };
  }
}

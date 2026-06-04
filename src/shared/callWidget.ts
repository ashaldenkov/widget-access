import type { CallPayload, CallWidgetAPI } from './callWidget.types';

/**
 * Module-level singleton that owns the Call Widget instance.
 *
 * Step 1 (this file): load the widget from the CDN with *deferred*
 * initialization — `load()` is called WITHOUT config, so the widget mounts and
 * fires `initialized` but performs no network requests until `emit('init', …)`
 * is sent later (once auth/backend values exist).
 */

const rawBase = import.meta.env.VITE_CALL_WIDGET_CDN_URL;

/** CDN base with any trailing slash removed. */
const base = (rawBase ?? '').replace(/\/+$/, '');

/** Public URLs derived from the CDN base (see the bucket layout in the guide). */
export const loaderUrl = base ? `${base}/call-widget/loader.js` : '';
export const scriptUrl = base
  ? `${base}/call-widget/latest/call-widget.js`
  : '';

let instance: CallWidgetAPI | null = null;
let loaderPromise: Promise<void> | null = null;
let loadPromise: Promise<CallWidgetAPI> | null = null;
let initialized = false;
let capturedVersion: string | null = null;

/**
 * The widget does not expose its version on any API — `window.CallWidget` is the
 * event bus itself. The only runtime signal is a startup log of the form
 * `[CallWidget] v1.2.3`. We temporarily wrap `console.info` to sniff it, then
 * restore the original once captured. Best-effort: if the log format ever
 * changes, `getWidgetVersion()` falls back to the CDN channel from `scriptUrl`.
 */
function installVersionSniffer(): void {
  const original = console.info.bind(console);
  console.info = (...args: unknown[]) => {
    if (capturedVersion === null) {
      const first = args[0];
      if (typeof first === 'string') {
        const match = first.match(/\[CallWidget\]\s*v([\d.]+)/);
        if (match) {
          capturedVersion = match[1];
          console.info = original; // restore — we only need it once
        }
      }
    }
    original(...args);
  };
}

/** The mounted widget API, or null if it hasn't loaded yet. */
export const getCallWidget = (): CallWidgetAPI | null => instance;

/** True once the widget has fired its `initialized` event at least once. */
export const isWidgetInitialized = (): boolean => initialized;

/**
 * Display version derived from the configured `scriptUrl`:
 * `latest` for the rolling build, or the `<hash>` segment for a pinned
 * `/v/<hash>/` URL. Falls back to an instance-provided `version` if present.
 */
export function getWidgetVersion(): string {
  if (capturedVersion) return capturedVersion;
  if (instance?.version) return instance.version;
  const pinned = scriptUrl.match(/\/v\/([^/]+)\//);
  if (pinned) return pinned[1];
  if (scriptUrl.includes('/latest/')) return 'latest';
  return 'unknown';
}

/** Inject the loader script once; resolves when `window.CallWidgetLoader` exists. */
function ensureLoaderScript(): Promise<void> {
  if (window.CallWidgetLoader) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = loaderUrl;
    script.async = true;
    script.onload = () => {
      if (window.CallWidgetLoader) {
        resolve();
      } else {
        loaderPromise = null;
        reject(
          new Error('loader.js loaded but did not attach window.CallWidgetLoader'),
        );
      }
    };
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error(`Failed to load loader.js from ${loaderUrl}`));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}

/**
 * Load and mount the widget (deferred init — no config). Cached: repeat calls
 * return the same promise / instance.
 */
export function loadCallWidget(): Promise<CallWidgetAPI> {
  if (loadPromise) return loadPromise;

  if (!base) {
    return Promise.reject(
      new Error('VITE_CALL_WIDGET_CDN_URL is not set — cannot load the widget.'),
    );
  }

  // Must be installed before the bundle's IIFE runs and logs its version.
  installVersionSniffer();

  loadPromise = ensureLoaderScript()
    .then(() => window.CallWidgetLoader!.load({ scriptUrl }))
    .then((widget) => {
      instance = widget;
      // Track initialization at the module level so React (incl. StrictMode
      // double-mount and event-vs-mount races) can backfill connected state.
      widget.on('initialized', () => {
        initialized = true;
      });
      return widget;
    })
    .catch((err) => {
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}

/** Backend config, sourced from env. `authToken` is supplied at init time. */
export const widgetConfig = {
  apiBaseUrl: import.meta.env.VITE_PUBLIC_API_BASE_URL ?? '',
  webBaseUrl: import.meta.env.VITE_PUBLIC_WEB_BASE_URL ?? '',
  janusWsUrl: import.meta.env.VITE_JANUS_WS_URL ?? '',
};

/**
 * Initialize the widget with the env config + the provided auth token.
 * Returns false if the widget hasn't loaded yet.
 */
export function initWidget(authToken: string): boolean {
  const widget = getCallWidget();
  if (!widget) return false;
  widget.emit('init', { ...widgetConfig, authToken });
  return true;
}

/** Start a call flow. Returns false if the widget hasn't loaded yet. */
export function placeCall(payload: CallPayload): boolean {
  const widget = getCallWidget();
  if (!widget) return false;
  widget.emit('call', payload);
  return true;
}

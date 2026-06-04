import { useEffect, useState } from 'react';
import {
  getWidgetVersion,
  isWidgetInitialized,
  loadCallWidget,
  scriptUrl,
} from './callWidget';
import type { CallWidgetAPI } from './callWidget.types';

export type WidgetStatus = 'loading' | 'mounted' | 'connected' | 'error';

export interface WidgetEvent {
  id: number;
  /** Wall-clock time the event was received (locale time string). */
  time: string;
  /** Outbound event name from the widget's event bus. */
  name: string;
  /** Event payload, if any. */
  payload?: unknown;
}

/** Every outbound event the widget can emit (Widget → Host). */
const OUTBOUND_EVENTS = [
  'initialized',
  'widget_opened',
  'widget_dismissed',
  'call_state_change',
  'trunk_selected',
  'mic_toggled',
  'status_confirmed',
  'status_change_skipped',
  'error',
  'unauthorized',
] as const;

export interface UseCallWidgetResult {
  status: WidgetStatus;
  error: string | null;
  version: string;
  scriptUrl: string;
  events: WidgetEvent[];
}

/**
 * Bootstraps the Call Widget (deferred init) and mirrors its connection status
 * and live event-bus activity into React state.
 */
export function useCallWidget(): UseCallWidgetResult {
  const [status, setStatus] = useState<WidgetStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string>(() => getWidgetVersion());
  const [events, setEvents] = useState<WidgetEvent[]>([]);

  useEffect(() => {
    let active = true;
    let nextId = 0;
    let widget: CallWidgetAPI | null = null;

    const append = (name: string, payload?: unknown) => {
      if (!active) return;
      const time = new Date().toLocaleTimeString();
      setEvents((prev) => [{ id: nextId++, time, name, payload }, ...prev]);
    };

    // A handler per event so the no-payload events read cleanly in the log.
    const handlers: Record<string, (payload?: unknown) => void> = {};
    for (const name of OUTBOUND_EVENTS) {
      handlers[name] = (payload?: unknown) => {
        append(name, payload);
        if (name === 'initialized') {
          setStatus('connected');
          setVersion(getWidgetVersion());
        }
      };
    }

    loadCallWidget()
      .then((api) => {
        if (!active) return;
        widget = api;
        setVersion(getWidgetVersion());
        for (const name of OUTBOUND_EVENTS) {
          // The typed overloads can't see a runtime-keyed name; cast at the boundary.
          (api.on as (e: string, h: (p?: unknown) => void) => void)(
            name,
            handlers[name],
          );
        }
        // Backfill: the widget may already be initialized (StrictMode re-mount
        // or an event that fired before listeners attached).
        setStatus(isWidgetInitialized() ? 'connected' : 'mounted');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      active = false;
      if (widget) {
        for (const name of OUTBOUND_EVENTS) {
          (widget.off as (e: string, h: (p?: unknown) => void) => void)(
            name,
            handlers[name],
          );
        }
      }
    };
  }, []);

  return { status, error, version, scriptUrl, events };
}

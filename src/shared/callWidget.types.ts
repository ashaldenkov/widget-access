export interface CallWidgetConfig {
  apiBaseUrl: string;
  webBaseUrl: string;
  janusWsUrl: string;
  authToken: string;
}

export interface CallPayload {
  apiKey: string;
  extAgentId: number;
  extCustomerId: number;
  phoneNumber?: string;
}

export interface CallStateChangePayload {
  state: 'calling' | 'ringing' | 'connected' | 'ended' | 'failed';
  clientId?: number;
}

export interface CallWidgetAPI {
  /** Optional, undocumented: some builds expose a version on the instance. */
  version?: string;

  emit(event: 'init', payload: CallWidgetConfig): void;
  emit(event: 'call', payload: CallPayload): void;
  emit(event: 'dismiss'): void;
  emit(event: 'update_token', payload: { token: string }): void;

  on(event: 'initialized', handler: () => void): void;
  on(event: 'widget_opened', handler: () => void): void;
  on(event: 'widget_dismissed', handler: () => void): void;
  on(
    event: 'call_state_change',
    handler: (payload: CallStateChangePayload) => void,
  ): void;
  on(
    event: 'trunk_selected',
    handler: (payload: { trunkId: string; trunkName: string }) => void,
  ): void;
  on(
    event: 'mic_toggled',
    handler: (payload: { muted: boolean }) => void,
  ): void;
  on(
    event: 'status_confirmed',
    handler: (payload: {
      clientId: number;
      statusId: string;
      dialerId: number;
    }) => void,
  ): void;
  on(
    event: 'status_change_skipped',
    handler: (payload: { clientId: number }) => void,
  ): void;
  on(event: 'error', handler: (payload: { message: string }) => void): void;
  on(event: 'unauthorized', handler: () => void): void;

  off(event: string, handler: (...args: never[]) => void): void;
}

declare global {
  interface Window {
    CallWidgetLoader?: {
      load(options: {
        scriptUrl: string;
        config?: CallWidgetConfig;
      }): Promise<CallWidgetAPI>;
    };
    CallWidget?: CallWidgetAPI;
  }
}

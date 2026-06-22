import { useState } from 'react';
import './App.css';
import {
  defaultWidgetConfig,
  dismissWidget,
  initWidget,
  placeCall,
} from './shared/callWidget';
import { useCallWidget, type WidgetStatus } from './shared/useCallWidget';

const STATUS_LABELS: Record<WidgetStatus, string> = {
  loading: 'Loading…',
  mounted: 'Mounted — awaiting init',
  connected: 'Connected',
  error: 'Error',
};

function App() {
  const { status, error, version, events } = useCallWidget();

  const [apiBaseUrl, setApiBaseUrl] = useState(defaultWidgetConfig.apiBaseUrl);
  const [webBaseUrl, setWebBaseUrl] = useState(defaultWidgetConfig.webBaseUrl);
  const [janusWsUrl, setJanusWsUrl] = useState(defaultWidgetConfig.janusWsUrl);
  const [didInit, setDidInit] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [extAgentId, setExtAgentId] = useState('');
  const [extCustomerId, setExtCustomerId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleInit = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = initWidget({
      apiBaseUrl: apiBaseUrl.trim(),
      webBaseUrl: webBaseUrl.trim(),
      janusWsUrl: janusWsUrl.trim(),
    });
    if (ok) setDidInit(true);
  };

  const handleDismiss = () => {
    dismissWidget();
  };

  const handleCall = (e: React.FormEvent) => {
    e.preventDefault();
    placeCall({
      apiKey: apiKey.trim(),
      extAgentId: Number(extAgentId),
      extCustomerId: Number(extCustomerId),
      phoneNumber: phoneNumber.trim() || undefined,
    });
  };

  const callReady =
    didInit &&
    apiKey.trim() !== '' &&
    extAgentId.trim() !== '' &&
    extCustomerId.trim() !== '';

  return (
    <main className="widget-app">
      <div className="widget-main">
      <header className="widget-header">
        <h1>Call Widget</h1>
        <span className={`status-badge status-${status}`}>
          <span className="status-dot" />
          {STATUS_LABELS[status]}
        </span>
      </header>

      {status === 'error' && error && (
        <p className="widget-error" role="alert">
          {error}
        </p>
      )}

      <section className="info-grid" aria-label="Widget details">
        <div className="info-cell">
          <span className="info-label">Version</span>
          <span className="info-value">{version}</span>
        </div>
        <div className="info-cell">
          <span className="info-label">Initialized</span>
          <span className="info-value">{didInit ? 'Yes' : 'No'}</span>
        </div>
      </section>

      <form className="panel" onSubmit={handleInit}>
        <h2>Initialize</h2>

        <div className="field-row">
          <label className="field">
            <span>API base URL</span>
            <input
              value={apiBaseUrl}
              onChange={(e) => setApiBaseUrl(e.target.value)}
              placeholder="https://api.example.com"
              spellCheck={false}
            />
          </label>
          <label className="field">
            <span>Web base URL</span>
            <input
              value={webBaseUrl}
              onChange={(e) => setWebBaseUrl(e.target.value)}
              placeholder="https://app.example.com"
              spellCheck={false}
            />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Janus WS URL</span>
            <input
              value={janusWsUrl}
              onChange={(e) => setJanusWsUrl(e.target.value)}
              placeholder="wss://webrtc.example.com/ws"
              spellCheck={false}
            />
          </label>
        </div>
        <button type="submit">
          {didInit ? 'Re-initialize' : 'Initialize'}
        </button>
      </form>

      <form className="panel" onSubmit={handleCall}>
        <h2>Place a call</h2>
        <div className="field-row">
          <label className="field">
            <span>API key</span>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="dialer_api_…"
              spellCheck={false}
            />
          </label>
          <label className="field">
            <span>Phone number</span>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890 (optional)"
            />
          </label>
        </div>
        <div className="field-row">
          <label className="field">
            <span>Ext agent ID</span>
            <input
              type="number"
              value={extAgentId}
              onChange={(e) => setExtAgentId(e.target.value)}
              placeholder="456"
            />
          </label>
          <label className="field">
            <span>Ext customer ID</span>
            <input
              type="number"
              value={extCustomerId}
              onChange={(e) => setExtCustomerId(e.target.value)}
              placeholder="123"
            />
          </label>
        </div>
        <div className="button-row">
          <div className="call-group">
            <button type="submit" disabled={!callReady}>
              Call
            </button>
            {!didInit && (
              <span className="panel-hint">Initialize the widget first.</span>
            )}
          </div>
          <div className="dismiss-group">
            <button
              type="button"
              className="button-danger"
              onClick={handleDismiss}
              disabled={status === 'loading' || status === 'error'}
            >
              Dismiss
            </button>
            <span className="dismiss-hint">
              Tears down the widget and interrupts any active call — host calls this
              on user logout.
            </span>
          </div>
        </div>
      </form>
      </div>

      <aside className="event-log" aria-label="Event bus log">
        <div className="event-log-head">
          <h2>Event bus</h2>
          <span className="event-count">{events.length}</span>
        </div>

        {events.length === 0 ? (
          <p className="event-empty">No events yet.</p>
        ) : (
          <ul className="event-list">
            {events.map((event) => (
              <li key={event.id} className="event-row">
                <time className="event-time">{event.time}</time>
                <span className={`event-name event-name--${event.name}`}>
                  {event.name}
                </span>
                <code className="event-payload">
                  {event.payload === undefined
                    ? '—'
                    : JSON.stringify(event.payload)}
                </code>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </main>
  );
}

export default App;

import './App.css';
import { loaderUrl } from './shared/callWidget';
import { useCallWidget, type WidgetStatus } from './shared/useCallWidget';

const STATUS_LABELS: Record<WidgetStatus, string> = {
  loading: 'Loading…',
  mounted: 'Mounted — awaiting init',
  connected: 'Connected',
  error: 'Error',
};

function App() {
  const { status, error, version, scriptUrl, events } = useCallWidget();

  return (
    <main className="widget-app">
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
          <span className="info-label">Mode</span>
          <span className="info-value">Deferred — awaiting init config</span>
        </div>
        <div className="info-cell info-cell--wide">
          <span className="info-label">Script URL</span>
          <code className="info-value info-value--mono">{scriptUrl}</code>
        </div>
        <div className="info-cell info-cell--wide">
          <span className="info-label">Loader URL</span>
          <code className="info-value info-value--mono">{loaderUrl}</code>
        </div>
      </section>

      <section className="event-log" aria-label="Event bus log">
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
      </section>

      <p className="widget-note">
        Backend init config (<code>apiBaseUrl</code>, <code>webBaseUrl</code>,{' '}
        <code>janusWsUrl</code>, <code>authToken</code>) is intentionally deferred
        for this step — the widget mounts and reports events without making
        network requests.
      </p>
    </main>
  );
}

export default App;

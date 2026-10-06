import React, { useState } from 'react';
import { Link2, LoaderCircle, Check, AlertCircle } from 'lucide-react';

export function JobUrlScraper({ onScraped, disabled }) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  async function handleScrape(e) {
    e.preventDefault();
    const target = url.trim();
    if (!target || loading) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const resp = await fetch('/api/v1/jobs/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Failed to fetch job (${resp.status})`);
      }

      const data = await resp.json();
      onScraped(data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Could not fetch job from this URL. Please paste description manually.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="job-url-scraper" style={{ marginBottom: 14 }}>
      <label className="field-label" style={{ fontSize: 12 }}>
        Auto-fill from Job URL <span>paste link</span>
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="input-with-icon" style={{ flex: 1 }}>
          <Link2 size={15} style={{ color: '#94a0b2', flexShrink: 0 }} />
          <input
            type="url"
            placeholder="https://company.com/jobs/role..."
            value={url}
            disabled={disabled || loading}
            onChange={e => { setUrl(e.target.value); setError(null); }}
            style={{ fontSize: 13 }}
          />
        </div>
        <button
          type="button"
          onClick={handleScrape}
          className="reference-button"
          style={{ padding: '8px 14px', fontSize: 12, borderRadius: 10, whiteSpace: 'nowrap' }}
          disabled={disabled || loading || !url.trim()}
        >
          {loading ? <LoaderCircle className="spin" size={14} /> : success ? <Check size={14} /> : null}
          {loading ? 'Fetching…' : success ? 'Imported!' : 'Import JD'}
        </button>
      </div>

      {error && (
        <p className="reference-muted" style={{ fontSize: 11, color: '#f87171', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}


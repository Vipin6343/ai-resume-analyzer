import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Sparkles, Share2, LoaderCircle } from 'lucide-react';

export function LinkedInModal({ file, targetJob, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    if (!isOpen || data || !file) return;

    let cancelled = false;
    async function fetchLinkedIn() {
      setLoading(true);
      setError(null);
      const form = new FormData();
      form.append('file', file);
      if (targetJob) form.append('target_job', targetJob);

      try {
        const resp = await fetch('/api/v1/resumes/linkedin-summary', {
          method: 'POST',
          body: form,
        });
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Error ${resp.status}`);
        }
        const json = await resp.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to generate LinkedIn summary.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLinkedIn();
    return () => { cancelled = true; };
  }, [isOpen, file, targetJob]);

  if (!isOpen) return null;

  async function copyText(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2500);
    } catch {
      setCopiedKey('fail');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card linkedin-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="icon-tile" style={{ background: '#0a66c222', color: '#0a66c2' }}>
              <Share2 size={20} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>LinkedIn Profile Enhancer</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                Optimized headline, About section, and skill tags
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="modal-loading-state">
              <LoaderCircle className="spin" size={32} />
              <p>Analyzing experience and crafting LinkedIn brand presence…</p>
            </div>
          )}

          {error && (
            <div className="error" role="alert" style={{ margin: '16px 0' }}>
              {error}
            </div>
          )}

          {data && !loading && (
            <div className="linkedin-sections">
              {/* Headline */}
              <div className="linkedin-card">
                <div className="linkedin-card-header">
                  <strong>Headline</strong>
                  <button
                    className="action-pill-btn"
                    onClick={() => copyText(data.headline, 'headline')}
                  >
                    {copiedKey === 'headline' ? <Check size={13} /> : <Copy size={13} />}
                    {copiedKey === 'headline' ? 'Copied' : 'Copy Headline'}
                  </button>
                </div>
                <p className="linkedin-preview-text">{data.headline}</p>
                <small className="reference-muted">{data.headline.length} / 120 characters</small>
              </div>

              {/* About Summary */}
              <div className="linkedin-card">
                <div className="linkedin-card-header">
                  <strong>About Section</strong>
                  <button
                    className="action-pill-btn"
                    onClick={() => copyText(data.about_summary, 'about')}
                  >
                    {copiedKey === 'about' ? <Check size={13} /> : <Copy size={13} />}
                    {copiedKey === 'about' ? 'Copied' : 'Copy About'}
                  </button>
                </div>
                <div className="linkedin-preview-text" style={{ whiteSpace: 'pre-line', lineHeight: 1.7 }}>
                  {data.about_summary}
                </div>
              </div>

              {/* Hashtags */}
              {data.key_hashtags?.length > 0 && (
                <div className="linkedin-card">
                  <div className="linkedin-card-header">
                    <strong>Search Keywords &amp; Hashtags</strong>
                    <button
                      className="action-pill-btn"
                      onClick={() => copyText(data.key_hashtags.join(' '), 'hashtags')}
                    >
                      {copiedKey === 'hashtags' ? <Check size={13} /> : <Copy size={13} />}
                      {copiedKey === 'hashtags' ? 'Copied' : 'Copy Tags'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {data.key_hashtags.map((tag, i) => (
                      <span key={i} className="reference-chip" style={{ color: '#60a5fa', borderColor: '#3b82f644' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


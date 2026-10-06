import React, { useState } from 'react';
import { Sparkles, Copy, Check, ArrowRight, Wand2, LoaderCircle, Zap } from 'lucide-react';

export function InlineRewriter({ bulletRewrites = [], targetRole = '' }) {
  const [copiedKey, setCopiedKey] = useState('');
  const [customBullet, setCustomBullet] = useState('');
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [customResults, setCustomResults] = useState(null);
  const [customError, setCustomError] = useState(null);

  async function copyText(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2500);
    } catch {
      setCopiedKey('fail');
    }
  }

  async function handleRewriteCustom(e) {
    e.preventDefault();
    if (!customBullet.trim() || loadingCustom) return;

    setLoadingCustom(true);
    setCustomError(null);
    const form = new FormData();
    form.append('bullet', customBullet.trim());
    if (targetRole) form.append('target_role', targetRole);

    try {
      const resp = await fetch('/api/v1/resumes/rewrite-bullet', {
        method: 'POST',
        body: form,
      });
      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Error ${resp.status}`);
      }
      const data = await resp.json();
      setCustomResults(data);
    } catch (err) {
      setCustomError(err.message || 'Failed to rewrite bullet point.');
    } finally {
      setLoadingCustom(false);
    }
  }

  return (
    <div className="inline-rewriter-container">
      {/* Existing Bullet Rewrites from Analysis */}
      {bulletRewrites.length > 0 && (
        <section className="result-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Sparkles size={18} style={{ color: '#a78bfa' }} />
            <h3 style={{ margin: 0 }}>Side-by-Side Bullet Comparisons</h3>
          </div>
          <p className="reference-muted" style={{ fontSize: 13, marginBottom: 18 }}>
            Real excerpts from your resume upgraded with stronger action verbs and impact structure without inventing metrics.
          </p>

          <div className="rewrites-grid">
            {bulletRewrites.map((item, idx) => (
              <div key={idx} className="diff-card">
                <div className="diff-columns">
                  <div className="diff-col before-col">
                    <span className="diff-badge before-badge">ORIGINAL RESUME</span>
                    <p className="diff-text before-text">{item.original}</p>
                  </div>
                  <div className="diff-col after-col">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="diff-badge after-badge">AI UPGRADED</span>
                      <button
                        className="action-pill-btn"
                        onClick={() => copyText(item.revised, 'existing-' + idx)}
                      >
                        {copiedKey === 'existing-' + idx ? <Check size={12} /> : <Copy size={12} />}
                        {copiedKey === 'existing-' + idx ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="diff-text after-text">{item.revised}</p>
                    <small className="diff-reason"><strong>Why it works:</strong> {item.reason}</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Interactive Bullet Rewriting Sandbox */}
      <section className="result-section rewriter-sandbox">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Wand2 size={18} style={{ color: '#2dd4bf' }} />
          <h3 style={{ margin: 0 }}>Bullet Point Rewriting Sandbox</h3>
        </div>
        <p className="reference-muted" style={{ fontSize: 13, marginBottom: 14 }}>
          Paste any weak sentence or bullet from your resume to generate 3 superior high-impact variations instantly.
        </p>

        <form onSubmit={handleRewriteCustom}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="text"
              className="reference-input"
              style={{ flex: 1, minWidth: 260 }}
              placeholder="e.g. Worked on the website backend to make database queries run faster."
              value={customBullet}
              maxLength={1000}
              onChange={e => setCustomBullet(e.target.value)}
              disabled={loadingCustom}
            />
            <button
              type="submit"
              className="reference-button"
              style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}
              disabled={loadingCustom || !customBullet.trim()}
            >
              {loadingCustom ? <LoaderCircle className="spin" size={16} /> : <Zap size={16} />}
              {loadingCustom ? 'Rewriting…' : 'Generate 3 Variations'}
            </button>
          </div>
        </form>

        {customError && (
          <div className="error" role="alert" style={{ marginTop: 12 }}>
            {customError}
          </div>
        )}

        {customResults && (
          <div className="custom-options-list" style={{ marginTop: 18 }}>
            <span className="reference-eyebrow" style={{ color: '#a78bfa' }}>CHOOSE YOUR PREFERRED STYLE</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 14, marginTop: 10 }}>
              {customResults.options.map((opt, i) => (
                <div key={i} className="custom-option-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className="style-tag">{opt.style}</span>
                    <button
                      className="action-pill-btn"
                      onClick={() => copyText(opt.text, 'custom-' + i)}
                    >
                      {copiedKey === 'custom-' + i ? <Check size={12} /> : <Copy size={12} />}
                      {copiedKey === 'custom-' + i ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, margin: '0 0 10px', color: '#f1f5f9' }}>{opt.text}</p>
                  <small style={{ fontSize: 11, color: 'var(--text-muted)' }}>{opt.explanation}</small>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}


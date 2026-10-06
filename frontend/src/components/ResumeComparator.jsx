import React, { useState, useRef } from 'react';
import { Trophy, UploadCloud, FileText, X, ArrowRight, LoaderCircle, CheckCircle2, ShieldCheck, Sparkles, Scale } from 'lucide-react';

export function ResumeComparator() {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [targetJob, setTargetJob] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const inputARef = useRef(null);
  const inputBRef = useRef(null);

  async function handleCompare(e) {
    e.preventDefault();
    if (!fileA || !fileB || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const form = new FormData();
    form.append('file_a', fileA);
    form.append('file_b', fileB);
    if (targetJob.trim()) form.append('target_job', targetJob.trim());
    if (jobDescription.trim()) form.append('job_description', jobDescription.trim());

    try {
      const resp = await fetch('/api/v1/resumes/compare', {
        method: 'POST',
        body: form,
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Comparison failed (${resp.status})`);
      }

      const data = await resp.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'An error occurred during resume comparison.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="resume-comparator-view">
      <section className="reference-panel" style={{ marginBottom: 24 }}>
        <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Scale size={14} /> RESUME A/B TESTING
        </div>
        <h2 style={{ margin: '6px 0 10px' }}>Upload Two Versions to Find the Stronger Resume</h2>
        <p className="reference-muted" style={{ fontSize: 14 }}>
          Compare formatting, ATS readability, and AI quality scores head-to-head before sending to employers.
        </p>

        <form onSubmit={handleCompare} style={{ marginTop: 20 }}>
          {/* Dual Upload Area */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {/* Version A */}
            <div className="comparator-upload-box">
              <label className="field-label"><strong>Version A</strong> <span>First Resume</span></label>
              <input
                ref={inputARef}
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={e => { setFileA(e.target.files?.[0] || null); e.target.value = ''; }}
              />
              <button
                type="button"
                className={'dropzone ' + (fileA ? 'has-file' : '')}
                onClick={() => inputARef.current?.click()}
                style={{ padding: 20 }}
              >
                <span className="upload-icon">
                  {fileA ? <FileText size={22} /> : <UploadCloud size={24} />}
                </span>
                <strong>{fileA ? fileA.name : 'Choose Resume Version A'}</strong>
                <small>{fileA ? `${(fileA.size / 1024).toFixed(0)} KB · PDF` : 'PDF only · up to 5 MB'}</small>
              </button>
              {fileA && (
                <button type="button" className="remove-file" onClick={() => setFileA(null)}>
                  <X size={12} /> Remove Version A
                </button>
              )}
            </div>

            {/* Version B */}
            <div className="comparator-upload-box">
              <label className="field-label"><strong>Version B</strong> <span>Second Resume</span></label>
              <input
                ref={inputBRef}
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                onChange={e => { setFileB(e.target.files?.[0] || null); e.target.value = ''; }}
              />
              <button
                type="button"
                className={'dropzone ' + (fileB ? 'has-file' : '')}
                onClick={() => inputBRef.current?.click()}
                style={{ padding: 20 }}
              >
                <span className="upload-icon">
                  {fileB ? <FileText size={22} /> : <UploadCloud size={24} />}
                </span>
                <strong>{fileB ? fileB.name : 'Choose Resume Version B'}</strong>
                <small>{fileB ? `${(fileB.size / 1024).toFixed(0)} KB · PDF` : 'PDF only · up to 5 MB'}</small>
              </button>
              {fileB && (
                <button type="button" className="remove-file" onClick={() => setFileB(null)}>
                  <X size={12} /> Remove Version B
                </button>
              )}
            </div>
          </div>

          {/* Optional Target Job */}
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div>
              <label className="field-label" style={{ fontSize: 12 }}>Target Job Title <span>optional</span></label>
              <input
                type="text"
                className="reference-input"
                placeholder="e.g. Senior Frontend Engineer"
                value={targetJob}
                onChange={e => setTargetJob(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="error" role="alert" style={{ marginTop: 16 }}>{error}</div>}

          <div style={{ marginTop: 24 }}>
            <button
              type="submit"
              className="primary-button"
              disabled={loading || !fileA || !fileB}
              style={{ maxWidth: 320 }}
            >
              {loading ? <LoaderCircle className="spin" size={18} /> : <Scale size={18} />}
              {loading ? 'Evaluating Both Resumes…' : 'Compare Resumes Head-to-Head'}
            </button>
          </div>
        </form>
      </section>

      {/* Comparison Results */}
      {result && (
        <section className="reference-panel comparator-results" style={{ marginTop: 24 }}>
          {/* Winner Banner */}
          <div className={'winner-banner ' + (result.winner === 'TIE' ? 'winner-tie' : 'winner-clear')}>
            <Trophy size={28} style={{ color: result.winner === 'TIE' ? '#a78bfa' : '#fbbf24' }} />
            <div>
              <span className="eyebrow" style={{ color: '#fed7aa', margin: 0 }}>OFFICIAL VERDICT</span>
              <h3 style={{ margin: '2px 0 4px', fontSize: 20 }}>
                {result.winner === 'TIE'
                  ? 'It is a Tie! Both versions perform equally well.'
                  : `Version ${result.winner} is the Winner!`}
              </h3>
              <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>{result.verdict_summary}</p>
            </div>
          </div>

          {/* Side-by-Side Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 24 }}>
            {/* Card A */}
            <div className={'comparison-version-card ' + (result.winner === 'A' ? 'is-winner' : '')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="style-tag">VERSION A</span>
                {result.winner === 'A' && <span className="winner-tag"><Trophy size={12} /> HIGHER SCORE</span>}
              </div>
              <h4 style={{ margin: '8px 0 16px', overflowWrap: 'anywhere' }}>{result.name_a}</h4>

              <div className="comparison-metric-row">
                <span>AI Quality Score</span>
                <strong style={{ color: '#a78bfa', fontSize: 18 }}>{result.quality_score_a} / 100</strong>
              </div>
              <div className="comparison-metric-row">
                <span>ATS Readability</span>
                <strong style={{ color: '#2dd4bf', fontSize: 18 }}>{result.ats_score_a}%</strong>
              </div>

              <div style={{ marginTop: 16 }}>
                <strong style={{ fontSize: 12, color: 'var(--text-muted)' }}>Top Evidenced Strengths:</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {result.strengths_a.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>

            {/* Card B */}
            <div className={'comparison-version-card ' + (result.winner === 'B' ? 'is-winner' : '')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="style-tag">VERSION B</span>
                {result.winner === 'B' && <span className="winner-tag"><Trophy size={12} /> HIGHER SCORE</span>}
              </div>
              <h4 style={{ margin: '8px 0 16px', overflowWrap: 'anywhere' }}>{result.name_b}</h4>

              <div className="comparison-metric-row">
                <span>AI Quality Score</span>
                <strong style={{ color: '#a78bfa', fontSize: 18 }}>{result.quality_score_b} / 100</strong>
              </div>
              <div className="comparison-metric-row">
                <span>ATS Readability</span>
                <strong style={{ color: '#2dd4bf', fontSize: 18 }}>{result.ats_score_b}%</strong>
              </div>

              <div style={{ marginTop: 16 }}>
                <strong style={{ fontSize: 12, color: 'var(--text-muted)' }}>Top Evidenced Strengths:</strong>
                <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {result.strengths_b.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}


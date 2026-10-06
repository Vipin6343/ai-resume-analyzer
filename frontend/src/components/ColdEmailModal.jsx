import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Mail, Send, LoaderCircle } from 'lucide-react';

export function ColdEmailModal({ file, jobDescription, targetJob, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (!isOpen || data || !file) return;

    let cancelled = false;
    async function fetchEmail() {
      setLoading(true);
      setError(null);
      const form = new FormData();
      form.append('file', file);
      if (jobDescription) form.append('job_description', jobDescription);
      if (targetJob) form.append('target_job', targetJob);

      try {
        const resp = await fetch('/api/v1/resumes/cold-email', {
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
        if (!cancelled) setError(err.message || 'Failed to generate cold email.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchEmail();
    return () => { cancelled = true; };
  }, [isOpen, file, jobDescription, targetJob]);

  if (!isOpen) return null;

  const currentSubject = data?.subject_lines?.[selectedSubjectIndex] || '';

  // Substitute placeholders if user typed company or recipient
  let formattedBody = data?.body || '';
  if (recipientName.trim()) {
    formattedBody = formattedBody.replace(/\[(?:Hiring Manager Name|Recruiter Name|Name)\]/gi, recipientName.trim());
  }
  if (companyName.trim()) {
    formattedBody = formattedBody.replace(/\[Company Name\]/gi, companyName.trim());
  }

  const fullEmailToCopy = `Subject: ${currentSubject}\n\n${formattedBody}`;

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(fullEmailToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card cold-email-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="icon-tile" style={{ background: '#f59e0b22', color: '#f59e0b' }}>
              <Send size={20} />
            </span>
            <div>
              <h3 style={{ margin: 0, fontSize: 18 }}>Recruiter Cold Outreach Generator</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                High-converting pitch based on your real resume experience
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
              <p>Analyzing key achievements and tailoring cold outreach email…</p>
            </div>
          )}

          {error && (
            <div className="error" role="alert" style={{ margin: '16px 0' }}>
              {error}
            </div>
          )}

          {data && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Personalization Inputs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="field-label" style={{ fontSize: 12 }}>Recipient Name <span>optional</span></label>
                  <input
                    type="text"
                    className="reference-input"
                    style={{ padding: '8px 12px', fontSize: 13 }}
                    placeholder="e.g. Sarah Jenkins"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="field-label" style={{ fontSize: 12 }}>Company Name <span>optional</span></label>
                  <input
                    type="text"
                    className="reference-input"
                    style={{ padding: '8px 12px', fontSize: 13 }}
                    placeholder="e.g. Acme Tech"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                  />
                </div>
              </div>

              {/* Subject Lines Options */}
              <div>
                <label className="field-label" style={{ fontSize: 12 }}>Choose Subject Line</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.subject_lines?.map((subj, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={'subject-choice-btn ' + (selectedSubjectIndex === idx ? 'selected' : '')}
                      onClick={() => setSelectedSubjectIndex(idx)}
                    >
                      <span className="choice-dot" />
                      <span>{subj}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Body */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label className="field-label" style={{ margin: 0, fontSize: 12 }}>Email Body</label>
                  <button className="action-pill-btn" onClick={copyEmail}>
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? 'Copied Entire Email' : 'Copy Email'}
                  </button>
                </div>
                <div className="email-preview-box" style={{ whiteSpace: 'pre-line', lineHeight: 1.7, fontSize: 13 }}>
                  {formattedBody}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Mail, Sparkles, Copy, Check, Download, X, LoaderCircle, AlertCircle } from 'lucide-react';

const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function CoverLetterModal({ file, jobDescription, targetJob, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [letter, setLetter] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  async function generateLetter() {
    if (!file) {
      setError('Please upload your resume first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body = new FormData();
      body.append('file', file);
      if (jobDescription?.trim()) body.append('job_description', jobDescription.trim());
      if (targetJob?.trim()) body.append('target_job', targetJob.trim());

      const res = await fetch(`${API}/api/v1/resumes/cover-letter`, {
        method: 'POST',
        body,
      });

      let data;
      try { data = await res.json(); } catch {
        throw new Error('Server returned unreadable response.');
      }

      if (!res.ok) throw new Error(data.error?.message || 'Could not generate cover letter.');
      setLetter(data.cover_letter);
      setWordCount(data.word_count || data.cover_letter.split(/\s+/).length);
    } catch (err) {
      setError(err.message || 'Failed to generate cover letter.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!letter) return;
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!letter) return;
    const blob = new Blob([letter], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cover_Letter_${targetJob ? targetJob.replace(/\s+/g, '_') : 'Generated'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <span className="modal-icon-badge"><Mail size={20} /></span>
            <div>
              <h3>AI Cover Letter Generator</h3>
              <p>Personalized letter tailored to your resume {targetJob ? `and ${targetJob}` : ''}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {!letter && !loading && (
            <div className="modal-empty-state">
              <div className="sparkle-icon-circle"><Sparkles size={28} /></div>
              <h4>Generate a tailored cover letter</h4>
              <p>
                Our AI combines your resume highlights with the target role requirements to write
                a persuasive, authentic cover letter.
              </p>
              <button className="primary-button modal-action-btn" onClick={generateLetter}>
                <Sparkles size={16} /> Write My Cover Letter
              </button>
            </div>
          )}

          {loading && (
            <div className="modal-loading-state">
              <LoaderCircle className="spin" size={36} />
              <h4>Crafting your cover letter...</h4>
              <p>Analyzing resume evidence and matching job tone.</p>
            </div>
          )}

          {letter && !loading && (
            <div className="modal-result-view">
              <div className="result-meta-bar">
                <span>{wordCount} words</span>
                <div className="modal-btn-group">
                  <button className="secondary-btn" onClick={handleCopy}>
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>
                  <button className="secondary-btn" onClick={handleDownload}>
                    <Download size={14} /> Download (.txt)
                  </button>
                </div>
              </div>
              <textarea
                className="letter-textarea"
                value={letter}
                onChange={e => setLetter(e.target.value)}
                rows={14}
              />
              <div className="modal-footer-row">
                <button className="text-btn" onClick={generateLetter}>
                  Regenerate letter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

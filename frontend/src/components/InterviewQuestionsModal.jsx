import React, { useState } from 'react';
import { HelpCircle, Sparkles, X, LoaderCircle, AlertCircle, Copy, Check, Lightbulb } from 'lucide-react';

const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function InterviewQuestionsModal({ file, jobDescription, targetJob, isOpen, onClose }) {
  const [loading, setLoading] = useState(false);
  const [questionsData, setQuestionsData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  async function fetchQuestions() {
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

      const res = await fetch(`${API}/api/v1/resumes/interview-questions`, {
        method: 'POST',
        body,
      });

      let data;
      try { data = await res.json(); } catch {
        throw new Error('Server returned unreadable response.');
      }

      if (!res.ok) throw new Error(data.error?.message || 'Could not predict interview questions.');
      setQuestionsData(data);
    } catch (err) {
      setError(err.message || 'Failed to predict questions.');
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!questionsData?.questions) return;
    const text = questionsData.questions.map((q, i) => `${i + 1}. [${q.category}] ${q.question}\n   Why: ${q.why}`).join('\n\n') +
      (questionsData.tip ? `\n\nTip: ${questionsData.tip}` : '');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content large-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <span className="modal-icon-badge warning-badge"><HelpCircle size={20} /></span>
            <div>
              <h3>Interview Question Predictor</h3>
              <p>Likely technical and behavioral questions based on your background {targetJob ? `for ${targetJob}` : ''}</p>
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

          {!questionsData && !loading && (
            <div className="modal-empty-state">
              <div className="sparkle-icon-circle"><Sparkles size={28} /></div>
              <h4>Predict Your Interview Questions</h4>
              <p>
                Get ahead of the recruiter. We analyze potential gaps and strong points in your resume
                to simulate actual hiring manager interview questions.
              </p>
              <button className="primary-button modal-action-btn" onClick={fetchQuestions}>
                <Sparkles size={16} /> Predict Questions
              </button>
            </div>
          )}

          {loading && (
            <div className="modal-loading-state">
              <LoaderCircle className="spin" size={36} />
              <h4>Predicting questions...</h4>
              <p>Comparing your experience with expected hiring panel prompts.</p>
            </div>
          )}

          {questionsData && !loading && (
            <div className="modal-result-view">
              {questionsData.tip && (
                <div className="interview-tip-banner">
                  <Lightbulb size={18} className="tip-icon" />
                  <div>
                    <strong>Preparation Tip</strong>
                    <p>{questionsData.tip}</p>
                  </div>
                </div>
              )}

              <div className="result-meta-bar">
                <span>{questionsData.questions.length} Questions Predicted</span>
                <button className="secondary-btn" onClick={handleCopy}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied all!' : 'Copy Questions'}
                </button>
              </div>

              <div className="questions-scroll-list">
                {questionsData.questions.map((item, idx) => (
                  <div key={idx} className="question-item-card">
                    <div className="question-card-top">
                      <span className={`cat-pill cat-${item.category.toLowerCase().replace(/[^a-z]/g, '')}`}>
                        {item.category}
                      </span>
                      <span className="q-number">Q{idx + 1}</span>
                    </div>
                    <h4>{item.question}</h4>
                    <p className="q-why"><strong>Why you'll get asked this:</strong> {item.why}</p>
                  </div>
                ))}
              </div>

              <div className="modal-footer-row">
                <button className="text-btn" onClick={fetchQuestions}>
                  Regenerate Questions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

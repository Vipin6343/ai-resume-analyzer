import React, { useRef, useState } from 'react';
import { FileText, UploadCloud, X, Sparkles, ShieldCheck, LoaderCircle, Briefcase } from 'lucide-react';
import { HistoryPanel } from './HistoryPanel';

const MAX_JOB_CHARS = 12000;

export function UploadForm({ file, busy, error, onSelectFile, onRemoveFile, onSubmit, onCheckATS, onCancel, history, onRestore, onDeleteHistory, jobDescription, setJobDescription, targetJob, setTargetJob }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({ jobDescription, targetJob });
  }

  const jobCharsLeft = MAX_JOB_CHARS - jobDescription.length;

  return (
    <aside className="input-panel">
      <div className="panel-heading">
        <span className="step-number">01</span>
        <div>
          <h2>Set up your analysis</h2>
          <p>Resume only, or compare against a job.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <fieldset disabled={busy}>

          {/* ── Resume upload ── */}
          <label className="field-label">Your resume <span>PDF only</span></label>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="sr-only"
            aria-label="Upload resume PDF"
            onChange={e => { onSelectFile(e.target.files?.[0]); e.target.value = ''; }}
          />
          <button
            type="button"
            className={'dropzone ' + (drag ? 'dragging' : '') + (file ? ' has-file' : '')}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); if (!busy) setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); onSelectFile(e.dataTransfer.files?.[0]); }}
          >
            <span className="upload-icon">
              {file ? <FileText size={25} /> : <UploadCloud size={26} />}
            </span>
            <strong>{file ? file.name : 'Drop your resume here'}</strong>
            <span>
              {file
                ? `${(file.size / 1024).toFixed(0)} KB · Click to replace`
                : <><b>Browse files</b> or drag &amp; drop</>}
            </span>
            <small>Up to 5 MB · 10 pages · No scanned PDFs</small>
          </button>
          {file && (
            <button type="button" className="remove-file" onClick={onRemoveFile}>
              <X size={13} /> Remove file
            </button>
          )}

          {/* ── Target job title ── */}
          <label className="field-label" style={{ marginTop: 22 }}>
            Target job title <span>optional</span>
          </label>
          <div className="input-with-icon">
            <Briefcase size={15} style={{ color: '#94a0b2', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="e.g. AI Backend Developer"
              value={targetJob}
              maxLength={200}
              onChange={e => setTargetJob(e.target.value)}
            />
          </div>

          {/* ── Job description ── */}
          <label className="field-label" style={{ marginTop: 18 }}>
            Job description <span>optional — unlocks match score</span>
          </label>
          <textarea
            placeholder="Paste the job requirements here to get a match score and see which requirements your resume meets…"
            value={jobDescription}
            maxLength={MAX_JOB_CHARS}
            onChange={e => setJobDescription(e.target.value)}
          />
          <div className="textarea-footer">
            <span>Paste actual requirements only — benefits and company info are ignored.</span>
            <span style={{ color: jobCharsLeft < 500 ? '#b35c20' : undefined }}>
              {jobCharsLeft.toLocaleString()} left
            </span>
          </div>

        </fieldset>

        {error && <div className="error" role="alert">{error}</div>}
        <button className="ats-check-button" disabled={busy || !file} type="button" onClick={onCheckATS}>
          <ShieldCheck size={18}/> Check ATS compatibility
        </button>
        <p className="review-note">PDF checks only. No AI key or job description needed.</p>

        <button className="primary-button" disabled={busy || !file} type="submit">
          {busy ? <LoaderCircle className="spin" size={19} /> : <Sparkles size={19} />}
          {busy ? 'Analyzing your resume…' : 'Analyze my resume'}
        </button>
        {busy && (
          <button type="button" className="cancel-button" onClick={onCancel}>
            Cancel analysis
          </button>
        )}
        <p className="privacy">
          <ShieldCheck size={14} /> Recent analysis reports are saved in this browser. Delete them from History.
        </p>
      </form>

      {/* ── History ── */}
      <HistoryPanel
        history={history}
        onRestore={onRestore}
        onDelete={onDeleteHistory}
      />
    </aside>
  );
}

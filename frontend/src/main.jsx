import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, BrainCircuit, BriefcaseBusiness, Upload, ArrowRight, FileText, ShieldCheck, CircleHelp } from 'lucide-react';
import { useAnalyze } from './hooks/useAnalyze';
import { useHistory } from './hooks/useHistory';
import { UploadForm } from './components/UploadForm';
import { ResultsPanel } from './components/ResultsPanel';
import { ResumeReview } from './components/ResumeReview';
import { RequirementsView } from './components/RequirementsView';
import { ScoreCard } from './components/ScoreCard';
import { ATSReport } from './components/ATSReport';
import './style.css';
import './workspace.css';

const pages = [
  { id: 'upload', label: 'Upload Resume', icon: Upload },
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'jobs', label: 'Job Matches', icon: BriefcaseBusiness },
  { id: 'improvement', label: 'Resume Improvement', icon: BrainCircuit },
];
function currentPage() {
  const id = window.location.hash.replace(/^#\/?/, '');
  return pages.some(page => page.id === id) ? id : 'upload';
}
function EmptyReport({ title, children }) {
  return <section className="reference-panel reference-empty"><FileText size={32}/><h2>{title}</h2><p>{children}</p><a className="reference-button" href="#/upload">Upload a resume <ArrowRight size={16}/></a></section>;
}

function App() {
  const [page, setPage] = useState(currentPage);
  const [guide, setGuide] = useState(false);
  const [draftJob, setDraftJob] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [restoredResult, setRestoredResult] = useState(null);
  const api = useAnalyze();
  const { file, result, atsResult, error, busy } = api;
  const { history, saveToHistory, deleteEntry } = useHistory();
  const previousResult = useRef(null);
  useEffect(() => {
    const onHashChange = () => setPage(currentPage());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  useEffect(() => {
    if (result && result !== previousResult.current) {
      previousResult.current = result;
      saveToHistory(file?.name ?? 'resume.pdf', result);
    }
  }, [result]);
  const report = busy ? null : restoredResult ?? (atsResult ? null : result);
  const compatibility = busy ? null : restoredResult?.ats_score ?? atsResult ?? result?.ats_score;
  function restore(value) { setRestoredResult(value); window.location.hash = '/dashboard'; }
  function analyze(values) { setRestoredResult(null); api.analyze(values); }
  const stats = [
    ['Saved reports', history.length, 'Up to 5 reports in this browser'],
    ['Detected skills', report?.detected_skills?.length ?? '—', 'From the selected analysis'],
    ['Priority improvements', report?.resume_review?.issues?.filter(i => i.priority === 'high').length ?? '—', 'Issues to work on first'],
    ['Matched requirements', report ? report.matched_requirements.length : '—', 'Evidenced in your resume'],
  ];
  return <div className="app reference-app" data-theme="dark">
    <div className="reference-container">
      <header className="reference-hero">
        <div className="reference-hero-copy">
          <p className="reference-eyebrow">AI RESUME ANALYZER AND JOB MATCHER</p>
          <h1>Turn your experience into a stronger, role-ready resume.</h1>
          <p>Upload a PDF, get AI feedback, check ATS compatibility, and turn weak sections into clearer, evidence-based statements.</p>
        </div>
        <div className="reference-hero-actions">
          <button className="reference-button secondary" onClick={() => setGuide(!guide)} aria-expanded={guide}><CircleHelp size={16}/> How it works</button>
          <div className="reference-latest"><span>AI QUALITY SCORE</span><strong>{report?.ai_quality_score?.value ?? '—'}<small> / 100</small></strong></div>
        </div>
      </header>
      <nav className="reference-nav" aria-label="Workspace pages">
        {pages.map(({ id, label, icon: Icon }) => <a key={id} href={'#/' + id} aria-current={page === id ? 'page' : undefined}><Icon size={19}/>{label}</a>)}
      </nav>
      {guide && <section className="reference-panel guide-panel"><h2>Start with just your resume</h2><p>Upload a text-based PDF for AI feedback, or run the PDF compatibility check without an AI call. Add an actual job description for a requirement-by-requirement comparison. Review suggested rewrites for accuracy before using them.</p><p>Analysis sends resume text to the configured backend AI provider. The last five AI reports are stored in this browser; delete them in Recent reports. PDF uploads are not permanently stored. Scores are application estimates, not employer ATS scores or hiring predictions.</p></section>}
      <main className="reference-main">
        {error && page !== 'upload' && page !== 'jobs' && <p className="error" role="alert">{error} <a href="#/upload">Return to upload</a></p>}
        <div hidden={page !== 'upload'}>
          <div className="reference-columns">
            <UploadForm file={file} busy={busy} error={error}
              jobDescription={draftJob} setJobDescription={setDraftJob} targetJob={draftTitle} setTargetJob={setDraftTitle}
              onSelectFile={next => { setRestoredResult(null); api.selectFile(next); }}
              onRemoveFile={() => { setRestoredResult(null); api.removeFile(); }}
              onSubmit={analyze} onCheckATS={() => { setRestoredResult(null); api.checkATS(); }} onCancel={api.cancel}
              history={history} onRestore={restore} onDeleteHistory={deleteEntry}/>
            <div className="reference-stack">
              <section className="reference-panel">
                <div className="reference-panel-title"><h2>Resume snapshot</h2><ShieldCheck size={21}/></div>
                <p className="reference-muted">Your profile and skills will appear here after analysis.</p>
                {busy ? <p role="status" className="reference-status">Processing your resume. You can cancel from the upload panel.</p> : report ? <>
                  <p className="reference-summary">{report.resume_summary}</p>
                  <div className="skills">{report.detected_skills.map((skill, i) => <span key={i}>{skill}</span>)}</div>
                  <div className="reference-snapshot-score"><span>AI resume quality</span><strong>{report.ai_quality_score?.value ?? '—'}<small> / 100</small></strong></div>
                  <a className="reference-button" href="#/dashboard">View full analysis <ArrowRight size={16}/></a>
                </> : <div className="reference-placeholder"><FileText size={38}/><h3>Your next chapter starts here</h3><p>One resume. A clear view of your strengths and what to improve.</p><span className="reference-chip">PDF · up to 5 MB · 10 pages</span></div>}
              </section>
              {compatibility && <><ScoreCard title="ATS compatibility" score={compatibility} icon={ShieldCheck} teal/><ATSReport score={compatibility}/></>}
              {!compatibility && <section className="reference-panel"><h2>Your review workflow</h2><ol className="reference-steps"><li><strong>Check PDF compatibility</strong><p>Inspect text extraction, contact fields, sections and page coverage.</p></li><li><strong>Analyze with AI</strong><p>Get strengths, specific issues, section feedback and safer rewrite drafts.</p></li><li><strong>Compare a job, optionally</strong><p>See which explicit requirements have supporting resume evidence.</p></li></ol></section>}
            </div>
          </div>
        </div>
        {page === 'dashboard' && <>
          <div className="reference-stats">{stats.map(([label, value, note]) => <section className="reference-panel" key={label}><p>{label}</p><strong>{value}</strong><small>{note}</small></section>)}</div>
          <div className="reference-dashboard">
            <ResultsPanel result={report} atsResult={!report ? compatibility : null} busy={busy} file={restoredResult ? null : file} jobDescription={api.jobDescription} targetJob={api.targetJob}/>
            <aside className="reference-panel reference-activity"><h2>Recent reports</h2><p className="reference-muted">Stored on this browser only.</p>
              {history.length ? history.map(entry => <article key={entry.id}><button className="reference-history-open" onClick={() => restore(entry.result)}><FileText size={16}/><span>{entry.filename}<small>{new Date(entry.date).toLocaleString()}</small></span><ArrowRight size={14}/></button><button className="reference-delete" onClick={() => deleteEntry(entry.id)} aria-label={'Delete report for ' + entry.filename}>Delete report</button></article>) : <p className="reference-muted">Your completed AI analyses will appear here.</p>}
            </aside>
          </div>
        </>}
        {page === 'jobs' && <div className="reference-columns jobs-columns">
          <section className="reference-panel"><h2>Compare with a job</h2><p className="reference-muted">Paste the job posting to compare explicit requirements with your resume evidence.</p>
            <form onSubmit={e => { e.preventDefault(); analyze({ jobDescription: draftJob, targetJob: draftTitle }); }}>
              <p className="reference-file">{file ? file.name : 'Upload your resume to start a comparison.'}</p>
              {!file && <a className="reference-text-link" href="#/upload">Go to upload <ArrowRight size={14}/></a>}
              <label className="field-label" htmlFor="match-title">Target job title <span>optional</span></label><input id="match-title" className="reference-input" value={draftTitle} maxLength={200} disabled={busy} onChange={e => setDraftTitle(e.target.value)} placeholder="e.g. AI Backend Developer"/>
              <label className="field-label" htmlFor="match-description">Job description <span>required for matching</span></label><textarea id="match-description" value={draftJob} onChange={e => setDraftJob(e.target.value)} maxLength={12000} required disabled={busy} placeholder="Required skills, responsibilities and qualifications…"/>
              <p className="review-note">{draftJob.length.toLocaleString()} / 12,000 characters</p>
              {error && <p role="alert" className="error">{error}</p>}
              <button className="primary-button" disabled={busy || !file || !draftJob.trim()}>{busy ? 'Comparing…' : 'Analyze job match'}</button>
              {busy && <button type="button" className="cancel-button" onClick={api.cancel}>Cancel analysis</button>}
            </form>
          </section>
          <div className="reference-stack"><ScoreCard title="Job match" score={report?.match_score} icon={BriefcaseBusiness}/>
            {report && <RequirementsView key={report.resume_summary} result={report}/>}
            <section className="reference-panel"><h2>How matching works</h2><p>Required requirements carry 2 points; preferred requirements carry 1. Only evidenced matches count. Duplicate requirements are consolidated.</p><p className="review-note">A job title alone does not supply usable requirements. The AI interprets requirements and evidence; Python calculates the weighted score. This is an application-defined match score.</p></section>
          </div>
        </div>}
        {page === 'improvement' && (report ? <div className="reference-improvements"><section className="reference-panel"><p className="reference-eyebrow">YOUR NEXT DRAFT</p><h2>Make every section count.</h2><p className="reference-muted">Prioritized feedback and rewrite suggestions from your selected analysis. Check every draft against your real experience.</p></section><ResumeReview review={report.resume_review}/>{report.improvement_suggestions.length > 0 && <section className="result-section"><h3>Additional suggestions</h3><ol>{report.improvement_suggestions.map((suggestion, i) => <li key={i}>{suggestion}</li>)}</ol></section>}</div> : <EmptyReport title={busy ? 'Your review is in progress' : 'Your next draft starts with a review'}>Analyze a resume or open a saved report to see section feedback, bullet rewrites and an improved summary.</EmptyReport>)}
      </main>
      <footer className="reference-footer"><span>ResumeLens / Your career workspace</span><span>Application estimates · No hiring predictions</span></footer>
    </div>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);

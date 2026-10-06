import React, { useState } from 'react';
import {
  ScanText, Target, Sparkles, Check, X, CircleHelp,
  LoaderCircle, Mail, HelpCircle, Download, FileSpreadsheet,
  Share2, Send, Wand2
} from 'lucide-react';
import { ScoreCard } from './ScoreCard';
import { ResumeReview } from './ResumeReview';
import { ATSReport } from './ATSReport';
import { RequirementsView } from './RequirementsView';
import { CopyButton } from './CopyButton';
import { SkillGapChart } from './SkillGapChart';
import { SkillQuestions } from './SkillQuestions';
import { CoverLetterModal } from './CoverLetterModal';
import { InterviewQuestionsModal } from './InterviewQuestionsModal';
import { LinkedInModal } from './LinkedInModal';
import { ColdEmailModal } from './ColdEmailModal';
import { InlineRewriter } from './InlineRewriter';
import { printReport } from '../utils/exportReport';

export function ResultsPanel({ result, atsResult, busy, file, jobDescription, targetJob }) {
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [linkedinOpen, setLinkedinOpen] = useState(false);
  const [coldEmailOpen, setColdEmailOpen] = useState(false);

  const hasMatchScore = result?.match_score?.value != null;
  const hasRequirements =
    result &&
    (result.matched_requirements?.length ?? 0) +
    (result.missing_requirements?.length ?? 0) +
    (result.insufficient_evidence_requirements?.length ?? 0) > 0;

  const allSuggestions = result
    ? [...new Set([...result.improvement_suggestions, ...(result.ats_score?.improvement_suggestions ?? [])])]
    : [];

  const heading = result
    ? result.target_job
      ? `Match for "${result.target_job}"`
      : 'Your resume, in focus'
    : 'Make your experience count.';

  return (
    <section
      className="results-panel"
      tabIndex={-1}
      aria-label="Analysis results"
      aria-busy={busy}
    >
      {/* ── Header ── */}
      <div className="results-heading">
        <div>
          <div className="eyebrow">YOUR ANALYSIS</div>
          <h2>{heading}</h2>
        </div>
        {result && (
          <div className="results-heading-actions">
            <CopyButton result={result} />
            <button
              className="action-pill-btn pdf-btn"
              onClick={printReport}
              title="Print or Save PDF report"
            >
              <Download size={14} /> PDF Report
            </button>
            <span className="complete"><Check size={14} /> Complete</span>
          </div>
        )}
      </div>

      {/* ── Quick AI tools banner when result is ready ── */}
      {result && (
        <div className="ai-tools-bar">
          <div className="tools-lead">
            <Sparkles size={16} className="sparkle-active" />
            <span>AI Career Boosters:</span>
          </div>
          <div className="tools-buttons">
            <button
              className="tool-action-btn letter-tool"
              onClick={() => setCoverLetterOpen(true)}
            >
              <Mail size={15} /> Write Cover Letter
            </button>
            <button
              className="tool-action-btn question-tool"
              onClick={() => setQuestionsOpen(true)}
            >
              <HelpCircle size={15} /> Predict Interview Qs
            </button>
            <button
              className="tool-action-btn linkedin-tool"
              onClick={() => setLinkedinOpen(true)}
            >
              <Share2 size={15} /> LinkedIn Profile
            </button>
            <button
              className="tool-action-btn email-tool"
              onClick={() => setColdEmailOpen(true)}
            >
              <Send size={15} /> Cold Email Recruiter
            </button>
          </div>
        </div>
      )}

      {/* ── Score cards ── */}
      <div className="scores">
        <ScoreCard title="AI resume quality" score={result?.ai_quality_score} icon={Sparkles} />
        <ScoreCard title="ATS compatibility" score={atsResult || result?.ats_score} icon={ScanText} teal />
        {hasMatchScore && (
          <ScoreCard title="Job match" score={result?.match_score} icon={Target} />
        )}
      </div>

      {/* ── Empty / loading state ── */}
      {atsResult && <ATSReport score={atsResult}/>}
      {!result ? (!atsResult &&
        <div className="empty-state" role="status">
          <span className={'empty-symbol ' + (busy ? 'working' : '')}>
            {busy ? <LoaderCircle className="spin" size={32} /> : <ScanText size={35} />}
          </span>
          <h3>{busy ? 'Looking for the evidence…' : 'Your next step starts here.'}</h3>
          {busy ? (
            <>
              <p>Reviewing your profile, skills, and resume clarity. This can take a minute or two.</p>
              <div className="loading-steps">
                <span>📄 Extracting text</span>
                <span>🤖 AI analysis</span>
                <span>📊 Scoring</span>
              </div>
            </>
          ) : (
            <>
              <p>
                Upload your resume for a standalone review, or add a job description to also
                get a match score, visual skill gap, and predicted interview questions.
              </p>
              <div className="empty-features">
                <span><Check size={15} /> Detected skills</span>
                <span><Check size={15} /> Resume evidence</span>
                <span><Check size={15} /> Job match score</span>
                <span><Check size={15} /> Actionable feedback</span>
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {/* ── Skill Gap Chart / Visualizer ── */}
          <SkillGapChart result={result} />

          {/* ── Profile ── */}
          <section className="result-section">
            <h3>Your profile at a glance</h3>
            <p>{result.resume_summary}</p>
            <div className="skills">
              {result.detected_skills.map((s, i) => <span key={i}>{s}</span>)}
            </div>

            {/* ── Skill-linked Interview Questions ── */}
            <SkillQuestions skills={result.detected_skills} targetJob={result.target_job} />
          </section>

          {/* ── ATS checks ── */}
          <ATSReport score={result.ats_score}/>

          {/* ── Requirements (only when job description was sent) ── */}
          <ResumeReview review={result.resume_review} />

          {/* ── Inline Resume Rewriter & Sandbox Studio ── */}
          <InlineRewriter
            bulletRewrites={result.resume_review?.bullet_rewrites || []}
            targetRole={result.target_job}
          />

          {hasRequirements && <RequirementsView result={result} />}

          {/* ── Suggestions ── */}
          {allSuggestions.length > 0 && (
            <section className="result-section suggestions">
              <h3><Sparkles size={18} /> Your next steps</h3>
              <ol>
                {allSuggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ol>
            </section>
          )}
        </>
      )}

      <p className="disclaimer">
        <CircleHelp size={15} /> Scores are application estimates, not employer ATS scores or hiring predictions.
      </p>

      {/* ── Modals ── */}
      <CoverLetterModal
        file={file}
        jobDescription={jobDescription}
        targetJob={targetJob}
        isOpen={coverLetterOpen}
        onClose={() => setCoverLetterOpen(false)}
      />

      <InterviewQuestionsModal
        file={file}
        jobDescription={jobDescription}
        targetJob={targetJob}
        isOpen={questionsOpen}
        onClose={() => setQuestionsOpen(false)}
      />

      <LinkedInModal
        file={file}
        targetJob={targetJob}
        isOpen={linkedinOpen}
        onClose={() => setLinkedinOpen(false)}
      />

      <ColdEmailModal
        file={file}
        jobDescription={jobDescription}
        targetJob={targetJob}
        isOpen={coldEmailOpen}
        onClose={() => setColdEmailOpen(false)}
      />
    </section>
  );
}

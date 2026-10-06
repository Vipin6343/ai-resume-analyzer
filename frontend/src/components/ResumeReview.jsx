import React, { useState } from 'react';
import { Sparkles, Check, Copy } from 'lucide-react';

export function ResumeReview({ review }) {
  const [copyState, setCopyState] = useState('');
  if (!review) return <section className="result-section"><p>Run a new analysis to get the detailed AI review for this resume.</p></section>;
  async function copy(text, key) {
    try { await navigator.clipboard.writeText(text); setCopyState(key); }
    catch { setCopyState('failed'); }
  }
  return <>
    <section className="result-section"><h3><Sparkles size={18}/> AI quality breakdown</h3>
      <p className="review-note">0 = no assessable evidence · 1 = major weaknesses · 2 = mixed · 3 = mostly strong · 4 = consistently strong. Each criterion carries 20 points.</p>
      {Object.entries(review.ratings).map(([key, item]) => <div className="review-rating" key={key}>
        <div className="review-row"><strong>{key.replaceAll('_', ' ')}</strong><b>{item.rating * 5}/20</b></div>
        <meter min="0" max="4" value={item.rating} aria-label={key.replaceAll('_', ' ')}/>
        <p>{item.explanation}</p>{item.evidence && <blockquote>{item.evidence}</blockquote>}
      </div>)}
    </section>
    <section className="result-section"><h3>What is working well</h3>
      {review.strengths.length ? review.strengths.map((item, i) => <article className="review-finding" key={i}><h4><Check size={15}/> {item.heading}</h4><p>{item.explanation}</p>{item.evidence && <blockquote>{item.evidence}</blockquote>}<p>{item.action}</p></article>) : <p>No specific strengths were identified in the extracted text.</p>}
    </section>
    <section className="result-section"><h3>Fix these first</h3>
      {review.issues.length ? [...review.issues].sort((a,b) => ({high:0,medium:1,low:2}[a.priority] - {high:0,medium:1,low:2}[b.priority])).map((item, i) => <article className="review-finding" key={i}><div className="review-row"><h4>{item.heading}</h4><span className={'priority ' + item.priority}>{item.priority}</span></div><p>{item.explanation}</p>{item.evidence && <blockquote>{item.evidence}</blockquote>}<p><strong>Next step:</strong> {item.action}</p></article>) : <p>No specific issues returned. Review the suggestions below.</p>}
    </section>
    <section className="result-section"><h3>Section-by-section review</h3>
      {review.sections.map(item => <article className="review-finding" key={item.section}><div className="review-row"><h4 className="capitalize">{item.section}</h4><span className="tag">{item.status.replaceAll('_', ' ')}</span></div><p>{item.feedback}</p>{item.evidence && <blockquote>{item.evidence}</blockquote>}<p>{item.suggestion}</p></article>)}
    </section>
    <section className="result-section"><h3>Stronger bullet drafts</h3><p className="review-note">Review each draft for accuracy before using it. No invented metrics or experience should be added.</p>
      {review.bullet_rewrites.length ? review.bullet_rewrites.map((item, i) => <article className="review-finding" key={i}><span className="eyebrow">ORIGINAL</span><blockquote>{item.original}</blockquote><span className="eyebrow">SUGGESTED DRAFT</span><p className="draft-text">{item.revised}</p><p>{item.reason}</p><button className="action-pill-btn" onClick={() => copy(item.revised, 'bullet' + i)}><Copy size={14}/>{copyState === 'bullet' + i ? 'Copied' : 'Copy draft'}</button></article>) : <p>No safe bullet rewrites suggested for this resume.</p>}
    </section>
    {review.improved_summary && <section className="result-section suggestions"><h3>Suggested professional summary</h3><p>{review.improved_summary}</p><p className="review-note">AI draft based on your resume. Confirm every statement before using it.</p><button className="action-pill-btn" onClick={() => copy(review.improved_summary, 'summary')}><Copy size={14}/>{copyState === 'summary' ? 'Copied' : 'Copy summary'}</button></section>}
    <p role="status" className="review-note">{copyState === 'failed' ? 'Could not copy. Select the draft text and copy it manually.' : ''}</p>
  </>;
}

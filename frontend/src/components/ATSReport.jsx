import React from 'react';
import { ScanText, Check, X, CircleHelp } from 'lucide-react';

export function ATSReport({ score }) {
  if (!score) return null;
  return <section className="result-section">
    <h3><ScanText size={18}/> ATS compatibility report</h3>
    {score.rubric_version && <p className="review-note">Rubric {score.rubric_version} · {score.assessed_points} / {score.possible_points} assessed points. Unavailable checks are excluded.</p>}
    <p className="review-note">Measured checks from your PDF. Review the extracted fields and reading order below. This is our compatibility rubric, not a company's internal ATS score.</p>
    <div className="checks">{score.breakdown.map(check => <div className="check-row" key={check.check}>
      <span className={check.passed ? 'passed' : 'unpassed'}>{check.status === 'not_checked' ? <CircleHelp size={16}/> : check.passed ? <Check size={16}/> : <X size={16}/>}</span>
      <div><strong>{check.check.replaceAll('_', ' ')}</strong><p>{check.explanation}</p>
        {check.evidence?.length > 0 && <details><summary>Detected evidence</summary><ul>{check.evidence.map((item,i) => <li key={i}>{item}</li>)}</ul></details>}
        {check.suggestion && <p><strong>Suggested fix:</strong> {check.suggestion}</p>}
      </div><b>{check.max_points ? check.points + '/' + check.max_points : check.status === 'not_checked' ? 'Not checked' : 'Info'}</b>
    </div>)}</div>
    {score.parsed_fields && <details><summary>What the parser detected</summary>{Object.entries(score.parsed_fields).map(([field,values]) => <div className="review-finding" key={field}><strong className="capitalize">{field.replaceAll('_',' ')}</strong><p>{values.length ? values.join(' · ') : 'Not detected by these rules'}</p></div>)}</details>}
    {score.text_preview && <details><summary>Inspect extracted text and reading order</summary><p className="review-note">Check that names, dates, sentences and section order survived PDF extraction. {score.preview_truncated ? 'Preview limited to 5,000 characters.' : ''}</p><pre className="text-preview">{score.text_preview}</pre></details>}
    {score.limitations?.length > 0 && <details><summary>What this check cannot establish</summary><ul>{score.limitations.map((item,i) => <li key={i}>{item}</li>)}</ul></details>}
  </section>;
}

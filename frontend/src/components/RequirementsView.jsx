import React, { useState } from 'react';
import { Check, X, AlertTriangle } from 'lucide-react';

function RequirementCard({ req }) {
  return (
    <div className="requirement">
      <div className="requirement-heading">
        <h3>{req.requirement}</h3>
        <span className="tag">{req.kind}</span>
      </div>
      <p>{req.explanation}</p>
      {req.evidence && (
        <blockquote>
          <span>From your resume</span>
          {req.evidence}
        </blockquote>
      )}
      {req.job_evidence && (
        <blockquote className="job-quote">
          <span>From job description</span>
          {req.job_evidence}
        </blockquote>
      )}
    </div>
  );
}

export function RequirementsView({ result }) {
  const [tab, setTab] = useState('matched');

  const matched = result.matched_requirements ?? [];
  const missing = result.missing_requirements ?? [];
  const insufficient = result.insufficient_evidence_requirements ?? [];

  const tabs = [
    { id: 'matched',      label: 'Matched',              count: matched.length,      Icon: Check },
    { id: 'missing',      label: 'Missing',              count: missing.length,      Icon: X },
    { id: 'insufficient', label: 'Insufficient Evidence', count: insufficient.length, Icon: AlertTriangle },
  ];

  const items =
    tab === 'matched'      ? matched :
    tab === 'missing'      ? missing :
                             insufficient;

  return (
    <section className="result-section">
      <h3>Job requirements</h3>

      <div className="tabs" role="tablist">
        {tabs.map(({ id, label, count, Icon }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            <Icon size={13} />
            {label}
            <span>{count}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {items.length === 0 ? (
          <p className="empty-inline">No requirements in this category.</p>
        ) : (
          items.map((req, i) => <RequirementCard key={i} req={req} />)
        )}
      </div>
    </section>
  );
}

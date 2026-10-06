import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

/** Return a hex color based on score value */
function scoreColor(value) {
  if (value == null) return undefined;
  if (value < 40) return '#e03535';
  if (value <= 70) return '#d97706';
  return '#16a34a';
}

/** Calculate letter grade, status verdict, and percentile benchmark */
function getGradeInfo(val) {
  if (val == null) return null;
  if (val >= 90) return { grade: 'A+', verdict: 'Top Tier', badgeBg: 'rgba(16, 185, 129, 0.18)', badgeColor: '#34d399', percentile: 'Top 5% of resumes' };
  if (val >= 80) return { grade: 'A', verdict: 'Strong', badgeBg: 'rgba(99, 102, 241, 0.18)', badgeColor: '#a5b4fc', percentile: 'Top 15% of resumes' };
  if (val >= 70) return { grade: 'B', verdict: 'Competitive', badgeBg: 'rgba(245, 158, 11, 0.18)', badgeColor: '#fbbf24', percentile: 'Top 35% of resumes' };
  if (val >= 55) return { grade: 'C', verdict: 'Needs Work', badgeBg: 'rgba(249, 115, 22, 0.18)', badgeColor: '#fb923c', percentile: 'Top 60% of resumes' };
  return { grade: 'D', verdict: 'High Risk', badgeBg: 'rgba(239, 68, 68, 0.18)', badgeColor: '#f87171', percentile: 'Bottom 40% of resumes' };
}

export function ScoreCard({ title, score, icon: Icon, teal = false }) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    if (score?.value == null) {
      setDisplayed(0);
      return;
    }

    const target = score.value;
    const duration = 1200; // ms

    function tick(timestamp) {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(eased * target));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    startRef.current = null;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [score?.value]);

  const color = scoreColor(score?.value);
  const gradeInfo = getGradeInfo(score?.value);

  return (
    <section className={'score-card ' + (teal ? 'teal' : '')}>
      <div className="card-top" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="icon-tile"><Icon size={20} /></span>
          <span>{title}</span>
        </div>
        {gradeInfo && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: gradeInfo.badgeBg,
            border: `1px solid ${gradeInfo.badgeColor}40`,
            borderRadius: 100,
            padding: '3px 10px',
          }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: gradeInfo.badgeColor }}>
              Grade {gradeInfo.grade}
            </span>
            <span style={{ fontSize: 11, color: gradeInfo.badgeColor, opacity: 0.9 }}>
              · {gradeInfo.verdict}
            </span>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div className="score-number" style={color ? { color } : undefined}>
          {score?.value != null ? displayed : '—'}<span>/ 100</span>
        </div>
        {gradeInfo && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            {gradeInfo.percentile}
          </span>
        )}
      </div>
      <div className="meter">
        <span
          style={{
            width: (score?.value ?? 0) + '%',
            background: color ?? undefined,
          }}
        />
      </div>
      <p>
        {score
          ? 'Application-defined score — not an employer ATS or hiring prediction.'
          : 'Your score will appear after analysis'}
      </p>
      {score && (
        <details>
          <summary>How this score works <ChevronDown size={14} /></summary>
          <p>{score.explanation}</p>
        </details>
      )}
    </section>
  );
}

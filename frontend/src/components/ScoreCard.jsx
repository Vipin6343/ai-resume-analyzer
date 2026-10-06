import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

/** Return a hex color based on score value */
function scoreColor(value) {
  if (value == null) return undefined;
  if (value < 40) return '#e03535';
  if (value <= 70) return '#d97706';
  return '#16a34a';
}

export function ScoreCard({ title, score, icon: Icon, teal = false }) {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    // Cancel any running animation
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
      // Ease-out cubic
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

  return (
    <section className={'score-card ' + (teal ? 'teal' : '')}>
      <div className="card-top">
        <span className="icon-tile"><Icon size={20} /></span>
        <span>{title}</span>
      </div>
      <div className="score-number" style={color ? { color } : undefined}>
        {score?.value != null ? displayed : '—'}<span>/ 100</span>
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

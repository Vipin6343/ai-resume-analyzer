import React from 'react';
import { TrendingUp, Award, Clock, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export function ScoreHistoryChart({ history, onRestore }) {
  if (!history || history.length === 0) return null;

  // Prepare ordered data (oldest to newest)
  const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
  const points = sorted.map((entry, index) => {
    const aiVal = entry.result?.ai_quality_score?.value ?? 0;
    const atsVal = entry.result?.ats_score?.value ?? 0;
    return {
      index,
      id: entry.id,
      filename: entry.filename,
      date: new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      aiVal,
      atsVal,
      result: entry.result,
    };
  });

  const latest = points[points.length - 1];
  const first = points[0];
  const diff = points.length > 1 ? latest.aiVal - first.aiVal : 0;
  const bestScore = Math.max(...points.map(p => p.aiVal));
  const avgScore = Math.round(points.reduce((acc, p) => acc + p.aiVal, 0) / points.length);

  // SVG Chart dimensions
  const width = 580;
  const height = 180;
  const padX = 45;
  const padY = 25;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const getX = idx => {
    if (points.length <= 1) return width / 2;
    return padX + (idx / (points.length - 1)) * chartW;
  };
  const getY = val => padY + chartH - (val / 100) * chartH;

  const aiPath = points.length > 1
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.aiVal)}`).join(' ')
    : '';

  const atsPath = points.length > 1
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(p.atsVal)}`).join(' ')
    : '';

  return (
    <section className="reference-panel score-history-section" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TrendingUp size={14} /> PROGRESS TRACKER
          </div>
          <h2 style={{ fontSize: 20, margin: '4px 0 6px' }}>Resume Score Trajectory</h2>
          <p className="reference-muted" style={{ fontSize: 13 }}>
            Historical score progression across your {points.length} recorded {points.length === 1 ? 'version' : 'versions'}.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          <div className="history-stat-badge">
            <span>Peak Score</span>
            <strong style={{ color: '#34d399' }}>{bestScore}</strong>
          </div>
          <div className="history-stat-badge">
            <span>Avg Score</span>
            <strong>{avgScore}</strong>
          </div>
          {points.length > 1 && (
            <div className="history-stat-badge">
              <span>Overall Gain</span>
              <strong style={{ color: diff > 0 ? '#34d399' : diff < 0 ? '#f87171' : 'var(--text-muted)' }}>
                {diff > 0 ? `+${diff}` : diff}
              </strong>
            </div>
          )}
        </div>
      </div>

      {/* SVG Timeline */}
      <div style={{ width: '100%', overflowX: 'auto', marginTop: 14 }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', maxHeight: 220, display: 'block', overflow: 'visible' }}
        >
          {/* Grid lines */}
          {[25, 50, 75, 100].map(val => (
            <g key={val}>
              <line
                x1={padX}
                y1={getY(val)}
                x2={width - padX}
                y2={getY(val)}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="4 4"
              />
              <text
                x={padX - 8}
                y={getY(val) + 4}
                textAnchor="end"
                fontSize="10"
                fill="var(--text-muted)"
              >
                {val}
              </text>
            </g>
          ))}

          {/* Lines */}
          {points.length > 1 && (
            <>
              <path d={atsPath} fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeDasharray="3 3" opacity="0.7" />
              <path d={aiPath} fill="none" stroke="#a78bfa" strokeWidth="3" />
            </>
          )}

          {/* Data Points */}
          {points.map((p, i) => {
            const x = getX(i);
            const yAi = getY(p.aiVal);
            return (
              <g key={p.id} style={{ cursor: 'pointer' }} onClick={() => onRestore && onRestore(p.result)}>
                <circle cx={x} cy={yAi} r="6" fill="#7c3aed" stroke="#c4b5fd" strokeWidth="2" />
                <text x={x} y={yAi - 10} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
                  {p.aiVal}
                </text>
                <text x={x} y={height - 4} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
                  {p.date}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 3, background: '#a78bfa', borderRadius: 2 }} />
          AI Quality Score
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 3, background: '#2dd4bf', borderRadius: 2 }} />
          ATS Compatibility
        </span>
      </div>
    </section>
  );
}


import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, Sparkles } from 'lucide-react';

export function SkillGapChart({ result }) {
  if (!result) return null;

  const matched = result.matched_requirements ?? [];
  const missing = result.missing_requirements ?? [];
  const insufficient = result.insufficient_evidence_requirements ?? [];
  const totalReqs = matched.length + missing.length + insufficient.length;

  const detectedSkills = result.detected_skills ?? [];

  // Calculate percentages
  const matchedPct = totalReqs > 0 ? Math.round((matched.length / totalReqs) * 100) : 0;
  const missingPct = totalReqs > 0 ? Math.round((missing.length / totalReqs) * 100) : 0;
  const insufficientPct = totalReqs > 0 ? Math.round((insufficient.length / totalReqs) * 100) : 0;

  return (
    <section className="result-section skill-gap-section">
      <div className="section-header-row">
        <div>
          <h3><Sparkles size={18} className="icon-pulse" /> Skill Gap & Requirements Visualizer</h3>
          <p className="section-subtext">Visual breakdown of your resume match against target job criteria</p>
        </div>
      </div>

      {totalReqs > 0 ? (
        <div className="skill-gap-visual">
          {/* Segmented Progress Bar */}
          <div className="multi-progress-bar">
            {matchedPct > 0 && (
              <div
                className="progress-segment matched-segment"
                style={{ width: `${matchedPct}%` }}
                title={`Matched: ${matched.length} (${matchedPct}%)`}
              />
            )}
            {insufficientPct > 0 && (
              <div
                className="progress-segment insufficient-segment"
                style={{ width: `${insufficientPct}%` }}
                title={`Partial: ${insufficient.length} (${insufficientPct}%)`}
              />
            )}
            {missingPct > 0 && (
              <div
                className="progress-segment missing-segment"
                style={{ width: `${missingPct}%` }}
                title={`Missing: ${missing.length} (${missingPct}%)`}
              />
            )}
          </div>

          {/* Metric Cards Row */}
          <div className="gap-metrics-grid">
            <div className="gap-metric-card matched">
              <div className="metric-icon-wrap"><CheckCircle2 size={18} /></div>
              <div className="metric-data">
                <span className="metric-val">{matched.length}</span>
                <span className="metric-title">Requirements Matched</span>
              </div>
              <span className="metric-badge">{matchedPct}%</span>
            </div>

            <div className="gap-metric-card insufficient">
              <div className="metric-icon-wrap"><AlertCircle size={18} /></div>
              <div className="metric-data">
                <span className="metric-val">{insufficient.length}</span>
                <span className="metric-title">Partial / Unverified</span>
              </div>
              <span className="metric-badge">{insufficientPct}%</span>
            </div>

            <div className="gap-metric-card missing">
              <div className="metric-icon-wrap"><XCircle size={18} /></div>
              <div className="metric-data">
                <span className="metric-val">{missing.length}</span>
                <span className="metric-title">Skills / Experience Gap</span>
              </div>
              <span className="metric-badge">{missingPct}%</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="standalone-skills-showcase">
          <p className="hint-text">
            💡 Provide a job description to see a full matched vs missing requirements radar.
          </p>
          <div className="skill-chips-row">
            {detectedSkills.map((skill, idx) => (
              <span key={idx} className="smart-skill-chip">
                <CheckCircle2 size={13} /> {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

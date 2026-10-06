import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/** Format the full analysis result as plain text for clipboard. */
function formatResult(result) {
  if (!result) return '';
  const lines = [];

  lines.push('=== ResumeLens Analysis ===');
  lines.push('');

  if (result.target_job) lines.push(`Target role: ${result.target_job}`);

  // ATS score
  if (result.ats_score) {
    lines.push(`ATS Readiness Score: ${result.ats_score.value} / 100`);
    if (result.ats_score.explanation) lines.push(result.ats_score.explanation);
  }

  // Match score
  if (result.match_score?.value != null) {
    lines.push(`Job Match Score: ${result.match_score.value} / 100`);
    if (result.match_score.explanation) lines.push(result.match_score.explanation);
  }

  lines.push('');
  lines.push('--- Summary ---');
  if (result.resume_summary) lines.push(result.resume_summary);

  // Skills
  if (result.detected_skills?.length) {
    lines.push('');
    lines.push('--- Detected Skills ---');
    lines.push(result.detected_skills.join(', '));
  }

  // ATS checks
  if (result.ats_score?.breakdown?.length) {
    lines.push('');
    lines.push('--- ATS Checks ---');
    result.ats_score.breakdown.forEach(c => {
      const icon = c.passed ? '✓' : '✗';
      lines.push(`${icon} ${c.check.replaceAll('_', ' ')} (${c.points}/${c.max_points})`);
      if (c.explanation) lines.push(`  ${c.explanation}`);
    });
  }

  // Suggestions
  const allSuggestions = [
    ...(result.improvement_suggestions ?? []),
    ...(result.ats_score?.improvement_suggestions ?? []),
  ];
  const unique = [...new Set(allSuggestions)];
  if (unique.length) {
    lines.push('');
    lines.push('--- Suggestions ---');
    unique.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }

  if (result.ai_quality_score) {
    lines.push('', '--- AI Resume Quality ---', String(result.ai_quality_score.value) + ' / 100', result.ai_quality_score.explanation);
  }
  const review = result.resume_review;
  if (review) {
    Object.entries(review.ratings).forEach(([name, item]) => {
      lines.push(name.replaceAll('_', ' ') + ': ' + item.rating + '/4', item.explanation);
      if (item.evidence) lines.push('Evidence: ' + item.evidence);
    });
    for (const [label, findings] of [['Strengths', review.strengths], ['Issues', review.issues]]) {
      lines.push('', '--- ' + label + ' ---');
      findings.forEach(item => lines.push(item.heading + ' [' + item.priority + ']', item.explanation, item.evidence || '', 'Action: ' + item.action));
    }
    lines.push('', '--- Section Review ---');
    review.sections.forEach(item => lines.push(item.section + ': ' + item.status, item.feedback, item.suggestion));
    lines.push('', '--- Bullet Drafts (verify before use) ---');
    review.bullet_rewrites.forEach(item => lines.push('Original: ' + item.original, 'Draft: ' + item.revised, item.reason));
    if (review.improved_summary) lines.push('', '--- Suggested Summary (verify before use) ---', review.improved_summary);
  }
  return lines.join('\n');
}

export function CopyButton({ result }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = formatResult(result);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: create a temporary textarea
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      className="copy-button"
      onClick={handleCopy}
      title="Copy analysis to clipboard"
      aria-label="Copy analysis to clipboard"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

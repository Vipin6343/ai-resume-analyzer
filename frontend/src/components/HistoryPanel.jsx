import React, { useState } from 'react';
import { History, X, ChevronDown, ChevronUp } from 'lucide-react';

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function HistoryPanel({ history, onRestore, onDelete }) {
  const [open, setOpen] = useState(false);

  if (!history || history.length === 0) return null;

  return (
    <div className="history-panel">
      <button
        className="history-toggle"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <History size={15} />
        <span>Recent analyses ({history.length})</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <ul className="history-list" role="list">
          {history.map(entry => (
            <li key={entry.id} className="history-item">
              <button
                className="history-restore"
                onClick={() => onRestore(entry.result)}
                title="Restore this analysis"
              >
                <span className="history-filename">{entry.filename}</span>
                <span className="history-meta">
                  <span>{formatDate(entry.date)}</span>
                  {entry.result?.ats_score?.value != null && (
                    <span className="history-score">ATS {entry.result.ats_score.value}</span>
                  )}
                  {entry.result?.match_score?.value != null && (
                    <span className="history-score">Match {entry.result.match_score.value}</span>
                  )}
                </span>
              </button>
              <button
                className="history-delete"
                onClick={() => onDelete(entry.id)}
                aria-label={`Delete history entry for ${entry.filename}`}
                title="Remove"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

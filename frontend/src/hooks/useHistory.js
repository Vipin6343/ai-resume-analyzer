import { useState } from 'react';

const STORAGE_KEY = 'resumelens_history';
const MAX_ENTRIES = 5;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // quota exceeded — silently ignore
  }
}

export function useHistory() {
  const [history, setHistory] = useState(load);

  function saveToHistory(filename, result) {
    const entry = {
      id: Date.now(),
      filename,
      date: new Date().toISOString(),
      result,
    };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, MAX_ENTRIES);
      save(next);
      return next;
    });
  }

  function deleteEntry(id) {
    setHistory(prev => {
      const next = prev.filter(e => e.id !== id);
      save(next);
      return next;
    });
  }

  function clearHistory() {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return { history, saveToHistory, deleteEntry, clearHistory };
}

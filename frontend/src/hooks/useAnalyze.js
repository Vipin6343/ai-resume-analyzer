import { useState, useRef } from 'react';

const API = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const MAX_SIZE = 5 * 1024 * 1024;

export function useAnalyze() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [atsResult, setAtsResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [targetJob, setTargetJob] = useState('');
  const controller = useRef(null);

  function selectFile(next) {
    if (!next || busy) return;
    setResult(null);
    setAtsResult(null);
    setError('');
    if (next.size > MAX_SIZE) { setError('Choose a PDF smaller than 5 MB.'); return; }
    if (!next.name.toLowerCase().endsWith('.pdf')) { setError('Please choose a PDF resume.'); return; }
    if (!next.size) { setError('This file is empty. Please choose another PDF.'); return; }
    setFile(next);
  }

  function removeFile() {
    setFile(null);
    setResult(null);
    setAtsResult(null);
    setError('');
  }

  async function analyze({ jobDescription: jd, targetJob: tj } = {}) {
    if (!file) { setError('Upload your resume first.'); return; }
    setBusy(true);
    setError('');
    setResult(null);
    setAtsResult(null);
    setJobDescription(jd || '');
    setTargetJob(tj || '');
    controller.current = new AbortController();
    const timer = setTimeout(() => controller.current?.abort('timeout'), 480000);
    try {
      const body = new FormData();
      body.append('file', file);
      if (jd?.trim()) body.append('job_description', jd.trim());
      if (tj?.trim()) body.append('target_job', tj.trim());

      const response = await fetch(`${API}/api/v1/resumes/analyze`, {
        method: 'POST',
        body,
        signal: controller.current.signal,
      });

      let data;
      try { data = await response.json(); }
      catch { throw new Error('The server returned an unreadable response. Check that the backend is running.'); }

      if (!response.ok) throw new Error(data.error?.message || 'Analysis could not be completed. Please try again.');
      if (!data.ats_score || !Array.isArray(data.detected_skills))
        throw new Error('The backend response is missing analysis fields. Update and restart the backend.');

      setResult(data);
    } catch (err) {
      if (controller.current?.signal.aborted) {
        setError(controller.current.signal.reason === 'timeout'
          ? 'Analysis took too long. Please try again.'
          : 'Analysis cancelled.');
      } else {
        setError(err instanceof TypeError
          ? 'Could not reach the backend. Make sure FastAPI is running on port 8000.'
          : err.message);
      }
    } finally {
      clearTimeout(timer);
      setBusy(false);
      controller.current = null;
    }
  }

  function cancel() { controller.current?.abort(); }

  async function checkATS() {
    if (!file || busy) return;
    setBusy(true); setError(''); setAtsResult(null); setResult(null);
    const request = new AbortController();
    controller.current = request;
    const timer = setTimeout(() => request.abort('timeout'), 60000);
    try {
      const body = new FormData(); body.append('file', file);
      const response = await fetch(API + '/api/v1/resumes/ats-check', {method:'POST',body,signal:request.signal});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Compatibility check failed.');
      if (!Array.isArray(data.breakdown)) throw new Error('Unexpected compatibility response. Restart the updated backend.');
      setAtsResult(data);
    } catch (err) {
      setError(request.signal.aborted ? 'Compatibility check cancelled or timed out.' : err instanceof TypeError ? 'Could not reach the backend on port 8000.' : err.message);
    } finally { clearTimeout(timer); controller.current = null; setBusy(false); }
  }

  return { file, result, atsResult, error, busy, jobDescription, targetJob, selectFile, removeFile, analyze, checkATS, cancel };
}

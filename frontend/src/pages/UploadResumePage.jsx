import { useEffect, useMemo, useRef, useState } from "react";
import { Sparkles, UploadCloud } from "lucide-react";

import { analyzeResume, uploadResume } from "../services/api";
import EmptyState from "../components/EmptyState";
import LoadingPanel from "../components/LoadingPanel";
import SectionCard from "../components/SectionCard";

export default function UploadResumePage({ dashboard, refreshDashboard, resetVersion, userId }) {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [targetRoles, setTargetRoles] = useState("");
  const [uploadResult, setUploadResult] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const latestResume = uploadResult || dashboard?.latest_resume;
  const parsedResume = latestResume?.parsed_resume;
  const roles = useMemo(
    () =>
      targetRoles
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    [targetRoles],
  );

  useEffect(() => {
    setFile(null);
    setTargetRoles("");
    setUploadResult(null);
    setAnalysisResult(null);
    setLoading(false);
    setAnalyzing(false);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [resetVersion]);

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!file) {
      setError("Choose a PDF resume before uploading.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await uploadResume(file, userId);
      setUploadResult(response);
      setAnalysisResult(null);
      await refreshDashboard();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    const resumeId = latestResume?.resume_id;
    if (!resumeId) {
      setError("Upload a resume first.");
      return;
    }

    try {
      setAnalyzing(true);
      setError("");
      const response = await analyzeResume({
        resume_id: resumeId,
        user_id: userId,
        target_job_titles: roles,
      });
      setAnalysisResult(response);
      await refreshDashboard();
    } catch (analysisError) {
      setError(analysisError.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <SectionCard
        title="Upload Resume"
        subtitle="PDF parsing runs server-side with PyMuPDF, then the extracted content is structured into skills, experience, projects, and education."
      >
        <form className="space-y-5" onSubmit={handleUpload}>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-slate-950/40 px-6 py-14 text-center transition hover:border-ember-400/30 hover:bg-white/5">
            <UploadCloud className="h-12 w-12 text-ember-400" />
            <p className="mt-4 text-lg font-semibold text-white">
              {file ? file.name : "Drop a PDF resume here or click to browse"}
            </p>
            <p className="mt-2 text-sm text-slate-400">Maximum size: 5 MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>

          <div>
            <label htmlFor="roles" className="mb-2 block text-sm font-medium text-slate-200">
              Target roles for analysis
            </label>
            <input
              id="roles"
              type="text"
              value={targetRoles}
              onChange={(event) => setTargetRoles(event.target.value)}
              placeholder="AI Engineer, Backend Engineer, ML Platform Engineer"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-ember-400/40"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-ember-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ember-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Uploading..." : "Upload Resume"}
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || !latestResume}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {analyzing ? "Analyzing..." : "Analyze with Gemini"}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Parsed Resume"
        subtitle="This is the structured payload the rest of the platform uses for analysis, matching, and improvement."
      >
        {!latestResume ? (
          <EmptyState
            title="No resume uploaded yet"
            description="Upload a PDF to extract sections, identify skills, and unlock the downstream analysis pipeline."
          />
        ) : loading ? (
          <LoadingPanel message="Extracting and structuring the resume..." />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Candidate</p>
                <p className="mt-2 text-xl font-semibold text-white">{parsedResume?.name || "Unknown"}</p>
                <p className="mt-1 text-sm text-slate-400">{parsedResume?.email || "No email found"}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Location</p>
                <p className="mt-2 text-xl font-semibold text-white">{parsedResume?.location || "Not detected"}</p>
                <p className="mt-1 text-sm text-slate-400">{parsedResume?.phone || "No phone found"}</p>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-white">Skills</p>
              <div className="flex flex-wrap gap-2">
                {parsedResume?.skills?.length ? (
                  parsedResume.skills.map((skill) => (
                    <span key={skill} className="chip">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">No explicit skills extracted.</span>
                )}
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <p className="mb-3 text-sm font-medium text-white">Experience Highlights</p>
                <ul className="space-y-2 text-sm leading-6 text-slate-300">
                  {parsedResume?.experience?.length ? (
                    parsedResume.experience.slice(0, 5).map((item) => <li key={item}>• {item}</li>)
                  ) : (
                    <li>No experience bullets detected.</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-white">Projects</p>
                <ul className="space-y-2 text-sm leading-6 text-slate-300">
                  {parsedResume?.projects?.length ? (
                    parsedResume.projects.slice(0, 4).map((item) => <li key={item}>• {item}</li>)
                  ) : (
                    <li>No project bullets detected.</li>
                  )}
                </ul>
              </div>
            </div>

            {analysisResult ? (
              <div className="rounded-3xl border border-emerald-400/15 bg-emerald-500/10 p-5">
                <p className="text-sm font-medium text-emerald-100">
                  Analysis ready: score {analysisResult.analysis.score}/100
                </p>
                <p className="mt-2 text-sm text-emerald-50/80">{analysisResult.analysis.resume_summary}</p>
              </div>
            ) : null}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

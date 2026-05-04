import { useEffect, useState } from "react";

import EmptyState from "../components/EmptyState";
import LoadingPanel from "../components/LoadingPanel";
import SectionCard from "../components/SectionCard";
import { improveResume } from "../services/api";

export default function ResumeImprovementPage({ dashboard, refreshDashboard, resetVersion, userId }) {
  const [targetJobTitle, setTargetJobTitle] = useState("");
  const [focusAreas, setFocusAreas] = useState("ATS keywords, quantified impact, stronger summary");
  const [result, setResult] = useState(dashboard?.latest_improvement || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setResult(dashboard?.latest_improvement || null);
  }, [dashboard]);

  useEffect(() => {
    setTargetJobTitle("");
    setFocusAreas("ATS keywords, quantified impact, stronger summary");
    setResult(null);
    setLoading(false);
    setError("");
  }, [resetVersion]);

  const handleImprove = async (event) => {
    event.preventDefault();
    if (!dashboard?.latest_resume?.resume_id) {
      setError("Upload a resume before requesting improvements.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await improveResume({
        resume_id: dashboard.latest_resume.resume_id,
        user_id: userId,
        target_job_title: targetJobTitle || null,
        focus_areas: focusAreas
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      setResult(response);
      await refreshDashboard();
    } catch (improvementError) {
      setError(improvementError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <SectionCard
        title="Improvement Controls"
        subtitle="Use Gemini to rewrite weak bullets, tighten the summary, and improve keyword coverage for the target role."
      >
        <form className="space-y-5" onSubmit={handleImprove}>
          <div>
            <label htmlFor="target-job" className="mb-2 block text-sm font-medium text-slate-200">
              Target job title
            </label>
            <input
              id="target-job"
              type="text"
              value={targetJobTitle}
              onChange={(event) => setTargetJobTitle(event.target.value)}
              placeholder="Generative AI Engineer"
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-ember-400/40"
            />
          </div>

          <div>
            <label htmlFor="focus" className="mb-2 block text-sm font-medium text-slate-200">
              Focus areas
            </label>
            <textarea
              id="focus"
              rows="5"
              value={focusAreas}
              onChange={(event) => setFocusAreas(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-ember-400/40"
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || !dashboard?.latest_resume}
            className="rounded-full bg-ember-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ember-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate Resume Rewrite"}
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="Improved Resume Draft"
        subtitle="Use this output to rewrite your headline, summary, and core bullets without inventing experience."
      >
        {loading ? (
          <LoadingPanel message="Generating ATS-optimized improvements..." />
        ) : !result ? (
          <EmptyState
            title="No improved draft yet"
            description="Run the improvement workflow to get a rewritten summary, stronger bullet points, and suggested ATS keywords."
          />
        ) : (
          <div className="space-y-6">
            <div className="rounded-3xl border border-ember-400/20 bg-ember-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-ember-100/70">Headline</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">{result.improvement.headline}</h3>
              <p className="mt-3 text-sm leading-6 text-ember-50/90">
                {result.improvement.professional_summary}
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-medium text-white">Improved Experience Bullets</p>
                <ul className="space-y-3 text-sm leading-6 text-slate-300">
                  {result.improvement.improved_experience_bullets.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-white">Improved Project Bullets</p>
                <ul className="space-y-3 text-sm leading-6 text-slate-300">
                  {result.improvement.improved_project_bullets.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-3 text-sm font-medium text-white">Skills to Emphasize</p>
                <div className="flex flex-wrap gap-2">
                  {result.improvement.skills_to_emphasize.map((skill) => (
                    <span key={skill} className="chip">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-medium text-white">ATS Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {result.improvement.ats_keywords.map((skill) => (
                    <span key={skill} className="chip border-sky-400/20 bg-sky-400/10 text-sky-100">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-medium text-white">Final Tips</p>
              <ul className="space-y-2 text-sm leading-6 text-slate-300">
                {result.improvement.final_tips.map((tip) => (
                  <li key={tip}>• {tip}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

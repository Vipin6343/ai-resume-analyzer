import EmptyState from "../components/EmptyState";
import LoadingPanel from "../components/LoadingPanel";
import ScoreDial from "../components/ScoreDial";
import SectionCard from "../components/SectionCard";
import StatCard from "../components/StatCard";

export default function DashboardPage({ dashboard, loading }) {
  if (loading && !dashboard) {
    return (
      <LoadingPanel message="Loading your latest resume analytics..." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Resumes"
          value={dashboard?.stats?.resume_count ?? 0}
          caption="Stored PDF resumes and parsed metadata"
        />
        <StatCard
          label="Analyses"
          value={dashboard?.stats?.analysis_count ?? 0}
          caption="Gemini-generated scoring and suggestions"
        />
        <StatCard
          label="Match Runs"
          value={dashboard?.stats?.match_count ?? 0}
          caption="FAISS similarity searches against sample roles"
        />
        <StatCard
          label="Improvements"
          value={dashboard?.stats?.improvement_count ?? 0}
          caption="ATS-focused rewrites and keyword improvements"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Latest Analysis"
          subtitle="Score, ATS readiness, strengths, and prioritized improvements."
        >
          {!dashboard?.latest_analysis ? (
            <EmptyState
              title="No analysis yet"
              description="Upload a resume and run the analyzer to populate this view."
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-[180px_1fr]">
              <div className="flex justify-center">
                <ScoreDial score={dashboard.latest_analysis.analysis.score} />
              </div>
              <div className="space-y-5">
                <div>
                  <p className="text-sm font-medium text-white">Summary</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {dashboard.latest_analysis.analysis.resume_summary}
                  </p>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-sm font-medium text-white">Strengths</p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      {dashboard.latest_analysis.analysis.strengths.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium text-white">Suggestions</p>
                    <ul className="space-y-2 text-sm text-slate-300">
                      {dashboard.latest_analysis.analysis.suggestions.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium text-white">Section Feedback</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {dashboard.latest_analysis.analysis.section_feedback.map((item) => (
                      <div key={item.section} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                        <p className="text-sm font-semibold text-white">{item.section}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-400">{item.feedback}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Recent Activity"
          subtitle="A lightweight audit trail for uploads, AI analysis, job matching, and resume rewrites."
        >
          {!dashboard?.activity?.length ? (
            <EmptyState
              title="No recent activity"
              description="Actions will appear here after you upload a resume or run one of the workflows."
            />
          ) : (
            <div className="space-y-4">
              {dashboard.activity.map((item) => (
                <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                    </div>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Latest Resume Snapshot"
          subtitle="Structured fields extracted from the most recent PDF upload."
        >
          {!dashboard?.latest_resume ? (
            <EmptyState
              title="No resume available"
              description="The latest upload will show structured skills, experience, and education here."
            />
          ) : (
            <div className="space-y-5">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {dashboard.latest_resume.file_name}
                </p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {dashboard.latest_resume.parsed_resume.name || "Unknown candidate"}
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  {dashboard.latest_resume.parsed_resume.summary || "No explicit summary detected."}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {dashboard.latest_resume.parsed_resume.skills.map((skill) => (
                  <span key={skill} className="chip">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Current Skill Gaps"
          subtitle="Priority gaps inferred from the most recent job matching run."
        >
          {!dashboard?.latest_matches?.length ? (
            <EmptyState
              title="No job matches yet"
              description="Run the matching workflow to see missing skills and priority keywords."
            />
          ) : (
            <div className="space-y-4">
              {dashboard.latest_matches.slice(0, 3).map((match) => (
                <div key={match.job.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-white">{match.job.title}</p>
                      <p className="text-sm text-slate-400">{match.job.company}</p>
                    </div>
                    <p className="text-2xl font-semibold text-white">{match.match_score}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {match.priority_skills.map((skill) => (
                      <span key={skill} className="chip border-amber-400/20 bg-amber-500/10 text-amber-100">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

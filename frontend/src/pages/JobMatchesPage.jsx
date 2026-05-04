import { useEffect, useState } from "react";

import EmptyState from "../components/EmptyState";
import LoadingPanel from "../components/LoadingPanel";
import MatchCard from "../components/MatchCard";
import SectionCard from "../components/SectionCard";
import { matchJobs } from "../services/api";

export default function JobMatchesPage({ dashboard, refreshDashboard, resetVersion, userId }) {
  const [matches, setMatches] = useState(dashboard?.latest_matches || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMatches(dashboard?.latest_matches || []);
  }, [dashboard]);

  useEffect(() => {
    setMatches([]);
    setLoading(false);
    setError("");
  }, [resetVersion]);

  const handleMatch = async () => {
    if (!dashboard?.latest_resume?.resume_id) {
      setError("Upload a resume before running job matches.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await matchJobs({
        resume_id: dashboard.latest_resume.resume_id,
        user_id: userId,
        limit: 5,
      });
      setMatches(response.matches);
      await refreshDashboard();
    } catch (matchError) {
      setError(matchError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Job Matching"
        subtitle="Resume embeddings are generated with all-MiniLM-L6-v2 and scored against FAISS-stored job vectors."
        actions={
          <button
            type="button"
            onClick={handleMatch}
            disabled={loading || !dashboard?.latest_resume}
            className="rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Matching..." : "Run Match Search"}
          </button>
        }
      >
        {error ? (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <LoadingPanel message="Searching the vector index for the most similar roles..." />
        ) : matches.length ? (
          <div className="space-y-5">
            {matches.map((match) => (
              <MatchCard key={match.job.id} match={match} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No matches yet"
            description="Run the search to see the top five jobs, similarity score, matching skills, and priority gaps."
          />
        )}
      </SectionCard>
    </div>
  );
}

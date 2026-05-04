export default function MatchCard({ match }) {
  return (
    <article className="panel-soft p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-ember-100/75">
            {match.job.company} • {match.job.location}
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-white">{match.job.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-300">{match.job.description}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Match Score</p>
          <p className="text-3xl font-semibold text-white">{match.match_score}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div>
          <p className="mb-2 text-sm font-medium text-white">Matching Skills</p>
          <div className="flex flex-wrap gap-2">
            {match.matching_skills.length ? (
              match.matching_skills.map((skill) => (
                <span key={skill} className="chip border-emerald-400/20 bg-emerald-500/10 text-emerald-100">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-400">No strong overlap detected.</span>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-white">Missing Skills</p>
          <div className="flex flex-wrap gap-2">
            {match.missing_skills.length ? (
              match.missing_skills.map((skill) => (
                <span key={skill} className="chip border-amber-400/20 bg-amber-500/10 text-amber-50">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-400">No major skill gaps.</span>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-white">Priority Focus</p>
          <div className="flex flex-wrap gap-2">
            {match.priority_skills.length ? (
              match.priority_skills.map((skill) => (
                <span key={skill} className="chip border-white/10 bg-white/5 text-white">
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-400">Keep current strengths visible.</span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm italic text-slate-400">{match.rationale}</p>
    </article>
  );
}


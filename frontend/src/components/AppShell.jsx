import { Activity, BrainCircuit, BriefcaseBusiness, RefreshCw, RotateCcw, Upload } from "lucide-react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/upload", label: "Upload Resume", icon: Upload },
  { to: "/dashboard", label: "Dashboard", icon: Activity },
  { to: "/jobs", label: "Job Matches", icon: BriefcaseBusiness },
  { to: "/improvement", label: "Resume Improvement", icon: BrainCircuit },
];

export default function AppShell({ dashboard, loading, resetting, onRefresh, onReset, children }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="panel relative overflow-hidden px-6 py-6 shadow-glow">
        <div className="absolute right-6 top-6 h-28 w-28 rounded-full bg-ember-500/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 text-sm uppercase tracking-[0.24em] text-ember-100/75">
              AI Resume Analyzer and Job Matcher
            </p>
            <h1 className="font-display text-4xl leading-tight text-white sm:text-5xl">
              Turn a raw resume into a scored, searchable, and role-ready profile.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Upload a PDF, get Gemini-driven feedback, match against vectorized job descriptions,
              and rewrite weak sections into stronger ATS-friendly bullets.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading || resetting}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              type="button"
              onClick={onReset}
              disabled={loading || resetting}
              className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-50 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw className={`h-4 w-4 ${resetting ? "animate-spin" : ""}`} />
              {resetting ? "Resetting..." : "Reset"}
            </button>
            <div className="rounded-2xl border border-ember-400/20 bg-ember-500/10 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.2em] text-ember-100/70">Latest Score</p>
              <p className="text-2xl font-semibold text-white">
                {dashboard?.latest_analysis?.analysis?.score ?? "--"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <nav className="mt-6 grid gap-3 md:grid-cols-4">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "panel-soft inline-flex items-center gap-3 px-4 py-4 text-sm transition",
                isActive
                  ? "border-ember-400/30 bg-ember-500/12 text-white"
                  : "text-slate-300 hover:border-white/20 hover:bg-white/10",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <main className="mt-6 flex-1">{children}</main>
    </div>
  );
}

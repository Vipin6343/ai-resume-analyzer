export default function ScoreDial({ score = 0 }) {
  const value = Math.max(0, Math.min(100, score));
  const style = {
    background: `conic-gradient(#f97316 ${value * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
  };

  return (
    <div className="relative flex h-36 w-36 items-center justify-center rounded-full p-3" style={style}>
      <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-950/95">
        <div className="text-center">
          <p className="text-4xl font-semibold text-white">{value}</p>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">ATS Score</p>
        </div>
      </div>
    </div>
  );
}


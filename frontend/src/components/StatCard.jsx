export default function StatCard({ label, value, caption }) {
  return (
    <div className="panel-soft p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{caption}</p>
    </div>
  );
}


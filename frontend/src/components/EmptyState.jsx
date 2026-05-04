export default function EmptyState({ title, description }) {
  return (
    <div className="panel-soft border-dashed p-8 text-center">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}


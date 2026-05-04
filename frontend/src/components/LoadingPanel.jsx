export default function LoadingPanel({ message = "Loading..." }) {
  return (
    <div className="panel-soft flex min-h-48 items-center justify-center p-8 text-center">
      <div>
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-ember-500" />
        <p className="mt-4 text-sm text-slate-300">{message}</p>
      </div>
    </div>
  );
}


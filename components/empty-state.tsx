export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 py-14 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-secondary">{children}</p>
    </div>
  );
}

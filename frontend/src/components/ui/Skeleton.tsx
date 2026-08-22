export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`crew-skeleton ${className}`} style={style} aria-hidden />;
}

export function CardSkeleton() {
  return (
    <div className="crew-card flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-11 w-11 rounded-full" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="mt-1 flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="crew-table-wrap p-2">
      <Skeleton className="h-9 rounded-md" style={{ marginBottom: 8 }} />
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-2 py-3" style={{ borderBottom: '1px solid var(--color-line)' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" style={{ maxWidth: c === 0 ? 160 : undefined }} />
          ))}
        </div>
      ))}
    </div>
  );
}
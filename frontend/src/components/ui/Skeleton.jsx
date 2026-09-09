export function Skeleton({ className = '', style }) {
  return <div className={`shimmer rounded-lg ${className}`} style={style} />;
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 lg:px-6 py-3.5">
      <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-40 max-w-[60%]" />
        <Skeleton className="h-3 w-24 max-w-[35%]" />
      </div>
      <Skeleton className="h-4 w-16 shrink-0" />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SkeletonChart height={220} />
        </div>
        <div className="card p-5 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-36 w-36 rounded-full mx-auto" />
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-3 w-full" />)}
        </div>
      </div>
    </div>
  );
}

/** Bars of varying height read as a chart rather than a grey block. */
export function SkeletonChart({ height = 280, bars = 12 }) {
  const heights = [52, 78, 40, 88, 64, 96, 46, 72, 58, 84, 38, 68];

  return (
    <div className="card p-5 space-y-4">
      <Skeleton className="h-4 w-40" />
      <div className="flex items-end gap-2" style={{ height }}>
        {[...Array(bars)].map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-md rounded-b-none"
            style={{ height: `${heights[i % heights.length]}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 6, header = false }) {
  return (
    <div className="card overflow-hidden">
      {header && (
        <div className="px-4 lg:px-6 py-3 border-b border-gray-100 dark:border-gray-800">
          <Skeleton className="h-3 w-32" />
        </div>
      )}
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {[...Array(rows)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 8, cols = 4 }) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-4 px-4 lg:px-6 py-3 border-b border-gray-100 dark:border-gray-800">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className={`h-3 ${i === 0 ? 'flex-1' : 'w-20'}`} />
        ))}
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800">
        {[...Array(rows)].map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 lg:px-6 py-3.5">
            {[...Array(cols)].map((_, c) => (
              <Skeleton key={c} className={`h-3.5 ${c === 0 ? 'flex-1' : 'w-20'}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(count)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

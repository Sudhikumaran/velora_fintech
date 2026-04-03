export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl ${className}`} />
  );
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
    <div className="flex items-center gap-4 px-6 py-4">
      <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-4 w-16" />
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
        <div className="card p-5 lg:col-span-2 space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-52 w-full" />
        </div>
        <div className="card p-5 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-36 w-full rounded-full mx-auto" style={{ borderRadius: '50%' }} />
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-3 w-full" />)}
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ rows = 5 }) {
  return (
    <div className="card overflow-hidden divide-y divide-gray-50 dark:divide-gray-800">
      {[...Array(rows)].map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}

export function SkeletonGrid({ cols = 3, rows = 2 }) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${cols} gap-4`}>
      {[...Array(cols * rows)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

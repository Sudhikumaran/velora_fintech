export default function LoadingSpinner({ size = 'md', center = false }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const spinner = (
    <div className={`relative ${sizes[size]}`}>
      <div className="absolute inset-0 rounded-full border-2 border-indigo-100 dark:border-indigo-900/40" />
      <div className="absolute inset-0 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
      <div className="absolute inset-1 rounded-full border-2 border-violet-400/50 border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '0.9s' }} />
    </div>
  );

  if (center) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[200px]">
        {spinner}
      </div>
    );
  }

  return spinner;
}

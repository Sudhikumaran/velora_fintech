export default function LoadingSpinner({ size = 'md', center = false }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const spinner = (
    <div
      className={`${sizes[size]} border-indigo-600 border-t-transparent rounded-full animate-spin`}
    />
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

export default function Badge({ children, variant = 'default', size = 'sm' }) {
  const variants = {
    default: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    primary: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    income: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    expense: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    transfer: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400',
  };

  const sizes = {
    xs: 'px-2 py-0.5 text-xs',
    sm: 'px-2.5 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
}

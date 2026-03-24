import clsx from 'clsx';

export function LoadingSpinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dim = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <span
      aria-label="Loading"
      className={clsx(
        'inline-block animate-spin rounded-full border-2 border-border-default border-t-transparent',
        dim,
        className
      )}
    />
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3.5 animate-pulse rounded bg-gray-200 dark:bg-gray-700 align-middle ${className}`}
    />
  )
}

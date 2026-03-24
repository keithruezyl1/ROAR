export function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="absolute -right-2 -top-2 rounded-pill bg-danger px-2 py-[2px] text-[11px] font-medium text-text-inverse">
      {count}
    </span>
  );
}

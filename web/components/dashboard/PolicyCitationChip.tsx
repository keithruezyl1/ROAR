'use client';

import Link from 'next/link';

export function PolicyCitationChip({
  slug,
  title,
  removable,
  onRemove,
}: {
  slug: string;
  title: string;
  removable?: boolean;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-primary-border bg-primary-subtle px-[10px] py-1 text-[13px] text-text-brand">
      <Link href={`/policies#${slug}`} target="_blank" className="hover:underline">
        {title}
      </Link>
      <span aria-hidden>↗</span>
      {removable ? (
        <button type="button" onClick={onRemove} className="text-text-muted" aria-label="Remove policy">
          x
        </button>
      ) : null}
    </span>
  );
}

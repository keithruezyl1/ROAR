'use client';

import * as React from 'react';

import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';

type Policy = {
  id: string;
  category: string;
  title: string;
  slug: string;
  content: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  store: 'Store policies',
  payment: 'Payment policies',
  return: 'Return policies',
  delivery: 'Delivery policies',
  sla: 'SLA standards',
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function PoliciesPage() {
  const [policies, setPolicies] = React.useState<Policy[]>([]);
  const [search, setSearch] = React.useState('');
  const [loadError, setLoadError] = React.useState(false);

  React.useEffect(() => {
    setLoadError(false);
    void api
      .get<Policy[]>('/policies')
      .then((rows) => {
        setPolicies(rows);
      })
      .catch(() => {
        setLoadError(true);
        setPolicies([]);
      });
  }, []);

  const grouped = React.useMemo(() => {
    const byCat: Record<string, Policy[]> = {};
    policies.forEach((policy) => {
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${policy.title} ${policy.content} ${policy.slug}`.toLowerCase();
        if (!haystack.includes(q)) return;
      }
      if (!byCat[policy.category]) byCat[policy.category] = [];
      byCat[policy.category].push(policy);
    });
    return byCat;
  }, [policies, search]);

  const categories = Object.keys(grouped).sort();

  return (
    <AppShell role="approver" title="Policies">
      <div className="mx-auto flex w-full max-w-[1200px] gap-6">
        <aside className="sticky top-0 hidden h-fit w-[250px] shrink-0 rounded-card border border-border-default bg-bg-surface p-4 lg:block">
          <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            Categories
          </div>
          <nav className="flex flex-col gap-2">
            {categories.map((cat) => (
              <a
                key={cat}
                href={`#${cat}`}
                className="flex items-center justify-between rounded-btn px-3 py-2 text-[13px] text-text-secondary transition-colors hover:bg-bg-sunken hover:text-text-primary"
              >
                <span>{CATEGORY_LABELS[cat] ?? cat}</span>
                <span className="rounded-pill bg-bg-sunken px-2 py-[2px] text-[11px] text-text-muted">
                  {grouped[cat].length}
                </span>
              </a>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-4 rounded-card border border-border-default bg-bg-surface p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-[22px] font-bold text-text-primary">Policy registry</h2>
                <p className="mt-1 text-[13px] text-text-secondary">
                  Search and review policy records used by triage, resolution, and audits.
                </p>
              </div>

              <label className="w-full max-w-[320px]">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                    <SearchIcon />
                  </span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, slug, or content"
                    className="h-11 w-full rounded-input border border-border-default bg-bg-elevated pl-10 pr-3 text-[15px] text-text-primary placeholder:text-text-muted focus:border-2 focus:border-border-focus focus:outline-none"
                  />
                </div>
              </label>
            </div>
          </div>

          {categories.map((category) => (
            <section key={category} id={category} className="mb-8 scroll-mt-24">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[18px] font-semibold text-text-primary">{CATEGORY_LABELS[category] ?? category}</h3>
                <span className="text-[12px] text-text-muted">{grouped[category].length} policies</span>
              </div>
              <div className="space-y-3">
                {grouped[category].map((policy) => (
                  <article
                    key={policy.id}
                    id={policy.slug}
                    className="rounded-card border border-border-default bg-bg-surface p-4 transition-colors hover:border-border-focus"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-[16px] font-semibold text-text-primary">{policy.title}</h4>
                      <span className="rounded-pill bg-bg-sunken px-2 py-[2px] font-mono text-[11px] text-text-muted">
                        {policy.slug}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-text-secondary">{policy.content}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}

          {loadError ? (
            <div className="mt-6 rounded-card border border-border-default bg-bg-surface p-4 text-[13px] text-text-secondary">
              Could not load policies from the API. Please make sure FastAPI is running on port 8000.
            </div>
          ) : categories.length === 0 ? (
            <div className="mt-6 rounded-card border border-border-default bg-bg-surface p-5 text-[13px] text-text-muted">
              No policies match your current search.
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}






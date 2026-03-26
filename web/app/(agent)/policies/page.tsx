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
    policies.forEach((p) => {
      if (search) {
        const q = search.toLowerCase();
        const text = `${p.title} ${p.content} ${p.slug}`.toLowerCase();
        if (!text.includes(q)) return;
      }
      if (!byCat[p.category]) byCat[p.category] = [];
      byCat[p.category].push(p);
    });
    return byCat;
  }, [policies, search]);

  const categories = Object.keys(grouped).sort();

  return (
    <AppShell role="approver" title="Policies">
      <div className="mx-auto flex max-w-[1120px] gap-8">
        <aside className="sticky top-[88px] hidden h-fit w-[220px] shrink-0 border-r border-border-default pr-4 md:block">
          <div className="mb-3 text-[13px] font-medium text-text-secondary">Categories</div>
          <nav className="flex flex-col gap-2 text-[13px]">
            {categories.map((cat) => (
              <a key={cat} href={`#${cat}`} className="text-text-secondary hover:text-text-primary">
                {CATEGORY_LABELS[cat] ?? cat}
              </a>
            ))}
          </nav>
        </aside>

        <div className="flex-1">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[24px] font-bold">Policies</div>
              <div className="mt-1 text-[13px] text-text-secondary">Read-only policy registry for ROAR Engine.</div>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search policies..."
              className="h-10 w-full max-w-[260px] rounded-input border border-border-default bg-bg-sunken px-3 text-[15px] text-text-primary placeholder:text-text-muted focus:border-border-focus focus:border-2 focus:bg-bg-elevated focus:outline-none"
            />
          </div>

          {categories.map((cat) => (
            <section key={cat} id={cat} className="mb-8">
              <h2 className="mb-3 text-[17px] font-semibold text-text-primary">
                {CATEGORY_LABELS[cat] ?? cat}
              </h2>
              <div className="flex flex-col gap-4">
                {grouped[cat].map((p) => (
                  <article
                    key={p.id}
                    id={p.slug}
                    className="rounded-card border border-border-default bg-bg-surface p-4"
                  >
                    <h3 className="text-[15px] font-semibold text-text-primary">{p.title}</h3>
                    <div className="mt-1 font-mono text-[12px] text-text-muted">{p.slug}</div>
                    <p className="mt-3 whitespace-pre-line text-[15px] text-text-primary">{p.content}</p>
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
            <div className="mt-6 text-[13px] text-text-muted">No policies found.</div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
type EscalationSummary = {
  summary?: string;
  summary_paragraph?: string;
  key_facts?: string[];
  facts?: string[];
  escalation_reason?: string;
  recommended_action?: string;
  policies_relevant?: string[];
};

export function EscalationSummaryPanel({
  summary,
  policiesApplied,
  slasApplied,
}: {
  summary: EscalationSummary | null;
  policiesApplied?: string[] | null;
  slasApplied?: string[] | null;
}) {
  if (!summary) {
    return (
      <div className="rounded-card border border-border-default bg-bg-surface p-5">
        <div className="text-[13px] text-text-muted">No escalation summary yet.</div>
      </div>
    );
  }

  const facts = summary.key_facts ?? summary.facts ?? [];
  const policies = Array.from(new Set((summary.policies_relevant ?? policiesApplied ?? []).filter(Boolean)));
  const slas = Array.from(new Set((slasApplied ?? []).filter(Boolean)));

  return (
    <div className="rounded-card border border-border-default bg-bg-surface p-5">
      <div className="text-[17px] font-semibold">Escalation summary</div>
      <div className="mt-3 text-[15px] text-text-primary">
        {summary.summary ?? summary.summary_paragraph ?? '-'}
      </div>

      {facts.length ? (
        <div className="mt-4">
          <div className="text-[13px] text-text-secondary">Key facts</div>
          <ul className="mt-2 list-disc pl-5 text-[15px] text-text-primary">
            {facts.map((fact) => (
              <li key={fact} className="py-1">
                {fact}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summary.escalation_reason ? (
        <div className="mt-4">
          <div className="text-[13px] text-text-secondary">Escalation reason</div>
          <div className="mt-1 text-[15px] text-text-primary">{summary.escalation_reason}</div>
        </div>
      ) : null}

      {summary.recommended_action ? (
        <div className="mt-4">
          <div className="text-[13px] text-text-secondary">Recommended action</div>
          <div className="mt-1 text-[15px] text-text-primary">{summary.recommended_action}</div>
        </div>
      ) : null}

      {policies.length ? (
        <div className="mt-4">
          <div className="text-[13px] text-text-secondary">Policies applied</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {policies.map((slug) => (
              <span
                key={slug}
                className="rounded-pill border border-border-default bg-bg-sunken px-3 py-1 text-[12px] text-text-secondary"
              >
                {slug}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {slas.length ? (
        <div className="mt-4">
          <div className="text-[13px] text-text-secondary">SLAs applied</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {slas.map((slug) => (
              <span
                key={slug}
                className="rounded-pill border border-border-default bg-bg-sunken px-3 py-1 text-[12px] text-text-secondary"
              >
                {slug}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type ResolutionPlan = {
  resolution_type?: string;
  amount?: number | string | null;
  steps?: string[];
  actions?: string[];
  customer_message?: string;
};

export function ResolutionPlanPanel({
  plan,
}: {
  plan: ResolutionPlan | null;
}) {
  if (!plan) {
    return (
      <div className="rounded-card border border-border-default bg-bg-surface p-5">
        <div className="text-[13px] text-text-muted">No resolution plan yet.</div>
      </div>
    );
  }

  const steps = plan.steps ?? plan.actions ?? [];

  return (
    <div className="rounded-card border border-border-default bg-bg-surface p-5">
      <div className="text-[17px] font-semibold">Resolution plan</div>

      <div className="mt-4">
        <div className="text-[13px] text-text-secondary">Type</div>
        <div className="mt-1 text-[15px] text-text-primary">{plan.resolution_type ?? '-'}</div>
      </div>

      {plan.amount != null ? (
        <div className="mt-4">
          <div className="text-[13px] text-text-secondary">Amount</div>
          <div className="mt-1 text-[15px] text-text-primary">{String(plan.amount)}</div>
        </div>
      ) : null}

      <div className="mt-4">
        <div className="text-[13px] text-text-secondary">Steps</div>
        <ol className="mt-2 list-decimal pl-5 text-[15px] text-text-primary">
          {steps.length ? (
            steps.map((step) => (
              <li key={step} className="py-1">
                {step}
              </li>
            ))
          ) : (
            <li>-</li>
          )}
        </ol>
      </div>

      <div className="mt-4">
        <div className="text-[13px] text-text-secondary">Customer message</div>
        <div className="mt-2 rounded-input border border-border-default bg-bg-sunken p-3 text-[15px] text-text-primary">
          {plan.customer_message ?? '-'}
        </div>
      </div>
    </div>
  );
}

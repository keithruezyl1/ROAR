'use client';

import * as React from 'react';

import { EscalationSummaryPanel } from '@/components/dashboard/EscalationSummaryPanel';
import { CaseDetailsTab } from '@/components/escalation/CaseDetailsTab';
import { ActionsTab } from '@/components/escalation/ActionsTab';
import type { DisputeType, InformationBundle, TriageDecision } from '@/types';

type EscalationSummary = {
  summary?: string;
  summary_paragraph?: string;
  key_facts?: string[];
  facts?: string[];
  escalation_reason?: string;
  recommended_action?: string;
};

export type EscalationCaseData = {
  reference_number: string;
  dispute_type: DisputeType;
  status: string;
  order_id: string;
  customer_name: string;
  customer_email: string;
  information_bundle: InformationBundle | null;
  triage_decision: TriageDecision | null;
  escalation_summary: EscalationSummary | string | null;
};

type CloseReason = 'resolved' | 'unresponsive' | 'duplicate';

export function EscalationWorkPanel({
  caseId,
  caseData,
  onClose,
  onActionSuccess,
}: {
  caseId: string;
  caseData: EscalationCaseData;
  onClose: (reason: CloseReason) => Promise<void> | void;
  onActionSuccess: () => Promise<void> | void;
}) {
  const [tab, setTab] = React.useState<'summary' | 'details' | 'actions'>('actions');

  const safeParseSummary = React.useCallback((value: EscalationSummary | string | null) => {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value) as EscalationSummary;
    } catch {
      // WF4 sometimes stores a plain text summary instead of JSON.
      return { summary: value };
    }
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-border-default bg-bg-surface">
      <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
        <div className="text-[15px] font-semibold text-text-primary">Case Actions</div>
      </div>

      <div className="flex items-stretch gap-2 border-b border-border-default px-4 py-3">
        <button
          type="button"
          className={
            tab === 'summary'
              ? 'rounded-btn bg-primary-subtle px-3 py-2 text-[13px] font-medium text-text-primary'
              : 'rounded-btn px-3 py-2 text-[13px] font-medium text-text-secondary hover:bg-bg-sunken'
          }
          onClick={() => setTab('summary')}
        >
          Summary
        </button>
        <button
          type="button"
          className={
            tab === 'details'
              ? 'rounded-btn bg-primary-subtle px-3 py-2 text-[13px] font-medium text-text-primary'
              : 'rounded-btn px-3 py-2 text-[13px] font-medium text-text-secondary hover:bg-bg-sunken'
          }
          onClick={() => setTab('details')}
        >
          Details
        </button>
        <button
          type="button"
          className={
            tab === 'actions'
              ? 'rounded-btn bg-primary-subtle px-3 py-2 text-[13px] font-medium text-text-primary'
              : 'rounded-btn px-3 py-2 text-[13px] font-medium text-text-secondary hover:bg-bg-sunken'
          }
          onClick={() => setTab('actions')}
        >
          Actions
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === 'summary' ? (
          <EscalationSummaryPanel
            summary={safeParseSummary(caseData.escalation_summary)}
            policiesApplied={caseData.triage_decision?.policies_applied ?? null}
            slasApplied={caseData.triage_decision?.slas_applied ?? null}
          />
        ) : tab === 'details' ? (
          <CaseDetailsTab caseData={caseData} />
        ) : (
          <ActionsTab caseId={caseId} caseData={caseData} onClose={onClose} onActionSuccess={onActionSuccess} />
        )}
      </div>
    </div>
  );
}




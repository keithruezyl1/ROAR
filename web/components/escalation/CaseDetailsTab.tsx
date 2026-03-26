'use client';

import { DisputeTypeBadge } from '@/components/dashboard/DisputeTypeBadge';
import { CaseStatusPill } from '@/components/dashboard/CaseStatusPill';
import { InfoBundlePanel } from '@/components/dashboard/InfoBundlePanel';

import type { EscalationCaseData } from '@/components/escalation/EscalationWorkPanel';

export function CaseDetailsTab({ caseData }: { caseData: EscalationCaseData }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-card border border-border-default bg-bg-surface p-5">
        <div className="flex items-start justify-between gap-3">
          <DisputeTypeBadge disputeType={caseData.dispute_type} />
          <CaseStatusPill status={caseData.status} />
        </div>

        <div className="mt-4 font-mono text-[12px] text-text-secondary">{caseData.reference_number}</div>
        <div className="mt-2 text-[17px] font-semibold text-text-primary">{caseData.customer_name}</div>
        <div className="mt-1 text-[13px] text-text-secondary">Order {caseData.order_id}</div>
        <div className="mt-1 break-words text-[13px] text-text-secondary">{caseData.customer_email}</div>
      </div>

      <InfoBundlePanel bundle={caseData.information_bundle as Parameters<typeof InfoBundlePanel>[0]['bundle']} />
    </div>
  );
}



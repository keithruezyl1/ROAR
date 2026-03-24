'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api';
import { InfoBundlePanel } from '@/components/dashboard/InfoBundlePanel';
import { ResolutionPlanPanel } from '@/components/dashboard/ResolutionPlanPanel';
import { ApproveRejectBar } from '@/components/dashboard/ApproveRejectBar';
import { RejectionModal } from '@/components/dashboard/RejectionModal';

type CaseDetail = {
  reference_number: string;
  information_bundle: {
    order?: { order_id: string; status: string; total_amount: number | string } | null;
    order_items?: Array<{ item_id: string; item_name: string; quantity: number }>;
    transaction?: { status: string; amount: number | string; payment_method: string } | null;
    refund_records?: Array<Record<string, unknown>>;
    shipment?: {
      carrier: string;
      tracking_number: string;
      status: string;
      estimated_delivery: string;
    } | null;
    stock_records?: Array<{
      item_id: string;
      quantity_available: number | string;
      warehouse_location: string;
    }>;
  } | null;
  resolution_plan: {
    resolution_type?: string;
    amount?: number | string | null;
    steps?: string[];
    actions?: string[];
    customer_message?: string;
  } | null;
};

export default function ApproverCasePage({ params }: { params: { caseId: string } }) {
  const router = useRouter();
  const caseId = params.caseId;
  const [data, setData] = React.useState<CaseDetail | null>(null);
  const [loading, setLoading] = React.useState<'approve' | 'reject' | null>(null);
  const [rejectionOpen, setRejectionOpen] = React.useState(false);

  React.useEffect(() => {
    void api.get<CaseDetail>(`/cases/${caseId}`).then(setData);
  }, [caseId]);

  const approve = async () => {
    setLoading('approve');
    try {
      await api.post<unknown>(`/cases/${caseId}/approve`, {});
      router.push('/approver');
    } finally {
      setLoading(null);
    }
  };

  const reject = async (value: { reason: string; policyRefs: string[] }) => {
    setLoading('reject');
    try {
      await api.post<unknown>(`/cases/${caseId}/reject`, {
        reason: value.reason,
        policy_refs: value.policyRefs,
      });
      router.push(`/approver/${caseId}/chat`);
    } finally {
      setLoading(null);
      setRejectionOpen(false);
    }
  };

  const referenceNumber = data?.reference_number ?? 'CASE-';

  return (
    <AppShell role="approver" title={referenceNumber}>
      <div className="mb-4 text-[13px] text-text-secondary">
        <Link href="/approver" className="hover:underline">
          Dashboard
        </Link>{' '}
        <span className="text-text-muted">&gt;</span> {referenceNumber}
      </div>

      {data ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[3fr_2fr]">
          <div>
            <InfoBundlePanel bundle={data.information_bundle} />
          </div>
          <div className="flex flex-col">
            <ResolutionPlanPanel plan={data.resolution_plan} />
            <ApproveRejectBar
              referenceNumber={referenceNumber}
              loading={loading}
              onApprove={() => void approve()}
              onReject={() => setRejectionOpen(true)}
            />
          </div>
        </div>
      ) : (
        <div className="text-[13px] text-text-muted">Loading...</div>
      )}

      <RejectionModal
        open={rejectionOpen}
        onClose={() => setRejectionOpen(false)}
        onConfirm={reject}
      />
    </AppShell>
  );
}

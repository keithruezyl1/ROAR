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
import { PaymentHistoryCard } from '@/components/PaymentHistoryCard';
import { InventoryAvailabilityCard } from '@/components/InventoryAvailabilityCard';
import { TrackingTimeline } from '@/components/TrackingTimeline';
import { ReplacementRequestPanel } from '@/components/dashboard/ReplacementRequestPanel';

type CaseDetail = {
  reference_number: string;
  dispute_type?: string;
  resolution_preference?: 'refund' | 'replacement' | 'return' | null;
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

    // Enhanced demo bundle keys (used by the new approver UI cards)
    payment_records?: Array<{
      transaction_id: string;
      transaction_type: 'payment' | 'refund';
      amount: number;
      status: string;
      payment_method: string;
      transaction_date: string;
    }>;
    tracking_events?: Array<{
      event_type: string;
      location: string;
      event_time: string;
    }>;
    order_items_detail?: Array<{
      item_id: string;
      item_name?: string;
      product_name?: string;
      quantity_ordered: number;
      unit_price: number;
      quantity_available_now?: number;
      warehouse_location?: string;
    }>;
    shipment_data?: { status?: string } | null;
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
  const informationBundle = data?.information_bundle;
  const resolutionType = String(
    data?.resolution_plan?.resolution_type || data?.resolution_preference || ''
  ).toLowerCase();
  const showReplacementPanel = resolutionType === 'replacement';

  return (
    <AppShell role="approver" title={referenceNumber}>
      <div className="mb-4 text-[13px] text-text-secondary">
        <Link href="/approver" className="hover:underline">
          Dashboard
        </Link>{' '}
        <span className="text-text-muted">&gt;</span> {referenceNumber}
      </div>

      {data ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <InfoBundlePanel bundle={data.information_bundle} />

            <TrackingTimeline
              trackingEvents={informationBundle?.tracking_events || []}
              shipmentStatus={informationBundle?.shipment_data?.status}
            />
          </div>

          <div className="space-y-5">
            <ResolutionPlanPanel plan={data.resolution_plan} />

            <PaymentHistoryCard paymentRecords={informationBundle?.payment_records || []} />

            <InventoryAvailabilityCard
              orderItems={informationBundle?.order_items_detail || []}
              resolutionType={(data.resolution_plan?.resolution_type as 'refund' | 'replacement' | null | undefined) ?? null}
            />

            {showReplacementPanel ? <ReplacementRequestPanel caseId={caseId} /> : null}

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

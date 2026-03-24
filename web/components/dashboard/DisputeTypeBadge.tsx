export function DisputeTypeBadge({ disputeType }: { disputeType: 'refund' | 'delivery' }) {
  if (disputeType === 'refund') {
    return (
      <span className="inline-flex items-center rounded-pill bg-primary-subtle px-2 py-[3px] text-[11px] font-medium text-primary">
        Refund
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-pill bg-info-bg px-2 py-[3px] text-[11px] font-medium text-info">
      Delivery
    </span>
  );
}

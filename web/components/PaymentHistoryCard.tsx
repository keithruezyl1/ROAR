import * as React from 'react';

type PaymentRecord = {
  transaction_id: string;
  transaction_type: 'payment' | 'refund';
  amount: number;
  status: string;
  payment_method: string;
  transaction_date: string;
};

export function PaymentHistoryCard({ paymentRecords }: { paymentRecords: PaymentRecord[] }) {
  const payments = paymentRecords.filter((p) => p.transaction_type === 'payment');
  const refunds = paymentRecords.filter((p) => p.transaction_type === 'refund');

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalRefunded = refunds.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="rounded-card border border-border-default bg-bg-surface p-5">
      <h3 className="text-base font-semibold text-text-primary mb-4">Payment History</h3>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-border-default">
        <div>
          <p className="text-xs text-text-secondary mb-1">Total Paid</p>
          <p className="text-lg font-semibold text-text-primary">฿{totalPaid.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary mb-1">Total Refunded</p>
          <p
            className={`text-lg font-semibold ${
              refunds.length > 0 ? 'text-danger' : 'text-text-muted'
            }`}
          >
            ฿{totalRefunded.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        {paymentRecords.length === 0 ? (
          <p className="text-sm text-text-muted italic">No payment records found</p>
        ) : (
          paymentRecords.map((record, idx) => {
            const pillBg = record.transaction_type === 'refund' ? 'bg-danger-bg text-danger' : 'bg-success-bg text-success';
            const pillLabel = record.transaction_type === 'refund' ? 'Refund' : 'Payment';
            const rowBg =
              record.transaction_type === 'refund' ? 'border-danger bg-danger-bg' : 'border-border-default bg-bg-sunken';
            const amountClass = record.transaction_type === 'refund' ? 'text-danger' : 'text-text-primary';

            return (
              <div
                key={record.transaction_id || String(idx)}
                className={`flex items-center justify-between p-3 rounded-input border ${rowBg}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium uppercase tracking-wide px-2 py-1 rounded-pill ${pillBg}`}>
                      {pillLabel}
                    </span>
                    <span className="text-xs text-text-muted font-mono truncate">{record.transaction_id}</span>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">
                    {record.payment_method} •{' '}
                    {new Date(record.transaction_date).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${amountClass}`}>
                    {record.transaction_type === 'refund' ? '-' : ''}฿{record.amount.toFixed(2)}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-text-secondary">
                    {record.status}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Prior Refund Warning */}
      {refunds.length > 0 ? (
        <div className="mt-4 p-3 bg-danger-bg border border-danger rounded-input">
          <p className="text-sm font-medium text-danger">Prior Refund Alert</p>
          <p className="text-xs text-text-secondary mt-1">
            {refunds.length} refund{refunds.length > 1 ? 's' : ''} already processed for this order. Verify with customer before approving additional refunds.
          </p>
        </div>
      ) : null}
    </div>
  );
}


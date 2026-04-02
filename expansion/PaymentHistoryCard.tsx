// web/components/PaymentHistoryCard.tsx
// Shows payment history for a case, highlighting prior refunds

import React from 'react';

interface PaymentRecord {
  transaction_id: string;
  transaction_type: 'payment' | 'refund';
  amount: number;
  status: string;
  payment_method: string;
  transaction_date: string;
}

interface PaymentHistoryCardProps {
  paymentRecords: PaymentRecord[];
}

export function PaymentHistoryCard({ paymentRecords }: PaymentHistoryCardProps) {
  const payments = paymentRecords.filter(p => p.transaction_type === 'payment');
  const refunds = paymentRecords.filter(p => p.transaction_type === 'refund');
  
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalRefunded = refunds.reduce((sum, p) => sum + p.amount, 0);
  
  return (
    <div className="bg-surface border border-default rounded-card p-5">
      <h3 className="text-base font-semibold text-primary mb-4">Payment History</h3>
      
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b border-default">
        <div>
          <p className="text-xs text-secondary mb-1">Total Paid</p>
          <p className="text-lg font-semibold text-primary">฿{totalPaid.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-secondary mb-1">Total Refunded</p>
          <p className={`text-lg font-semibold ${refunds.length > 0 ? 'text-danger' : 'text-muted'}`}>
            ฿{totalRefunded.toFixed(2)}
          </p>
        </div>
      </div>
      
      {/* Transaction List */}
      <div className="space-y-2">
        {paymentRecords.length === 0 ? (
          <p className="text-sm text-muted italic">No payment records found</p>
        ) : (
          paymentRecords.map((record) => (
            <div 
              key={record.transaction_id}
              className={`flex items-center justify-between p-3 rounded-input border ${
                record.transaction_type === 'refund' 
                  ? 'border-danger bg-danger-bg' 
                  : 'border-default bg-sunken'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium uppercase tracking-wide px-2 py-1 rounded-pill ${
                    record.transaction_type === 'payment'
                      ? 'bg-success-bg text-success'
                      : 'bg-danger-bg text-danger'
                  }`}>
                    {record.transaction_type === 'payment' ? '↓ Payment' : '↩ Refund'}
                  </span>
                  <span className="text-xs text-muted font-mono">{record.transaction_id}</span>
                </div>
                <p className="text-xs text-secondary mt-1">
                  {record.payment_method} • {new Date(record.transaction_date).toLocaleString('en-GB', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-semibold ${
                  record.transaction_type === 'refund' ? 'text-danger' : 'text-primary'
                }`}>
                  {record.transaction_type === 'refund' ? '-' : ''}฿{record.amount.toFixed(2)}
                </p>
                <p className={`text-xs uppercase tracking-wide ${
                  record.status === 'completed' ? 'text-success' : 'text-warning'
                }`}>
                  {record.status}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Prior Refund Warning */}
      {refunds.length > 0 && (
        <div className="mt-4 p-3 bg-danger-bg border border-danger rounded-input">
          <p className="text-sm font-medium text-danger">⚠️ Prior Refund Alert</p>
          <p className="text-xs text-secondary mt-1">
            {refunds.length} refund{refunds.length > 1 ? 's' : ''} already processed for this order. 
            Verify with customer before approving additional refunds.
          </p>
        </div>
      )}
    </div>
  );
}

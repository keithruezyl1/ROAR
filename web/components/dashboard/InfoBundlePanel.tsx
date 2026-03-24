'use client';

import * as React from 'react';
import clsx from 'clsx';

type OrderRecord = {
  order_id: string;
  status: string;
  total_amount: number | string;
};

type OrderItemRecord = {
  item_id: string;
  item_name: string;
  quantity: number;
};

type TransactionRecord = {
  status: string;
  amount: number | string;
  payment_method: string;
};

type RefundRecord = Record<string, unknown>;

type ShipmentRecord = {
  carrier: string;
  tracking_number: string;
  status: string;
  estimated_delivery: string;
};

type StockRecord = {
  item_id: string;
  quantity_available: number | string;
  warehouse_location: string;
};

type InformationBundle = {
  order?: OrderRecord | null;
  order_items?: OrderItemRecord[];
  transaction?: TransactionRecord | null;
  refund_records?: RefundRecord[];
  shipment?: ShipmentRecord | null;
  stock_records?: StockRecord[];
};

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2">
      <div className="text-[13px] text-text-secondary">{label}</div>
      <div className={clsx('col-span-2 text-[15px] text-text-primary', danger && 'text-danger')}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);

  return (
    <div className="rounded-card border border-border-default bg-bg-surface">
      <button
        type="button"
        className="flex w-full items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="text-[15px] font-medium text-text-primary">{title}</div>
        <div className="text-[13px] text-text-muted">{open ? 'Hide' : 'Show'}</div>
      </button>
      {open ? <div className="border-t border-border-default px-5 py-3">{children}</div> : null}
    </div>
  );
}

export function InfoBundlePanel({ bundle }: { bundle: InformationBundle | null | undefined }) {
  const oms = bundle?.order;
  const items = bundle?.order_items ?? [];
  const payment = bundle?.transaction;
  const refunds = bundle?.refund_records ?? [];
  const shipment = bundle?.shipment;
  const stock = bundle?.stock_records ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Section title="OMS">
        {oms ? (
          <>
            <Row label="Order ID" value={oms.order_id} />
            <Row label="Status" value={oms.status} />
            <Row label="Total" value={String(oms.total_amount)} />
            <Row
              label="Items"
              value={items.map((item) => `${item.item_name} x${item.quantity}`).join(', ') || 'None'}
            />
          </>
        ) : (
          <div className="text-[13px] text-text-muted">No OMS data.</div>
        )}
      </Section>

      <Section title="Payment">
        {payment ? (
          <>
            <Row label="Status" value={payment.status} danger={payment.status !== 'confirmed'} />
            <Row label="Amount" value={String(payment.amount)} />
            <Row label="Method" value={payment.payment_method} />
            <Row
              label="Refunds"
              value={refunds.length ? `${refunds.length} record(s)` : 'None'}
              danger={refunds.length > 0}
            />
          </>
        ) : (
          <div className="text-[13px] text-text-muted">No payment data.</div>
        )}
      </Section>

      <Section title="Logistics">
        {shipment ? (
          <>
            <Row label="Carrier" value={shipment.carrier} />
            <Row label="Tracking" value={shipment.tracking_number} />
            <Row
              label="Status"
              value={shipment.status}
              danger={shipment.status === 'lost' || shipment.status === 'failed'}
            />
            <Row label="EDD" value={String(shipment.estimated_delivery)} />
          </>
        ) : (
          <div className="text-[13px] text-text-muted">No shipment data.</div>
        )}
      </Section>

      <Section title="Inventory">
        {stock.length ? (
          <>
            {stock.map((record) => (
              <Row
                key={record.item_id}
                label={record.item_id}
                value={`${record.quantity_available} @ ${record.warehouse_location}`}
              />
            ))}
          </>
        ) : (
          <div className="text-[13px] text-text-muted">No inventory data.</div>
        )}
      </Section>
    </div>
  );
}

import * as React from 'react';

type OrderItem = {
  item_id: string;
  item_name?: string;
  product_name?: string;
  quantity_ordered: number;
  unit_price: number;
  quantity_available_now?: number;
  warehouse_location?: string;
};

export function InventoryAvailabilityCard({
  orderItems,
  resolutionType,
}: {
  orderItems: OrderItem[];
  resolutionType?: 'refund' | 'replacement' | null;
}) {
  // Only show this card if replacement is the chosen path.
  if (!resolutionType || resolutionType !== 'replacement') return null;

  const allInStock = orderItems.every((item) => (item.quantity_available_now ?? 0) >= item.quantity_ordered);

  return (
    <div className="rounded-card border border-border-default bg-bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-text-primary">Inventory Availability</h3>
        <span
          className={`text-xs font-medium uppercase tracking-wide px-3 py-1.5 rounded-pill ${
            allInStock ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'
          }`}
        >
          {allInStock ? 'All in Stock' : 'Limited Stock'}
        </span>
      </div>

      <div className="space-y-3">
        {orderItems.map((item) => {
          const isAvailable = (item.quantity_available_now ?? 0) >= item.quantity_ordered;
          const stockPercentage =
            item.quantity_available_now ? Math.min(((item.quantity_available_now / item.quantity_ordered) * 100) || 0, 100) : 0;
          const displayName = item.product_name ?? item.item_name ?? item.item_id;

          return (
            <div key={item.item_id} className="p-3 bg-bg-sunken border border-border-default rounded-input">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{displayName}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Ordered: {item.quantity_ordered} unit{item.quantity_ordered > 1 ? 's' : ''}
                    {item.warehouse_location ? ` • ${item.warehouse_location}` : null}
                  </p>
                </div>
                <p className="text-sm font-mono text-text-muted">฿{item.unit_price.toFixed(2)}</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">Available Stock</span>
                  <span className={`font-medium ${isAvailable ? 'text-success' : 'text-danger'}`}>
                    {item.quantity_available_now !== undefined ? `${item.quantity_available_now} units` : 'Unknown'}
                  </span>
                </div>

                {item.quantity_available_now !== undefined ? (
                  <div className="w-full bg-border-default h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${isAvailable ? 'bg-success' : 'bg-danger'}`}
                      style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                    />
                  </div>
                ) : null}
              </div>

              {!isAvailable ? (
                <p className="text-xs text-danger mt-2">
                  Insufficient stock for replacement - only {item.quantity_available_now ?? 0} available
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <div
        className={`mt-4 p-3 rounded-input border ${
          allInStock ? 'bg-success-bg border-success' : 'bg-warning-bg border-warning'
        }`}
      >
        <p className="text-sm font-medium">
          {allInStock ? 'Replacement can be fulfilled immediately' : 'Replacement may require additional sourcing or alternate resolution'}
        </p>
      </div>
    </div>
  );
}


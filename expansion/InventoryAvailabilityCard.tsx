// web/components/InventoryAvailabilityCard.tsx
// Shows stock status for order items, used when replacement is an option

import React from 'react';

interface OrderItem {
  item_id: string;
  product_name: string;
  quantity_ordered: number;
  unit_price: number;
  quantity_available_now?: number;
  warehouse_location?: string;
}

interface InventoryAvailabilityCardProps {
  orderItems: OrderItem[];
  resolutionType?: 'refund' | 'replacement' | null;
}

export function InventoryAvailabilityCard({ 
  orderItems, 
  resolutionType 
}: InventoryAvailabilityCardProps) {
  // Only show this card if replacement is relevant
  if (!resolutionType || resolutionType !== 'replacement') {
    return null;
  }
  
  const allInStock = orderItems.every(item => 
    (item.quantity_available_now || 0) >= item.quantity_ordered
  );
  
  return (
    <div className="bg-surface border border-default rounded-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-primary">Inventory Availability</h3>
        <span className={`text-xs font-medium uppercase tracking-wide px-3 py-1.5 rounded-pill ${
          allInStock 
            ? 'bg-success-bg text-success' 
            : 'bg-warning-bg text-warning'
        }`}>
          {allInStock ? '✅ All in Stock' : '⚠️ Limited Stock'}
        </span>
      </div>
      
      <div className="space-y-3">
        {orderItems.map((item) => {
          const isAvailable = (item.quantity_available_now || 0) >= item.quantity_ordered;
          const stockPercentage = item.quantity_available_now 
            ? Math.min((item.quantity_available_now / item.quantity_ordered) * 100, 100)
            : 0;
          
          return (
            <div 
              key={item.item_id}
              className="p-3 bg-sunken border border-default rounded-input"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">{item.product_name}</p>
                  <p className="text-xs text-secondary mt-0.5">
                    Ordered: {item.quantity_ordered} unit{item.quantity_ordered > 1 ? 's' : ''}
                    {item.warehouse_location && ` • ${item.warehouse_location}`}
                  </p>
                </div>
                <p className="text-sm font-mono text-muted">฿{item.unit_price.toFixed(2)}</p>
              </div>
              
              {/* Stock Status Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-secondary">Available Stock</span>
                  <span className={`font-medium ${isAvailable ? 'text-success' : 'text-danger'}`}>
                    {item.quantity_available_now !== undefined 
                      ? `${item.quantity_available_now} units` 
                      : 'Unknown'}
                  </span>
                </div>
                
                {item.quantity_available_now !== undefined && (
                  <div className="w-full bg-border-default h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        isAvailable ? 'bg-success' : 'bg-danger'
                      }`}
                      style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                    />
                  </div>
                )}
              </div>
              
              {/* Warning if insufficient stock */}
              {!isAvailable && (
                <p className="text-xs text-danger mt-2">
                  ⚠️ Insufficient stock for replacement - only {item.quantity_available_now || 0} available
                </p>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Replacement Feasibility Summary */}
      <div className={`mt-4 p-3 rounded-input border ${
        allInStock 
          ? 'bg-success-bg border-success' 
          : 'bg-warning-bg border-warning'
      }`}>
        <p className="text-sm font-medium">
          {allInStock 
            ? '✅ Replacement order can be fulfilled immediately' 
            : '⚠️ Replacement may require additional sourcing or alternative resolution'}
        </p>
      </div>
    </div>
  );
}

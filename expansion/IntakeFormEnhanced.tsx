// web/app/customer/start-case/IntakeFormEnhanced.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { Search, Package, AlertCircle, RefreshCw } from 'lucide-react';

// Mock data - replace with actual API call
const MOCK_ORDERS = [
  { id: 'ORD-20099', amount: 380.00, items: 'Wireless Earbuds', status: 'fulfilled', date: '2026-03-18' },
  { id: 'ORD-10088', amount: 280.00, items: 'Blue Notebook Set', status: 'fulfilled', date: '2026-03-22' },
  { id: 'ORD-10042', amount: 320.00, items: 'Premium Coffee Set', status: 'fulfilled', date: '2026-03-14' },
];

// Dispute type mapping
const DISPUTE_OPTIONS = [
  {
    category: 'Delivery Issues',
    icon: '📦',
    options: [
      { 
        label: 'Package never arrived', 
        value: { type: 'delivery', subtype: 'non_receipt' },
        needsResolutionChoice: false
      },
      { 
        label: 'Delivery is late', 
        value: { type: 'delivery', subtype: 'delayed' },
        needsResolutionChoice: false
      },
      { 
        label: 'Wrong delivery address', 
        value: { type: 'delivery', subtype: 'wrong_address' },
        needsResolutionChoice: false
      },
    ]
  },
  {
    category: 'Product Issues',
    icon: '💔',
    options: [
      { 
        label: 'Received damaged item', 
        value: { type: 'refund', subtype: 'damaged_goods' },
        needsResolutionChoice: true
      },
      { 
        label: 'Received wrong item', 
        value: { type: 'refund', subtype: 'wrong_item' },
        needsResolutionChoice: true
      },
      { 
        label: "Item doesn't match description", 
        value: { type: 'refund', subtype: 'not_as_described' },
        needsResolutionChoice: true
      },
      { 
        label: 'Quality not as expected', 
        value: { type: 'refund', subtype: 'quality_issue' },
        needsResolutionChoice: true
      },
    ]
  },
  {
    category: 'Order Issues',
    icon: '📋',
    options: [
      { 
        label: 'Missing items (partial delivery)', 
        value: { type: 'refund', subtype: 'partial_fulfillment' },
        needsResolutionChoice: false
      },
      { 
        label: 'Duplicate charge', 
        value: { type: 'refund', subtype: 'duplicate_charge' },
        needsResolutionChoice: false
      },
      { 
        label: 'Want to return for refund', 
        value: { type: 'refund', subtype: 'return_request' },
        needsResolutionChoice: false
      },
    ]
  },
];

export function IntakeFormEnhanced() {
  const [step, setStep] = useState<'order' | 'issue' | 'resolution' | 'confirm'>('order');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<typeof MOCK_ORDERS[0] | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<{ type: string; subtype: string; label: string; needsResolution: boolean } | null>(null);
  const [resolutionPreference, setResolutionPreference] = useState<'refund' | 'replacement' | null>(null);
  const [issueDropdownOpen, setIssueDropdownOpen] = useState(false);

  // Filter orders by search query
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return MOCK_ORDERS;
    const query = searchQuery.toLowerCase();
    return MOCK_ORDERS.filter(order => 
      order.id.toLowerCase().includes(query) ||
      order.items.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleOrderSelect = (order: typeof MOCK_ORDERS[0]) => {
    setSelectedOrder(order);
    setStep('issue');
  };

  const handleIssueSelect = (option: typeof DISPUTE_OPTIONS[0]['options'][0]) => {
    setSelectedIssue({
      type: option.value.type,
      subtype: option.value.subtype,
      label: option.label,
      needsResolution: option.needsResolutionChoice
    });
    setIssueDropdownOpen(false);
    
    if (option.needsResolutionChoice) {
      setStep('resolution');
    } else {
      setStep('confirm');
      setResolutionPreference(null); // Auto-set to refund for non-choice cases
    }
  };

  const handleSubmit = async () => {
    if (!selectedOrder || !selectedIssue) return;

    const payload = {
      order_id: selectedOrder.id,
      dispute_type: selectedIssue.type,
      dispute_subtype: selectedIssue.subtype,
      resolution_preference: resolutionPreference,
      customer_name: 'Demo Customer', // TODO: Get from auth
      customer_email: 'demo@customer.com',
      intake_message: `Issue: ${selectedIssue.label}`
    };

    console.log('Submitting case:', payload);
    // TODO: Call POST /cases API
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-surface border border-default rounded-card p-8">
        <h1 className="text-2xl font-semibold text-primary mb-2">Start a case</h1>
        <p className="text-secondary text-sm mb-8">Submit your dispute and chat with ROAR.</p>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          <div className={`h-1 flex-1 rounded-full ${step !== 'order' ? 'bg-primary' : 'bg-border-default'}`} />
          <div className={`h-1 flex-1 rounded-full ${step === 'resolution' || step === 'confirm' ? 'bg-primary' : 'bg-border-default'}`} />
          <div className={`h-1 flex-1 rounded-full ${step === 'confirm' ? 'bg-primary' : 'bg-border-default'}`} />
        </div>

        {/* Step 1: Order Selection */}
        {step === 'order' && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-secondary">Select your order</label>
            
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search by order ID or product..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-sunken border border-default rounded-input focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-primary placeholder:text-muted"
              />
            </div>

            {/* Order list */}
            <div className="border border-default rounded-input max-h-64 overflow-y-auto">
              {filteredOrders.length === 0 ? (
                <div className="p-4 text-center text-muted text-sm">No orders found</div>
              ) : (
                filteredOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => handleOrderSelect(order)}
                    className="w-full p-4 text-left hover:bg-primary-subtle transition-colors border-b border-default last:border-b-0 focus:outline-none focus:bg-primary-subtle"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-primary font-mono">{order.id}</p>
                        <p className="text-xs text-secondary mt-1">{order.items}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-primary">฿{order.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted mt-1">{order.date}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2: Issue Type */}
        {step === 'issue' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('order')}
              className="text-sm text-secondary hover:text-primary mb-2"
            >
              ← Change order
            </button>

            <div className="p-4 bg-sunken rounded-input border border-default">
              <p className="text-xs text-secondary">Selected order</p>
              <p className="text-sm font-medium text-primary font-mono mt-1">{selectedOrder?.id}</p>
              <p className="text-xs text-muted mt-1">{selectedOrder?.items} • ฿{selectedOrder?.amount.toFixed(2)}</p>
            </div>

            <label className="block text-sm font-medium text-secondary">What went wrong?</label>

            {/* Categorized issue dropdown */}
            <div className="relative">
              <button
                onClick={() => setIssueDropdownOpen(!issueDropdownOpen)}
                className="w-full p-3 bg-sunken border border-default rounded-input text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <span className={selectedIssue ? 'text-primary' : 'text-muted'}>
                  {selectedIssue ? selectedIssue.label : 'Select an issue...'}
                </span>
                <span className="text-muted">▼</span>
              </button>

              {issueDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-elevated border border-default rounded-input shadow-lg max-h-96 overflow-y-auto">
                  {DISPUTE_OPTIONS.map((category) => (
                    <div key={category.category}>
                      <div className="px-4 py-2 bg-sunken border-b border-default">
                        <p className="text-xs font-medium text-secondary uppercase tracking-wide">
                          {category.icon} {category.category}
                        </p>
                      </div>
                      {category.options.map((option) => (
                        <button
                          key={option.label}
                          onClick={() => handleIssueSelect(option)}
                          className="w-full px-4 py-3 text-left text-sm text-primary hover:bg-primary-subtle transition-colors border-b border-default last:border-b-0 focus:outline-none focus:bg-primary-subtle"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Resolution Preference */}
        {step === 'resolution' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('issue')}
              className="text-sm text-secondary hover:text-primary mb-2"
            >
              ← Change issue
            </button>

            <div className="p-4 bg-sunken rounded-input border border-default">
              <p className="text-xs text-secondary">Issue</p>
              <p className="text-sm font-medium text-primary mt-1">{selectedIssue?.label}</p>
            </div>

            <label className="block text-sm font-medium text-secondary">How would you like us to resolve this?</label>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setResolutionPreference('replacement');
                  setStep('confirm');
                }}
                className={`w-full p-4 border-2 rounded-input text-left transition-all ${
                  resolutionPreference === 'replacement'
                    ? 'border-primary bg-primary-subtle'
                    : 'border-default hover:border-primary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-primary">Send me a replacement</p>
                    <p className="text-xs text-secondary mt-1">We'll ship a new item to you</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  setResolutionPreference('refund');
                  setStep('confirm');
                }}
                className={`w-full p-4 border-2 rounded-input text-left transition-all ${
                  resolutionPreference === 'refund'
                    ? 'border-primary bg-primary-subtle'
                    : 'border-default hover:border-primary'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-primary">Refund my payment</p>
                    <p className="text-xs text-secondary mt-1">Get your money back</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="p-4 bg-sunken rounded-input border border-default">
                <p className="text-xs text-secondary">Order</p>
                <p className="text-sm font-medium text-primary font-mono mt-1">{selectedOrder?.id}</p>
                <p className="text-xs text-muted mt-1">{selectedOrder?.items} • ฿{selectedOrder?.amount.toFixed(2)}</p>
              </div>

              <div className="p-4 bg-sunken rounded-input border border-default">
                <p className="text-xs text-secondary">Issue</p>
                <p className="text-sm font-medium text-primary mt-1">{selectedIssue?.label}</p>
              </div>

              {resolutionPreference && (
                <div className="p-4 bg-sunken rounded-input border border-default">
                  <p className="text-xs text-secondary">Resolution</p>
                  <p className="text-sm font-medium text-primary mt-1">
                    {resolutionPreference === 'replacement' ? 'Replacement' : 'Refund'}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('issue')}
                className="flex-1 py-3 border border-default rounded-btn text-sm font-medium text-secondary hover:bg-sunken transition-colors"
              >
                Go back
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-primary text-white rounded-btn text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                Submit case
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

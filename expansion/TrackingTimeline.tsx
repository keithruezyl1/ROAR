// web/components/TrackingTimeline.tsx
// Visual timeline of shipment tracking events

import React from 'react';

interface TrackingEvent {
  event_type: string;
  location: string;
  event_time: string;
}

interface TrackingTimelineProps {
  trackingEvents: TrackingEvent[];
  shipmentStatus?: string;
}

const EVENT_LABELS: Record<string, string> = {
  'picked_up': '📦 Picked Up',
  'in_transit': '🚚 In Transit',
  'delivered': '✅ Delivered',
  'exception': '⚠️ Exception',
  'delayed': '⏱️ Delayed',
  'returned': '↩️ Returned to Sender'
};

const EVENT_COLORS: Record<string, string> = {
  'picked_up': 'bg-info text-info-bg',
  'in_transit': 'bg-primary text-primary-subtle',
  'delivered': 'bg-success text-success-bg',
  'exception': 'bg-danger text-danger-bg',
  'delayed': 'bg-warning text-warning-bg',
  'returned': 'bg-danger text-danger-bg'
};

export function TrackingTimeline({ trackingEvents, shipmentStatus }: TrackingTimelineProps) {
  // Sort events chronologically
  const sortedEvents = [...trackingEvents].sort((a, b) => 
    new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
  );
  
  // Check for concerning patterns
  const hasException = sortedEvents.some(e => e.event_type === 'exception');
  const hasDelay = sortedEvents.some(e => e.event_type === 'delayed');
  const isDelivered = sortedEvents.some(e => e.event_type === 'delivered');
  
  return (
    <div className="bg-surface border border-default rounded-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-primary">Shipment Tracking</h3>
        {shipmentStatus && (
          <span className={`text-xs font-medium uppercase tracking-wide px-3 py-1.5 rounded-pill ${
            isDelivered 
              ? 'bg-success-bg text-success' 
              : hasException || hasDelay
              ? 'bg-danger-bg text-danger'
              : 'bg-info-bg text-info'
          }`}>
            {shipmentStatus.replace('_', ' ')}
          </span>
        )}
      </div>
      
      {sortedEvents.length === 0 ? (
        <p className="text-sm text-muted italic">No tracking events available</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border-default" />
          
          {/* Events */}
          <div className="space-y-4">
            {sortedEvents.map((event, index) => {
              const isLast = index === sortedEvents.length - 1;
              const eventLabel = EVENT_LABELS[event.event_type] || event.event_type;
              const eventColor = EVENT_COLORS[event.event_type] || 'bg-border-default text-secondary';
              
              return (
                <div key={index} className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${eventColor} border-2 border-bg-surface`}>
                    <div className="w-2 h-2 rounded-full bg-current" />
                  </div>
                  
                  {/* Event content */}
                  <div className={`flex-1 pb-4 ${!isLast ? 'border-b border-default' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-primary">{eventLabel}</p>
                      <p className="text-xs text-muted font-mono">
                        {new Date(event.event_time).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <p className="text-xs text-secondary">{event.location}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Alert for delivered but disputed */}
      {isDelivered && (
        <div className="mt-4 p-3 bg-warning-bg border border-warning rounded-input">
          <p className="text-sm font-medium text-warning">⚠️ Delivery Confirmation vs. Customer Report</p>
          <p className="text-xs text-secondary mt-1">
            Tracking shows delivered, but customer disputes receipt. Investigation may be required.
          </p>
        </div>
      )}
      
      {/* Alert for exceptions */}
      {(hasException || hasDelay) && !isDelivered && (
        <div className="mt-4 p-3 bg-danger-bg border border-danger rounded-input">
          <p className="text-sm font-medium text-danger">⚠️ Shipment Issues Detected</p>
          <p className="text-xs text-secondary mt-1">
            {hasException ? 'Carrier reported an exception. ' : ''}
            {hasDelay ? 'Shipment has been delayed. ' : ''}
            Consider autonomous refund approval.
          </p>
        </div>
      )}
    </div>
  );
}

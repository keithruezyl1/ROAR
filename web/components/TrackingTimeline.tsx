import * as React from 'react';

type TrackingEvent = {
  event_type: string;
  location: string;
  event_time: string;
};

export function TrackingTimeline({
  trackingEvents,
  shipmentStatus,
}: {
  trackingEvents: TrackingEvent[];
  shipmentStatus?: string;
}) {
  const sortedEvents = [...trackingEvents].sort(
    (a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime(),
  );

  const hasException = sortedEvents.some((e) => e.event_type === 'exception');
  const hasDelay = sortedEvents.some((e) => e.event_type === 'delayed');
  const isDelivered = sortedEvents.some((e) => e.event_type === 'delivered');

  const EVENT_LABELS: Record<string, string> = {
    picked_up: 'Picked Up',
    in_transit: 'In Transit',
    delivered: 'Delivered',
    exception: 'Exception',
    delayed: 'Delayed',
    returned: 'Returned to Sender',
  };

  const EVENT_COLORS: Record<string, string> = {
    picked_up: 'bg-info-bg text-info',
    in_transit: 'bg-primary-subtle text-primary',
    delivered: 'bg-success-bg text-success',
    exception: 'bg-danger-bg text-danger',
    delayed: 'bg-warning-bg text-warning',
    returned: 'bg-danger-bg text-danger',
  };

  return (
    <div className="rounded-card border border-border-default bg-bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-text-primary">Shipment Tracking</h3>
        {shipmentStatus ? (
          <span
            className={`text-xs font-medium uppercase tracking-wide px-3 py-1.5 rounded-pill ${
              isDelivered
                ? 'bg-success-bg text-success'
                : hasException || hasDelay
                  ? 'bg-danger-bg text-danger'
                  : 'bg-info-bg text-info'
            }`}
          >
            {shipmentStatus.replace('_', ' ')}
          </span>
        ) : null}
      </div>

      {sortedEvents.length === 0 ? (
        <p className="text-sm text-text-muted italic">No tracking events available</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border-default" />

          {/* Events */}
          <div className="space-y-4">
            {sortedEvents.map((event, index) => {
              const isLast = index === sortedEvents.length - 1;
              const eventLabel = EVENT_LABELS[event.event_type] ?? event.event_type;
              const eventColor = EVENT_COLORS[event.event_type] ?? 'bg-bg-sunken text-text-muted';

              return (
                <div key={`${event.event_time}-${index}`} className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${eventColor} border-2 border-border-default`}>
                    <div className="w-2 h-2 rounded-full bg-current" />
                  </div>

                  {/* Event content */}
                  <div className={`flex-1 pb-4 ${!isLast ? 'border-b border-border-default' : ''}`}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-text-primary">{eventLabel}</p>
                      <p className="text-xs text-text-muted font-mono">
                        {new Date(event.event_time).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <p className="text-xs text-text-secondary">{event.location}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Alert for delivered but disputed */}
      {isDelivered ? (
        <div className="mt-4 p-3 bg-warning-bg border border-warning rounded-input">
          <p className="text-sm font-medium text-warning">Delivery confirmation vs. customer report</p>
          <p className="text-xs text-text-secondary mt-1">
            Tracking shows delivered, but a customer report indicates delivery may not have been received. Investigation may be required.
          </p>
        </div>
      ) : null}

      {/* Alert for exceptions/delay */}
      {hasException || hasDelay ? (
        <div className="mt-4 p-3 bg-danger-bg border border-danger rounded-input">
          <p className="text-sm font-medium text-danger">Shipment issues detected</p>
          <p className="text-xs text-text-secondary mt-1">
            {hasException ? 'Carrier exception detected. ' : ''}
            {hasDelay ? 'Shipment has been delayed. ' : ''}
            Consider autonomous refund approval.
          </p>
        </div>
      ) : null}
    </div>
  );
}


-- Simulated retail backend data sources

CREATE TABLE sim_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL UNIQUE,
    customer_email TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'fulfilled', 'returned', 'cancelled')),
    total_amount NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    fulfilled_at TIMESTAMPTZ
);

CREATE TABLE sim_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES sim_orders(order_id),
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL
);

CREATE TABLE sim_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES sim_orders(order_id),
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'pending', 'failed', 'refunded')),
    amount NUMERIC(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    transacted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sim_refund_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES sim_orders(order_id),
    amount NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
    refunded_at TIMESTAMPTZ
);

CREATE TABLE sim_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES sim_orders(order_id),
    carrier TEXT NOT NULL,
    tracking_number TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('in_transit', 'delayed', 'delivered', 'lost', 'failed')),
    estimated_delivery DATE NOT NULL,
    shipped_at TIMESTAMPTZ
);

CREATE TABLE sim_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL REFERENCES sim_shipments(id),
    event_type TEXT NOT NULL,
    location TEXT NOT NULL,
    event_time TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sim_stock_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id TEXT NOT NULL UNIQUE,
    item_name TEXT NOT NULL,
    quantity_available INTEGER NOT NULL,
    warehouse_location TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);


## WF2 — Data Retrieval Agent (02_data_retrieval.json)

## How to build this in n8n UI

### Step 1: Create workflow

Create a new workflow named exactly:

- **Workflow name**: `ROAR Workflow - Data Retrieval Agent`

### Step 2: Add nodes in order (N1–N10)

- **N1**: `Webhook Trigger` — type `Webhook`
- **N2**: `Route by Dispute Type` — type `Switch`
- **N3**: `Query OMS` — type `HTTP Request`
- **N4**: `Query Payment - Txn` — type `HTTP Request`
- **N5**: `Query Payment - Refunds` — type `HTTP Request`
- **N6**: `Query Logistics` — type `HTTP Request`
- **N7**: `Query Inventory` — type `HTTP Request`
- **N8**: `Assemble Bundle` — type `Code` (JavaScript)
- **N9**: `Update Case - Bundle` — type `HTTP Request`
- **N10**: `Trigger Triage` — type `HTTP Request`

### Step 3: Connect nodes (graph & branches)

- **Main spine**:
  - `N1 Webhook Trigger` → `N2 Route by Dispute Type`
- **Refund branch (dispute_type === "refund")**:
  - From `N2` refund branch → `N3 Query OMS`
  - `N3 Query OMS` → `N4 Query Payment - Txn`
  - `N4 Query Payment - Txn` → `N5 Query Payment - Refunds`
- **Delivery branch (dispute_type === "delivery")**:
  - From `N2` delivery branch → `N3 Query OMS`
  - `N3 Query OMS` → `N6 Query Logistics`
  - `N6 Query Logistics` → `N7 Query Inventory`
- **Merge into bundle assembly**:
  - All upstream data feeding `N8 Assemble Bundle` (use Merge or direct connections depending on layout; ensure N8 receives outputs from N3 and from any of N4/N5/N6/N7 that ran).
- **Finalize**:
  - `N8 Assemble Bundle` → `N9 Update Case - Bundle`
  - `N9 Update Case - Bundle` → `N10 Trigger Triage`

### Step 4: Credentials per node

- **Use credential `ROAR FastAPI`** (header `X-Webhook-Secret`) on:
  - `N1 Webhook Trigger` (Auth section)
  - `N3 Query OMS`
  - `N4 Query Payment - Txn`
  - `N5 Query Payment - Refunds`
  - `N6 Query Logistics`
  - `N7 Query Inventory`
  - `N10 Trigger Triage`
- **Use credential `ROAR FastAPI Bearer`** on:
  - `N9 Update Case - Bundle`
- This workflow does **not** use `ROAR OpenAI`.

### Step 5: System prompts

- **WF2 has no LLM nodes**. There is no system prompt to paste. All logic is HTTP + Code only.

## Node-by-node configuration

### N1 — Webhook Trigger

- **Name**: `Webhook Trigger`
- **Type**: `Webhook`
- **Purpose**: Entry point from FastAPI when WF1 has confirmed intent and is ready for data retrieval.
- **URL / Path**:
  - **Path**: `bundle-ready`
  - **Method**: `POST`
  - **Response mode**: `Last Node`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI`** (header auth with `X-Webhook-Secret`).
- **Expected request body** (from FastAPI):

```json
{
  "case_id": "uuid",
  "dispute_type": "refund",
  "order_id": "ORD-10042"
}
```

- **Response expectations**:
  - Webhook simply proxies the result from the last node (`N10 Trigger Triage`); typically a simple JSON acknowledgment from FastAPI.
- **Special settings**:
  - Leave `Response Data` as default (`Last Node`).

### N2 — Route by Dispute Type

- **Name**: `Route by Dispute Type`
- **Type**: `Switch`
- **Purpose**: Branch workflow logic based on dispute type (`refund` vs `delivery`) so only relevant sources are queried.
- **Property to check**:
  - `{{$json.body.dispute_type}}`
- **Conditions**:
  - **Case 1 (refund)**:
    - Operation: `Equals`
    - Value 1: `{{$json.body.dispute_type}}`
    - Value 2: `refund`
  - **Case 2 (delivery)**:
    - Operation: `Equals`
    - Value 1: `{{$json.body.dispute_type}}`
    - Value 2: `delivery`
- **Response expectations**:
  - Two branches: `refund` and `delivery`. There is no default branch used in WF2.

### N3 — Query OMS

- **Name**: `Query OMS`
- **Type**: `HTTP Request`
- **Purpose**: Retrieve order header and order items from FastAPI in a single joined response.
- **Method**: `GET`
- **URL**:
  - `http://localhost:8000/internal/sources/orders?order_id={{$json.body.order_id}}`
- **Headers**:
  - `X-Webhook-Secret: dev-webhook-secret`
  - `Accept: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI`**.
- **Body**:
  - None (GET request).
- **Response expectations**:
  - Returns a JSON object:

```json
{
  "order": { /* order record */ },
  "order_items": [ /* array of items */ ]
}
```

- **Special settings**:
  - Response format: `JSON`.
  - Keep `Continue On Fail` disabled (let failures surface and be handled upstream if needed).

### N4 — Query Payment - Txn

- **Name**: `Query Payment - Txn`
- **Type**: `HTTP Request`
- **Purpose**: For refund disputes, fetch the payment transaction record for the order.
- **Branches**:
  - Connect this node only from the `refund` branch of `N2`.
- **Method**: `GET`
- **URL**:
  - `http://localhost:8000/internal/sources/transactions?order_id={{$json.body.order_id}}`
- **Headers**:
  - `X-Webhook-Secret: dev-webhook-secret`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI`**.
- **Body**:
  - None (GET request).
- **Response expectations**:
  - Returns:

```json
{
  "transaction": { /* transaction record or null */ }
}
```

- **Special settings**:
  - Response format: `JSON`.

### N5 — Query Payment - Refunds

- **Name**: `Query Payment - Refunds`
- **Type**: `HTTP Request`
- **Purpose**: For refund disputes, fetch any prior refund records for the order.
- **Branches**:
  - Connect this node only from the `refund` branch (after `N4`).
- **Method**: `GET`
- **URL**:
  - `http://localhost:8000/internal/sources/refunds?order_id={{$json.body.order_id}}`
- **Headers**:
  - `X-Webhook-Secret: dev-webhook-secret`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI`**.
- **Body**:
  - None (GET request).
- **Response expectations**:

```json
{
  "refund_records": [ /* zero or more refund records */ ]
}
```

- **Special settings**:
  - Response format: `JSON`.

### N6 — Query Logistics

- **Name**: `Query Logistics`
- **Type**: `HTTP Request`
- **Purpose**: For delivery disputes, fetch shipment and tracking events for the order.
- **Branches**:
  - Connect this node only from the `delivery` branch of `N2`.
- **Method**: `GET`
- **URL**:
  - `http://localhost:8000/internal/sources/shipments?order_id={{$json.body.order_id}}`
- **Headers**:
  - `X-Webhook-Secret: dev-webhook-secret`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI`**.
- **Body**:
  - None (GET request).
- **Response expectations**:

```json
{
  "shipment": { /* shipment record or null */ },
  "tracking_events": [ /* array of events */ ]
}
```

- **Special settings**:
  - Response format: `JSON`.

### N7 — Query Inventory

- **Name**: `Query Inventory`
- **Type**: `HTTP Request`
- **Purpose**: For delivery disputes, fetch current inventory records for all ordered items.
- **Branches**:
  - Connect this node only from `N6 Query Logistics` (delivery branch).
- **Method**: `GET`
- **URL**:
  - Build `item_ids` CSV from `N3` output, for example via expression:
  - `http://localhost:8000/internal/sources/inventory?item_ids={{$items("Query OMS")[0].json.order_items.map(i => i.item_id).join(",")}}`
- **Headers**:
  - `X-Webhook-Secret: dev-webhook-secret`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI`**.
- **Body**:
  - None (GET request).
- **Response expectations**:

```json
{
  "stock_records": [ /* inventory records */ ]
}
```

- **Special settings**:
  - Response format: `JSON`.

### N8 — Assemble Bundle

- **Name**: `Assemble Bundle`
- **Type**: `Code` (JavaScript)
- **Purpose**: Merge all queried data into a single `information_bundle` object on a per-execution basis.
- **Inputs**:
  - Must receive data from:
    - `N3 Query OMS` (always)
    - `N4 Query Payment - Txn` and `N5 Query Payment - Refunds` **or**
    - `N6 Query Logistics` and `N7 Query Inventory`
- **Body template (example)**:

```javascript
const oms = $items('Query OMS')[0].json;
const paymentTxnItems = $items('Query Payment - Txn');
const refundsItems = $items('Query Payment - Refunds');
const logisticsItems = $items('Query Logistics');
const inventoryItems = $items('Query Inventory');

const transaction = paymentTxnItems.length ? paymentTxnItems[0].json.transaction : null;
const refund_records = refundsItems.length ? refundsItems[0].json.refund_records : null;
const shipment = logisticsItems.length ? logisticsItems[0].json.shipment : null;
const tracking_events = logisticsItems.length ? logisticsItems[0].json.tracking_events : null;
const stock_records = inventoryItems.length ? inventoryItems[0].json.stock_records : null;

const input = $json.body || $json;

const bundle = {
  order: oms.order ?? null,
  order_items: oms.order_items ?? [],
  transaction,
  refund_records,
  shipment,
  tracking_events,
  stock_records,
  dispute_type: input.dispute_type,
  queried_at: new Date().toISOString()
};

return [{
  json: {
    case_id: input.case_id,
    dispute_type: input.dispute_type,
    information_bundle: bundle
  }
}];
```

- **Response expectations**:
  - Emits a single item with:

```json
{
  "case_id": "uuid",
  "dispute_type": "refund",
  "information_bundle": {
    "order": {},
    "order_items": [],
    "transaction": null,
    "refund_records": null,
    "shipment": null,
    "tracking_events": null,
    "stock_records": null,
    "dispute_type": "refund",
    "queried_at": "ISO-8601 timestamp"
  }
}
```

- **Special settings**:
  - Language: JavaScript.
  - Do not throw on missing data; set missing sections to `null` or empty arrays as above.

### N9 — Update Case - Bundle

- **Name**: `Update Case - Bundle`
- **Type**: `HTTP Request`
- **Purpose**: Persist the assembled `information_bundle` to the case in FastAPI.
- **Method**: `PATCH`
- **URL**:
  - `http://localhost:8000/cases/{{$json.case_id}}`
- **Headers**:
  - `Content-Type: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI Bearer`**.
- **Body template (JSON)**:

```json
{
  "information_bundle": {{$json.information_bundle}}
}
```

- **Response expectations**:
  - Returns the updated case record, including `information_bundle`.
- **Special settings**:
  - Response format: `JSON`.

### N10 — Trigger Triage

- **Name**: `Trigger Triage`
- **Type**: `HTTP Request`
- **Purpose**: Notify FastAPI that the information bundle is ready and trigger WF3 (Triage Agent) via webhook.
- **Method**: `POST`
- **URL**:
  - `http://localhost:8000/webhooks/triage-complete`
- **Headers**:
  - `X-Webhook-Secret: dev-webhook-secret`
  - `Content-Type: application/json`
- **Auth / Credential**:
  - Use credential **`ROAR FastAPI`**.
- **Body template (JSON)**:

```json
{
  "case_id": "{{$json.case_id}}",
  "dispute_type": "{{$json.dispute_type}}"
}
```

- **Response expectations**:
  - Typically `{ "ok": true }` or similar acknowledgment from FastAPI.
- **Special settings**:
  - You may enable `Continue On Fail` if you want WF2 to succeed even when the triage webhook fails; by default, leave disabled so failures surface clearly.

## Branching & connections summary

- **Switch branches (N2)**:
  - `N2 (Route by Dispute Type)` routes:
    - `dispute_type === "refund"` → `N3 Query OMS` → `N4 Query Payment - Txn` → `N5 Query Payment - Refunds` → `N8 Assemble Bundle`
    - `dispute_type === "delivery"` → `N3 Query OMS` → `N6 Query Logistics` → `N7 Query Inventory` → `N8 Assemble Bundle`
- **Top-level flow**:
  - `N1 Webhook Trigger` → `N2 Route by Dispute Type` → (refund/delivery branch as above) → `N8 Assemble Bundle` → `N9 Update Case - Bundle` → `N10 Trigger Triage`

## System prompts

- **This workflow has no system prompts.**
  - There are no OpenAI Chat Model nodes in WF2.
  - All logic is implemented with HTTP Request and Code nodes as per `ROAR_n8n_Spec_v2.1 §6` and `§10.2–10.3`.


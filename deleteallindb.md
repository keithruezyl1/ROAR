TRUNCATE TABLE
  case_reports,
  refund_requests,
  return_requests,
  chat_messages,
  cases
RESTART IDENTITY CASCADE;

trigger WF1:
curl -s -X POST "http://192.168.1.52:8000/cases" ^
  -H "Content-Type: application/json" ^
  -d "{\"order_id\":\"ORD-10042\",\"dispute_type\":\"refund\",\"customer_name\":\"Jane Doe\",\"customer_email\":\"customer@demo.com\",\"intake_message\":\"I was charged but I want to return my order and get a refund.\"}"

trigger WF2:
curl -X POST "http://localhost:5678/webhook/bundle-ready" ^
  -H "Content-Type: application/json" ^
  -H "X-Webhook-Secret: dev-webhook-secret-change-in-production" ^
  -d "{\"case_id\":\"<PASTE_FRESH_ID>\",\"dispute_type\":\"refund\",\"order_id\":\"ORD-10042\"}"
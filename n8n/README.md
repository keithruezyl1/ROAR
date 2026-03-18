# ROAR Engine — n8n Workflows

## Import Order
Import workflows in this order after setting up credentials:
1. 01_intake_agent.json
2. 02_data_retrieval.json
3. 03_triage_agent.json
4. 04_summarization.json
5. 05_resolution.json
6. 06_case_report.json

## Required Credentials
- ROAR OpenAI (OpenAI API)
- ROAR FastAPI (HTTP Header Auth — X-Webhook-Secret)
- ROAR FastAPI Bearer (HTTP Bearer Token Auth)

## Reference
See docs/ROAR_n8n_Spec_v2.1.md for full implementation spec.


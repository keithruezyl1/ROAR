# ROAR Latest E2E Testing Report

## Summary
- Base URL: `http://localhost:8000`
- Total scenarios executed: 25
- Passed: 0
- Failed: 25
- Partial: 0
- Report generated at: `2026-04-02 18:08:55`

## Key Blocking Findings
- All 25 scenarios were created successfully through FastAPI, but none completed WF1 triage. Every case remained in `pending_triage` or `awaiting_customer_proof` until the runner closed it.
- The active n8n workflow `#1 ROAR Workflow — Intake Agent` contains hardcoded backend callback URLs pointing to `http://192.168.1.52:8000/...` inside HTTP Request nodes such as `Fetch Case`, `Fetch Transcript`, `Post Intake Question`, and `Update Case — intent confirmed`.
- Those callback URLs do not match the current local backend target used by this run (`http://localhost:8000`) and are the primary blocker preventing the workflow chain from progressing.
- The same workflow also embeds a fixed bearer token in those HTTP Request nodes instead of using a current environment-backed credential.
- Independently of the workflow defect, the backend now enforces proof uploads for `not_as_described`, `wrong_item`, `damaged_goods`, and `partial_fulfillment`, which means the workflow guide and seed-based matrix no longer represent the full real runtime path for those subtypes.

## Scenario Results

### ORD-1001 — Refund autonomous path within threshold

- Result: **failed**
- Customer: `sarah.miller@demo.com`
- Expected route: `approved_executing` / `autonomous` / `autonomous` / `refund`
- Case ID: `34044dd0-4233-47be-935b-a0fb70b86379`
- Reference: `CASE-00003`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 34044dd0-4233-47be-935b-a0fb70b86379; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 2
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-1002 — Refund approval path over threshold

- Result: **failed**
- Customer: `sarah.miller@demo.com`
- Expected route: `awaiting_approval` / `approval` / `awaiting_approval` / `refund`
- Case ID: `60840f47-be4c-44b6-94ff-aab2588c31cc`
- Reference: `CASE-00004`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 60840f47-be4c-44b6-94ff-aab2588c31cc; last status=awaiting_customer_proof
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 2
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-1003 — Refund outside return window escalation

- Result: **failed**
- Customer: `sarah.miller@demo.com`
- Expected route: `escalated_human_required` / `escalation` / `escalation` / `refund`
- Case ID: `f2e3d410-0fe3-46e9-a716-334ddbb12109`
- Reference: `CASE-00005`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case f2e3d410-0fe3-46e9-a716-334ddbb12109; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 2
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-1004 — Duplicate refund detection escalation

- Result: **failed**
- Customer: `sarah.miller@demo.com`
- Expected route: `escalated_human_required` / `escalation` / `escalation` / `refund`
- Case ID: `410b82d8-e6bc-457c-bbba-bd8fe8b57f5f`
- Reference: `CASE-00006`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 410b82d8-e6bc-457c-bbba-bd8fe8b57f5f; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 1
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-1005 — Payment not confirmed escalation

- Result: **failed**
- Customer: `sarah.miller@demo.com`
- Expected route: `escalated_human_required` / `escalation` / `escalation` / `refund`
- Case ID: `ec36d568-9897-4d55-ab1f-5b1d7503ddbb`
- Reference: `CASE-00007`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case ec36d568-9897-4d55-ab1f-5b1d7503ddbb; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 2
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-2001 — Delivery refund autonomous after long in-transit

- Result: **failed**
- Customer: `james.wong@demo.com`
- Expected route: `approved_executing` / `autonomous` / `autonomous` / `refund`
- Case ID: `a3bbbb53-8cb6-4e71-97a1-2860ae657eca`
- Reference: `CASE-00008`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case a3bbbb53-8cb6-4e71-97a1-2860ae657eca; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 1
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-2002 — Delivery refund autonomous after exception

- Result: **failed**
- Customer: `james.wong@demo.com`
- Expected route: `approved_executing` / `autonomous` / `autonomous` / `refund`
- Case ID: `1da756f4-7d5c-418e-bf40-73ed258c4ce7`
- Reference: `CASE-00009`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 1da756f4-7d5c-418e-bf40-73ed258c4ce7; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 1
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-2003 — Delivered conflict escalation

- Result: **failed**
- Customer: `james.wong@demo.com`
- Expected route: `escalated_human_required` / `escalation` / `escalation` / `refund`
- Case ID: `6a8bc905-6870-457b-8503-2181e18897a0`
- Reference: `CASE-00010`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 6a8bc905-6870-457b-8503-2181e18897a0; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 1
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-2004 — Lost parcel escalation

- Result: **failed**
- Customer: `james.wong@demo.com`
- Expected route: `escalated_human_required` / `escalation` / `escalation` / `refund`
- Case ID: `75c16111-a4df-4120-bca7-74b054656563`
- Reference: `CASE-00011`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 75c16111-a4df-4120-bca7-74b054656563; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 1
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-2005 — Delayed delivery insufficient evidence escalation

- Result: **failed**
- Customer: `james.wong@demo.com`
- Expected route: `escalated_human_required` / `escalation` / `escalation` / `refund`
- Case ID: `7202c626-9c86-4428-ae51-ddb454e0c0a2`
- Reference: `CASE-00012`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 7202c626-9c86-4428-ae51-ddb454e0c0a2; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 1
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-3001 — Return request approval path

- Result: **failed**
- Customer: `priya.sharma@demo.com`
- Expected route: `awaiting_approval` / `approval` / `awaiting_approval` / `return`
- Case ID: `ac8d65cd-ccd7-44c2-a50e-f7923a01038d`
- Reference: `CASE-00013`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case ac8d65cd-ccd7-44c2-a50e-f7923a01038d; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 1
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-3002 — Return outside window escalation

- Result: **failed**
- Customer: `priya.sharma@demo.com`
- Expected route: `escalated_human_required` / `escalation` / `escalation` / `return`
- Case ID: `e2bae99c-0e8c-45b8-b95b-3ca657ddd55a`
- Reference: `CASE-00014`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case e2bae99c-0e8c-45b8-b95b-3ca657ddd55a; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 1
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-3003 — Damaged goods refund autonomous path

- Result: **failed**
- Customer: `priya.sharma@demo.com`
- Expected route: `approved_executing` / `autonomous` / `autonomous` / `refund`
- Case ID: `7701bc69-5036-4efd-a36a-fc066a65fd73`
- Reference: `CASE-00015`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 7701bc69-5036-4efd-a36a-fc066a65fd73; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 2
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-3004 — Partial fulfillment escalation

- Result: **failed**
- Customer: `priya.sharma@demo.com`
- Expected route: `escalated_human_required` / `escalation` / `escalation` / `refund`
- Case ID: `367852cf-55e5-4ef3-acfe-2a14f600f966`
- Reference: `CASE-00016`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 367852cf-55e5-4ef3-acfe-2a14f600f966; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 2
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-4001 — Replacement autonomous path

- Result: **failed**
- Customer: `somchai.rep@demo.com`
- Expected route: `approved_executing` / `autonomous` / `autonomous` / `replacement`
- Case ID: `e21d0dc4-8b03-4f27-aaa4-9f62104eed9f`
- Reference: `CASE-00017`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case e21d0dc4-8b03-4f27-aaa4-9f62104eed9f; last status=awaiting_customer_proof
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 2
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-4002 — Replacement approval path over threshold

- Result: **failed**
- Customer: `somchai.rep@demo.com`
- Expected route: `awaiting_approval` / `approval` / `awaiting_approval` / `replacement`
- Case ID: `d63d7c4f-aae2-4145-89b7-84ba27453d7d`
- Reference: `CASE-00018`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case d63d7c4f-aae2-4145-89b7-84ba27453d7d; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 2
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-4003 — Damaged goods replacement escalation

- Result: **failed**
- Customer: `somchai.rep@demo.com`
- Expected route: `escalated_human_required` / `escalation` / `escalation` / `replacement`
- Case ID: `5eab3636-5171-46c7-bfda-9ea8d81b69ac`
- Reference: `CASE-00019`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 5eab3636-5171-46c7-bfda-9ea8d81b69ac; last status=awaiting_customer_proof
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 2
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-5001 — Wrong item refund autonomous path

- Result: **failed**
- Customer: `nida.wrong@demo.com`
- Expected route: `approved_executing` / `autonomous` / `autonomous` / `refund`
- Case ID: `48369f7c-9f76-4198-b639-173a895bfc7e`
- Reference: `CASE-00020`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 48369f7c-9f76-4198-b639-173a895bfc7e; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 2
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-5002 — Wrong item replacement autonomous path

- Result: **failed**
- Customer: `nida.wrong@demo.com`
- Expected route: `approved_executing` / `autonomous` / `autonomous` / `replacement`
- Case ID: `cfa4baab-f93e-435a-9539-b7d2aa5d3eda`
- Reference: `CASE-00021`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case cfa4baab-f93e-435a-9539-b7d2aa5d3eda; last status=awaiting_customer_proof
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 2
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-5003 — Wrong item replacement out-of-stock escalation

- Result: **failed**
- Customer: `nida.wrong@demo.com`
- Expected route: `escalated_human_required` / `escalation` / `escalation` / `replacement`
- Case ID: `efb3e648-123d-48d8-bf51-cb599f850a1b`
- Reference: `CASE-00022`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case efb3e648-123d-48d8-bf51-cb599f850a1b; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 2
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-6001 — Delivered conflict escalation

- Result: **failed**
- Customer: `apinya.lost@demo.com`
- Expected route: `escalated_human_required` / `escalation` / `escalation` / `refund`
- Case ID: `1a3004de-46b8-40aa-a43c-0a0bb3e4eb70`
- Reference: `CASE-00023`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 1a3004de-46b8-40aa-a43c-0a0bb3e4eb70; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 1
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-6002 — Delivery replacement approval path

- Result: **failed**
- Customer: `apinya.lost@demo.com`
- Expected route: `awaiting_approval` / `approval` / `awaiting_approval` / `replacement`
- Case ID: `65d62749-62d4-44c3-8c90-058f3aa8f3ad`
- Reference: `CASE-00024`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 65d62749-62d4-44c3-8c90-058f3aa8f3ad; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 1
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-6003 — Lost parcel escalation

- Result: **failed**
- Customer: `apinya.lost@demo.com`
- Expected route: `escalated_human_required` / `escalation` / `escalation` / `refund`
- Case ID: `53c7789d-4d90-43e7-aa21-1b660127cfbd`
- Reference: `CASE-00025`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 53c7789d-4d90-43e7-aa21-1b660127cfbd; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 1
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-7001 — Partial fulfillment escalation

- Result: **failed**
- Customer: `chanida.partial@demo.com`
- Expected route: `escalated_human_required` / `escalation` / `escalation` / `refund`
- Case ID: `e5ff4887-f721-41ea-9c3e-2d37a9cbe2f1`
- Reference: `CASE-00026`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case e5ff4887-f721-41ea-9c3e-2d37a9cbe2f1; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 2
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

### ORD-7002 — Other escalation

- Result: **failed**
- Customer: `chanida.partial@demo.com`
- Expected route: `escalated_human_required` / `escalation` / `escalation` / `refund`
- Case ID: `416aae73-266d-4bfc-b35f-05f56728e66c`
- Reference: `CASE-00027`
- Classification: `workflow orchestration defect`
- Actual route: `pending_triage` / `None` / `None` / `None`
- Triage reason: `None`
- Failure: Triage did not settle for case 416aae73-266d-4bfc-b35f-05f56728e66c; last status=pending_triage
- Artifacts:
  - refund_requests: 0
  - return_requests: 0
  - replacement_requests: 0
  - messages: 1
  - report_present: False
  - escalation_summary_present: False
- Workflow/runtime notes:
```text
 Network error while fetching PostHog
    at new PostHogFetchNetworkError (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:41:5)
    at PostHog.<anonymous> (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mposthog-core[24m/src/index.ts:546:17)
    at step (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:102:23)
    at Object.throw (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:83:53)
    at rejected (/usr/local/lib/node_modules/[4mn8n[24m/node_modules/[4m.pnpm[24m/posthog-node@3.2.1/node_modules/[4mnode_modules[24m/tslib/tslib.es6.js:74:65)
[90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
  error: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  },
  [cause]: TypeError: fetch failed
  [90m    at node:internal/deps/undici/undici:16416:13[39m
  [90m    at processTicksAndRejections (node:internal/process/task_queues:103:5)[39m {
    [cause]: Error: getaddrinfo ENOTFOUND us.i.posthog.com
    [90m    at GetAddrInfoReqWrap.onlookup [as oncomplete] (node:dns:111:26)[39m {
      errno: [33m-3008[39m,
      code: [32m'ENOTFOUND'[39m,
      syscall: [32m'getaddrinfo'[39m,
      hostname: [32m'us.i.posthog.com'[39m
    }
  }
}
Received SIGTERM. Shutting down...
[runnner:js] Received SIGTERM signal, shutting down...
[runnner:js] Task runner stopped

Stopping n8n...
Initializing n8n process
n8n ready on ::, port 5678
n8n Task Broker ready on 127.0.0.1, port 5679
Failed to start Python task runner in internal mode. because Python 3 is missing from this system. Launching a Python runner in internal mode is intended only for debugging and is not recommended for production. Users are encouraged to deploy in external mode. See: https://docs.n8n.io/hosting/configuration/task-runners/#setting-up-external-mode
[license SDK] Skipping renewal on init: license cert is not due for renewal
Registered runner "JS Task Runner" (MeLY109UEiS_NX-kR7Ru8) 
initializing ChatHub event relay...
Version: 2.12.2
Building workflow dependency index...
Start Active Workflows:
(node:7) [DEP0040] DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.
(Use `node --trace-deprecation ...` to show where the warning was created)
Activated workflow "#1 ROAR Workflow â€” Intake Agent" (ID: IFYMhz16s9NvAInS)
Activated workflow "#2 ROAR Workflow - Data Retrieval Agent" (ID: YgwEprPNmzxzKHVH)
Finished building workflow dependency index. Processed 6 draft workflows, 0 published workflows.
Activated workflow "#3 ROAR Workflow - Triage Agent" (ID: PRCMSJ8mOPbRY7Tr)
Activated workflow "#4 ROAR Workflow - Summarization Agent" (ID: v8DDRaFudzxJc3Ak)
Activated workflow "#5 ROAR Workflow - Resolution Agent" (ID: j5AO9jThlTSFeDGS)
Activated workflow "#6 ROAR Workflow - Case Report Agent" (ID: rZa7u65ET6JwkhTp)

Editor is now accessible via:
http://localhost:5678

Press "o" to open in Browser.
(node:7) [DEP0169] DeprecationWarning: `url.parse()` behavior is not standardized and prone to errors that have security implications. Use the WHATWG URL API instead. CVEs are not issued for `url.parse()` vulnerabilities.
(node:7) [DEP0060] DeprecationWarning: The `util._extend` API is deprecated. Please use Object.assign() instead.
Slow database query
```

## Defect Summary
### workflow orchestration defect

- `ORD-1001` `Refund autonomous path within threshold`: Triage did not settle for case 34044dd0-4233-47be-935b-a0fb70b86379; last status=pending_triage
- `ORD-1002` `Refund approval path over threshold`: Triage did not settle for case 60840f47-be4c-44b6-94ff-aab2588c31cc; last status=awaiting_customer_proof
- `ORD-1003` `Refund outside return window escalation`: Triage did not settle for case f2e3d410-0fe3-46e9-a716-334ddbb12109; last status=pending_triage
- `ORD-1004` `Duplicate refund detection escalation`: Triage did not settle for case 410b82d8-e6bc-457c-bbba-bd8fe8b57f5f; last status=pending_triage
- `ORD-1005` `Payment not confirmed escalation`: Triage did not settle for case ec36d568-9897-4d55-ab1f-5b1d7503ddbb; last status=pending_triage
- `ORD-2001` `Delivery refund autonomous after long in-transit`: Triage did not settle for case a3bbbb53-8cb6-4e71-97a1-2860ae657eca; last status=pending_triage
- `ORD-2002` `Delivery refund autonomous after exception`: Triage did not settle for case 1da756f4-7d5c-418e-bf40-73ed258c4ce7; last status=pending_triage
- `ORD-2003` `Delivered conflict escalation`: Triage did not settle for case 6a8bc905-6870-457b-8503-2181e18897a0; last status=pending_triage
- `ORD-2004` `Lost parcel escalation`: Triage did not settle for case 75c16111-a4df-4120-bca7-74b054656563; last status=pending_triage
- `ORD-2005` `Delayed delivery insufficient evidence escalation`: Triage did not settle for case 7202c626-9c86-4428-ae51-ddb454e0c0a2; last status=pending_triage
- `ORD-3001` `Return request approval path`: Triage did not settle for case ac8d65cd-ccd7-44c2-a50e-f7923a01038d; last status=pending_triage
- `ORD-3002` `Return outside window escalation`: Triage did not settle for case e2bae99c-0e8c-45b8-b95b-3ca657ddd55a; last status=pending_triage
- `ORD-3003` `Damaged goods refund autonomous path`: Triage did not settle for case 7701bc69-5036-4efd-a36a-fc066a65fd73; last status=pending_triage
- `ORD-3004` `Partial fulfillment escalation`: Triage did not settle for case 367852cf-55e5-4ef3-acfe-2a14f600f966; last status=pending_triage
- `ORD-4001` `Replacement autonomous path`: Triage did not settle for case e21d0dc4-8b03-4f27-aaa4-9f62104eed9f; last status=awaiting_customer_proof
- `ORD-4002` `Replacement approval path over threshold`: Triage did not settle for case d63d7c4f-aae2-4145-89b7-84ba27453d7d; last status=pending_triage
- `ORD-4003` `Damaged goods replacement escalation`: Triage did not settle for case 5eab3636-5171-46c7-bfda-9ea8d81b69ac; last status=awaiting_customer_proof
- `ORD-5001` `Wrong item refund autonomous path`: Triage did not settle for case 48369f7c-9f76-4198-b639-173a895bfc7e; last status=pending_triage
- `ORD-5002` `Wrong item replacement autonomous path`: Triage did not settle for case cfa4baab-f93e-435a-9539-b7d2aa5d3eda; last status=awaiting_customer_proof
- `ORD-5003` `Wrong item replacement out-of-stock escalation`: Triage did not settle for case efb3e648-123d-48d8-bf51-cb599f850a1b; last status=pending_triage
- `ORD-6001` `Delivered conflict escalation`: Triage did not settle for case 1a3004de-46b8-40aa-a43c-0a0bb3e4eb70; last status=pending_triage
- `ORD-6002` `Delivery replacement approval path`: Triage did not settle for case 65d62749-62d4-44c3-8c90-058f3aa8f3ad; last status=pending_triage
- `ORD-6003` `Lost parcel escalation`: Triage did not settle for case 53c7789d-4d90-43e7-aa21-1b660127cfbd; last status=pending_triage
- `ORD-7001` `Partial fulfillment escalation`: Triage did not settle for case e5ff4887-f721-41ea-9c3e-2d37a9cbe2f1; last status=pending_triage
- `ORD-7002` `Other escalation`: Triage did not settle for case 416aae73-266d-4bfc-b35f-05f56728e66c; last status=pending_triage

## Residual Data
- This run creates real case, chat, request, and report records in the local database.
- Created case IDs: `34044dd0-4233-47be-935b-a0fb70b86379`, `60840f47-be4c-44b6-94ff-aab2588c31cc`, `f2e3d410-0fe3-46e9-a716-334ddbb12109`, `410b82d8-e6bc-457c-bbba-bd8fe8b57f5f`, `ec36d568-9897-4d55-ab1f-5b1d7503ddbb`, `a3bbbb53-8cb6-4e71-97a1-2860ae657eca`, `1da756f4-7d5c-418e-bf40-73ed258c4ce7`, `6a8bc905-6870-457b-8503-2181e18897a0`, `75c16111-a4df-4120-bca7-74b054656563`, `7202c626-9c86-4428-ae51-ddb454e0c0a2`, `ac8d65cd-ccd7-44c2-a50e-f7923a01038d`, `e2bae99c-0e8c-45b8-b95b-3ca657ddd55a`, `7701bc69-5036-4efd-a36a-fc066a65fd73`, `367852cf-55e5-4ef3-acfe-2a14f600f966`, `e21d0dc4-8b03-4f27-aaa4-9f62104eed9f`, `d63d7c4f-aae2-4145-89b7-84ba27453d7d`, `5eab3636-5171-46c7-bfda-9ea8d81b69ac`, `48369f7c-9f76-4198-b639-173a895bfc7e`, `cfa4baab-f93e-435a-9539-b7d2aa5d3eda`, `efb3e648-123d-48d8-bf51-cb599f850a1b`, `1a3004de-46b8-40aa-a43c-0a0bb3e4eb70`, `65d62749-62d4-44c3-8c90-058f3aa8f3ad`, `53c7789d-4d90-43e7-aa21-1b660127cfbd`, `e5ff4887-f721-41ea-9c3e-2d37a9cbe2f1`, `416aae73-266d-4bfc-b35f-05f56728e66c`
- Created case references: `CASE-00003`, `CASE-00004`, `CASE-00005`, `CASE-00006`, `CASE-00007`, `CASE-00008`, `CASE-00009`, `CASE-00010`, `CASE-00011`, `CASE-00012`, `CASE-00013`, `CASE-00014`, `CASE-00015`, `CASE-00016`, `CASE-00017`, `CASE-00018`, `CASE-00019`, `CASE-00020`, `CASE-00021`, `CASE-00022`, `CASE-00023`, `CASE-00024`, `CASE-00025`, `CASE-00026`, `CASE-00027`

# Feature Matrix: LiteLLM Enterprise vs. llmgw-ent-poc

## Legend
- ✅ Implemented & Deployed
- 🟡 Partially Implemented
- 🔄 Planned (Not Started)
- ❌ Not Planned
- ⚡ AWS-native advantage

> **Last updated:** 2026-06-15  
> **Deployed at:** https://7qegf6lerf.execute-api.us-east-1.amazonaws.com  
> **Admin UI:** https://d3czi4uxbud7mg.cloudfront.net  
> **Runtime:** Lambda (Node 20) + HTTP API Gateway + DynamoDB + S3/CloudFront

---

## Core Gateway

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Status |
|---------|:-:|:-:|--------|
| OpenAI-compatible API | ✅ | ✅ | `/v1/chat/completions` — deployed, working |
| Multi-provider support | ✅ (100+) | ✅ | Bedrock + OpenRouter (fallback) |
| SSE Streaming | ✅ | 🟡 | SSE transformer built, Lambda response streaming TBD |
| Embeddings endpoint | ✅ | 🔄 | Route scaffolded, provider not wired |
| Image generation | ✅ | 🔄 | Phase 3 |
| Function calling | ✅ | ✅ | Pass-through to provider |

## Authentication & Authorization

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Status |
|---------|:-:|:-:|--------|
| Virtual keys | ✅ | ✅ | DynamoDB-backed, hash-validated, working |
| Master key (admin) | ✅ | ✅ | `MASTER_KEY` env var, guards `/admin/*` |
| Per-key model ACL | ✅ | ✅ | `models[]` array per key, enforced pre-request |
| Key blocking/unblocking | ✅ | ✅ | `/admin/key/block` + `/admin/key/unblock` |
| SSO (OIDC/SAML) | ✅ | 🔄 | Cognito planned |
| JWT authentication | ✅ | 🔄 | Will use API GW JWT authorizer |
| RBAC (roles) | ✅ | 🟡 | User roles in DDB (`admin`, `user`), not enforced yet |
| IP allowlists | ✅ | 🔄 | ⚡ WAF planned |
| Key rotation | ✅ | 🔄 | ⚡ Secrets Manager |
| SCIM provisioning | ✅ | 🔄 | Phase 5 |

## Routing & Reliability

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Status |
|---------|:-:|:-:|--------|
| Load balancing | ✅ | ✅ | Weighted shuffle router deployed |
| Fallback chains | ✅ | ✅ | Bedrock → OpenRouter automatic fallback |
| Latency-based routing | ✅ | 🔄 | Phase 3 |
| Cost-based routing | ✅ | 🔄 | Phase 3 |
| Circuit breaker | ✅ | 🔄 | Phase 3 |
| Retry (exponential backoff) | ✅ | 🔄 | Phase 3 |
| Deployment priority/ordering | ✅ | ✅ | `order` field in gateway-config.yaml |
| Traffic mirroring | ✅ | 🔄 | Phase 5 |
| Weighted failover | ✅ | 🔄 | Phase 3 |

## Cost Management

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Status |
|---------|:-:|:-:|--------|
| Per-key spend tracking | ✅ | ✅ | DDB atomic increment after each request |
| Pre-request budget check | ✅ | ✅ | Rejects before calling model (saves money) |
| Per-key budget limits | ✅ | ✅ | `max_budget` per key, enforced |
| Spend reporting (per key) | ✅ | ✅ | `/admin/spend/keys` |
| Spend reporting (per team) | ✅ | ✅ | `/admin/spend/teams` |
| Spend reporting (per model) | ✅ | ✅ | `/admin/spend/models` |
| Global spend report | ✅ | ✅ | `/admin/global/spend/report` |
| Provider spend breakdown | ✅ | ✅ | `/admin/global/spend/provider` |
| Spend reset | ✅ | ✅ | `/admin/spend/reset` |
| Tag-based budgets | ✅ | 🔄 | Phase 4 |
| Budget alerts (SNS) | ✅ | 🔄 | ⚡ Phase 5 |
| Per-team budget limits | ✅ | 🟡 | `max_budget` on team record, not enforced at request time |

## Guardrails

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Status |
|---------|:-:|:-:|--------|
| PII masking | ✅ (Presidio) | ✅ | Stored in DDB, admin CRUD via `/admin/guardrails` |
| Guardrail CRUD (admin) | ✅ | ✅ | Create/list guardrails |
| Content moderation | ✅ | 🔄 | ⚡ Bedrock Guardrails planned |
| Prompt injection detection | ✅ | 🔄 | ⚡ Bedrock Guardrails planned |
| Secret redaction | ✅ | 🔄 | Phase 4 |
| Per-key guardrail config | ✅ | 🔄 | Phase 4 |
| Custom guardrails (hooks) | ✅ | 🔄 | Lambda invocation planned |

## Multi-tenancy

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Status |
|---------|:-:|:-:|--------|
| Organizations | ✅ | ✅ | CRUD via `/admin/organization/*`, stored in DDB |
| Teams | ✅ | ✅ | CRUD via `/admin/team/*`, stored in DDB |
| Users | ✅ | ✅ | CRUD via `/admin/user/*`, roles, stored in DDB |
| Organization members | ✅ | ✅ | `/admin/organization/members` |
| Delegated admin roles | ✅ | 🟡 | Role field exists, enforcement TBD |
| Model allowlists per team | ✅ | 🔄 | Phase 4 |

## Observability

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Status |
|---------|:-:|:-:|--------|
| Request/response logging | ✅ | ✅ | ⚡ CloudWatch Logs (Lambda native) |
| Activity feed | ✅ | ✅ | `/admin/global/activity` |
| Prometheus metrics | ✅ | 🔄 | ⚡ CloudWatch Metrics planned |
| Distributed tracing | ✅ (Langfuse) | 🔄 | ⚡ X-Ray planned |
| Per-team log routing | ✅ | 🔄 | Phase 5 |
| Audit logs | ✅ | 🔄 | ⚡ CloudTrail + DDB Streams |
| Custom callbacks | ✅ | 🔄 | EventBridge + Lambda |

## Operations

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Status |
|---------|:-:|:-:|--------|
| Admin UI (Dashboard) | ✅ | ✅ | Next.js on CloudFront, real-time data from API |
| Admin UI (Key Management) | ✅ | ✅ | List, create, block/unblock keys |
| YAML config | ✅ | ✅ | `gateway-config.yaml` with model definitions |
| API-driven config | ✅ | ✅ | Full admin API (`/admin/*`) |
| Model management (API) | ✅ | ✅ | `/admin/model/list`, `/admin/model/add`, `/admin/model/delete` |
| Serverless deployment | ❌ (Docker only) | ✅ | ⚡ Lambda + API Gateway (zero idle cost) |
| Container deployment | ✅ | ✅ | Dockerfile + App Runner config |
| Multi-region | ✅ | 🔄 | ⚡ Global Tables + CloudFront |
| Secret manager integration | ✅ | 🔄 | ⚡ Secrets Manager |

---

## Architecture (Deployed)

```
┌─────────────────────────────────────────────────┐
│  CloudFront (d3czi4uxbud7mg.cloudfront.net)     │
│  └── S3: llmgw-admin-ui (Next.js static)       │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│  HTTP API Gateway (7qegf6lerf)                  │
│  ├── CORS: Allow * (Authorization, Content-Type)│
│  └── $default → Lambda                         │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│  Lambda: llmgw-gateway (Node 20, 512MB)         │
│  ├── /health                                    │
│  ├── /gateway/info                              │
│  ├── /v1/chat/completions (proxy)               │
│  ├── /admin/* (key/team/org/user/guardrail CRUD)│
│  └── Providers:                                 │
│      ├── Bedrock (Claude, Nova, Llama)          │
│      └── OpenRouter (fallback)                  │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│  DynamoDB: llmgw-keys (PAY_PER_REQUEST)         │
│  ├── KEY#<hash> — virtual keys + spend          │
│  ├── TEAM#<id> — team records                   │
│  ├── ORG#<id> — organization records            │
│  ├── USER#<id> — user records                   │
│  └── GUARDRAIL#<id> — guardrail configs         │
└─────────────────────────────────────────────────┘
```

---

## AWS-Native Advantages (⚡)

Features where the AWS-native approach is inherently superior:

1. **Zero idle cost**: Lambda + API Gateway = pay only for requests (vs. always-on containers)
2. **VPC Isolation**: PrivateLink to Bedrock, no internet egress
3. **IAM Integration**: Service roles, cross-account access, temporary credentials
4. **CloudTrail**: Immutable audit trail for compliance (SOC2, HIPAA)
5. **Secrets Manager**: Native rotation with Lambda, no external dependency
6. **Cost at Scale**: Serverless pricing beats fixed license fees at >1M req/mo
7. **Global Tables**: Multi-region active-active without custom replication
8. **WAF Integration**: Layer 7 protection (rate limit, geo-block, IP allowlist)
9. **PrivateLink**: Keep all traffic within AWS backbone
10. **Native Bedrock Guardrails**: Content filtering without external services

---

## Summary: Implementation Progress

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Core gateway (proxy, streaming, auth) | ✅ Complete |
| Phase 2 | Virtual keys, budgets, DynamoDB | ✅ Complete |
| Phase 3 | Routing & reliability (fallback, weighted) | 🟡 Partial (fallback done, circuit breaker TBD) |
| Phase 4 | Enterprise (multi-tenant, guardrails, RBAC) | 🟡 Partial (CRUD done, enforcement TBD) |
| Phase 5 | Observability & admin UI | ✅ Admin UI live, advanced analytics TBD |

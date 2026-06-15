# llmgw-ent-poc

**AWS-Native LLM Gateway — Enterprise Edition (POC)**

A serverless, AWS-native alternative to LiteLLM Enterprise Gateway. Provides an OpenAI-compatible API layer with enterprise controls: virtual keys, spend tracking, routing/failover, guardrails, multi-tenancy — all built on AWS managed services.

---

## 🎯 Why This Exists

AWS doesn't have a managed LLM Gateway service comparable to LiteLLM Enterprise. This project fills that gap:

- **Serverless Economics**: Lambda + API Gateway = pay only per request (zero idle cost)
- **Deep AWS Integration**: Bedrock native, IAM, CloudWatch, DynamoDB
- **Enterprise Controls**: Per-key budgets, team hierarchy, model ACLs, BU tagging
- **Multi-Provider Failover**: Bedrock primary → OpenRouter fallback (automatic)
- **Drop-in Compatible**: Any OpenAI SDK works — just change `base_url`

---

## 🏗️ Architecture

![Architecture Diagram](docs/architecture-diagram.png)

```
Clients (OpenAI SDK / curl)
         │
         ▼
┌─────────────────────────┐
│  HTTP API Gateway       │  ← CORS, catch-all route
│  (7qegf6lerf)           │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Lambda: llmgw-gateway  │  ← Node 20, 512MB, 60s
│  ├── Auth (DynamoDB)    │  ← Virtual keys + budget check
│  ├── Router             │  ← Weighted shuffle + failover
│  ├── Cost Tracker       │  ← Token count → $ → DDB atomic update
│  ├── BU Tagging         │  ← requestMetadata injected per team
│  └── Admin API          │  ← /admin/* CRUD (keys/teams/orgs)
└────────────┬────────────┘
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
┌────────┐┌────────┐┌──────────┐
│Bedrock ││Bedrock ││OpenRouter│
│Claude  ││DeepSeek││(fallback)│
│Haiku   ││Nova    ││Nemotron  │
│Llama   ││        ││          │
└────────┘└────────┘└──────────┘

┌─────────────────────────┐
│  DynamoDB: llmgw-keys   │  ← Keys, Teams, Orgs, Users, Guardrails, Spend
└─────────────────────────┘

┌─────────────────────────┐
│  CloudFront → S3        │  ← Admin UI (Next.js static)
│  (d3czi4uxbud7mg)       │
└─────────────────────────┘
```

---

## 📦 Project Structure

```
llmgw-ent-poc/
├── lambda-deploy/           # Deployed Lambda code
│   ├── src/
│   │   ├── lambda-handler.ts    # Entry point (route dispatch)
│   │   ├── proxy/
│   │   │   ├── auth/
│   │   │   │   ├── key-validator.ts       # In-memory (demo keys)
│   │   │   │   └── dynamo-key-validator.ts # DynamoDB (production keys)
│   │   │   ├── providers/
│   │   │   │   ├── base.ts
│   │   │   │   ├── bedrock.ts      # Converse API + BU tag injection
│   │   │   │   ├── openai.ts
│   │   │   │   └── openrouter.ts   # Fallback provider
│   │   │   ├── router/
│   │   │   │   └── index.ts        # Weighted shuffle + failover
│   │   │   ├── cost/
│   │   │   │   └── price-calculator.ts  # Token → $ conversion
│   │   │   ├── admin/
│   │   │   │   ├── admin-routes.ts      # Key/Team/Org CRUD
│   │   │   │   ├── guardrail-routes.ts
│   │   │   │   ├── user-routes.ts
│   │   │   │   └── org-routes.ts
│   │   │   ├── routes/
│   │   │   │   ├── chat-completions.ts
│   │   │   │   ├── embeddings.ts
│   │   │   │   ├── health.ts
│   │   │   │   ├── key-management.ts
│   │   │   │   └── models.ts
│   │   │   └── streaming/
│   │   │       └── sse-transformer.ts
│   │   └── shared/
│   │       ├── config.ts
│   │       ├── dynamo-client.ts
│   │       ├── logger.ts
│   │       └── types.ts
│   ├── config/
│   │   └── gateway-config.yaml  # Model routing config
│   └── package.json
├── ui/                      # Admin Dashboard (Next.js 14)
│   ├── app/
│   │   ├── page.tsx             # Dashboard (live stats from API)
│   │   ├── keys/page.tsx        # Key management
│   │   ├── teams/page.tsx
│   │   ├── models/page.tsx
│   │   ├── guardrails/page.tsx
│   │   ├── playground/page.tsx
│   │   ├── usage/page.tsx
│   │   └── logs/page.tsx
│   ├── lib/
│   │   └── api.ts               # API client (→ real backend)
│   └── package.json
├── infra/                   # CDK Infrastructure (one-command deploy)
│   ├── bin/app.ts
│   ├── lib/llmgw-stack.ts      # All resources in single stack
│   ├── cdk.json
│   └── package.json
├── docs/
│   ├── architecture-diagram.png
│   ├── FEATURE_MATRIX.md
│   ├── DEMO_SCRIPT.md
│   └── API.md
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites
- AWS CLI configured (with Bedrock access)
- Node.js 20+
- No Docker needed

### Deploy to AWS (CDK)
```bash
# 1. Build UI
cd ui && npm install && npm run build && cd ..

# 2. Deploy everything (Lambda + API GW + DDB + S3 + CloudFront)
cd infra && npm install && npx cdk deploy
```

### Run Locally
```bash
# Lambda proxy (API on port 4000)
cd lambda-deploy && npm install && npx tsc && node dist/proxy/server.js

# Admin UI (port 3001)
cd ui && npm install && npm run dev
```

### Test Deployed Gateway
```bash
export GW=https://7qegf6lerf.execute-api.us-east-1.amazonaws.com

# Health
curl $GW/health

# Chat (any OpenAI-compatible client works)
curl -s $GW/v1/chat/completions \
  -H "Authorization: Bearer sk-llmgw-demo-all-models" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-haiku","messages":[{"role":"user","content":"Hello"}]}'

# Admin: list keys
curl -s -H "Authorization: Bearer sk-llmgw-master" $GW/admin/key/list
```

---

## ⚡ Key Features (Deployed & Working)

| Feature | Status |
|---------|--------|
| OpenAI-compatible `/v1/chat/completions` | ✅ |
| 7 models (Claude, DeepSeek, Haiku, Nova, Llama, best-available, OpenRouter) | ✅ |
| Virtual keys with DynamoDB persistence | ✅ |
| Per-key budget enforcement (pre-request) | ✅ |
| Token counting + spend tracking (atomic) | ✅ |
| Model ACL per key | ✅ |
| Auto-failover Bedrock → OpenRouter | ✅ |
| Weighted load balancing | ✅ |
| BU tag injection (Bedrock requestMetadata) | ✅ |
| Multi-tenant (Org → Team → User → Key) | ✅ |
| Admin API (30+ CRUD endpoints) | ✅ |
| Admin UI (real-time dashboard) | ✅ |
| Guardrails CRUD (PII masking config) | ✅ |
| CDK deployment (single stack) | ✅ |

See [docs/FEATURE_MATRIX.md](docs/FEATURE_MATRIX.md) for full LiteLLM comparison.

---

## 📐 Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Compute | Lambda | Zero idle cost, auto-scaling, no patching |
| API | HTTP API Gateway | Cheapest, native CORS, Lambda integration |
| Database | DynamoDB (single-table) | Serverless, PAY_PER_REQUEST, atomic counters |
| Admin UI | Next.js static → S3 + CloudFront | Zero-cost hosting, global CDN |
| IaC | CDK (TypeScript) | Type-safe, single stack, same language as app |
| Config | YAML (LiteLLM-compatible) | Easy migration from LiteLLM |
| Fallback | OpenRouter | Free tier available, multi-model |

---

## 🔑 Environment Variables (Lambda)

```bash
DYNAMODB_TABLE_NAME=llmgw-keys
USE_DYNAMODB=true
MASTER_KEY=sk-llmgw-master          # Admin API auth
CONFIG_PATH=/var/task/gateway-config.yaml
OPENROUTER_API_KEY=sk-or-v1-...     # Fallback provider
```

---

## 📎 Links

- **API Endpoint:** https://7qegf6lerf.execute-api.us-east-1.amazonaws.com
- **Admin UI:** https://d3czi4uxbud7mg.cloudfront.net
- **Feature Matrix:** [docs/FEATURE_MATRIX.md](docs/FEATURE_MATRIX.md)
- **Demo Script:** [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)

---

## License

Apache-2.0

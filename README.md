# llmgw-ent-poc

**AWS-Native LLM Gateway — Enterprise Edition (POC)**

A serverless, AWS-native alternative to LiteLLM Enterprise Gateway. Provides an OpenAI-compatible API layer with enterprise controls: virtual keys, spend tracking, routing/failover, guardrails, multi-tenancy, and audit logging — all built on AWS managed services.

---

## 🎯 Why This Exists

AWS doesn't have a managed LLM Gateway service comparable to LiteLLM Enterprise. This project fills that gap with a fully AWS-native solution that offers:

- **Security & Compliance**: Your VPC, your data, CloudTrail audit, IAM integration
- **Serverless Economics**: Pay-per-request at scale (vs. fixed LiteLLM license)
- **Deep AWS Integration**: PrivateLink to Bedrock, Secrets Manager rotation, Cognito SSO
- **Enterprise Controls**: Per-key budgets, team hierarchy, guardrails, rate limiting

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Clients                            │
│         (OpenAI SDK, curl, any OpenAI-compatible)       │
└────────────────────────┬────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │  API Gateway (REST) │  ← WAF, throttling, response streaming
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │   Lambda Function   │  ← Core Proxy (serverless)
              │  ┌───────────────┐  │
              │  │ Auth (DynamoDB)│  │  ← Virtual keys + persistent budget
              │  │ Router        │  │  ← Weighted, failover, multi-provider
              │  │ Guardrails    │  │  ← Pre/post-call hooks
              │  │ Cost Tracker  │  │  ← Atomic spend via DDB UpdateItem
              │  └───────────────┘  │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ AWS Bedrock │  │  OpenRouter  │  │  OpenAI API │
│ (Claude,    │  │ (fallback)   │  │ (passthru)  │
│  DeepSeek,  │  │  Nemotron,   │  │             │
│  Llama,     │  │  Gemma, etc  │  │             │
│  Nova)      │  │              │  │             │
└─────────────┘  └─────────────┘  └─────────────┘

         ┌───────────────────────────────────┐
         │         Data & Control Plane      │
         │                                   │
         │  DynamoDB ─── Keys, Spend, Config │
         │  DAX ──────── Hot-path cache      │
         │  Firehose ──► S3 ──► Athena       │
         │  Secrets Mgr ── Provider API keys │
         │  Bedrock Guardrails ── PII/Toxic  │
         │  CloudWatch ── Metrics & Alarms   │
         │  X-Ray ──────── Distributed trace │
         └───────────────────────────────────┘

         ┌───────────────────────────────────┐
         │         Admin Plane (Lambda)      │
         │                                   │
         │  API Gateway ── /key/*, /admin/*  │
         │  Cognito ────── SSO (OIDC/SAML)  │
         │  Amplify ────── Admin Dashboard   │
         └───────────────────────────────────┘
```

---

## 📦 Project Structure

```
llmgw-ent-poc/
├── README.md
├── docs/
│   ├── ARCHITECTURE.md      # Detailed architecture decisions
│   ├── FEATURE_MATRIX.md    # LiteLLM vs. this project comparison
│   └── API.md               # OpenAI-compatible API reference
├── infra/                   # CDK Infrastructure
│   ├── bin/
│   │   └── app.ts
│   ├── lib/
│   │   ├── network-stack.ts
│   │   ├── data-stack.ts       # DynamoDB, DAX, S3, Firehose
│   │   ├── compute-stack.ts    # Fargate, ALB
│   │   ├── auth-stack.ts       # Cognito, API Gateway
│   │   ├── admin-stack.ts      # Lambda admin APIs
│   │   └── observability-stack.ts
│   ├── cdk.json
│   ├── tsconfig.json
│   └── package.json
├── src/                     # Application code
│   ├── proxy/               # Core proxy (Fargate)
│   │   ├── server.ts           # Express/Fastify HTTP server
│   │   ├── routes/
│   │   │   ├── chat-completions.ts
│   │   │   ├── embeddings.ts
│   │   │   └── models.ts
│   │   ├── auth/
│   │   │   ├── key-validator.ts
│   │   │   └── jwt-validator.ts
│   │   ├── router/
│   │   │   ├── index.ts
│   │   │   ├── strategies/
│   │   │   │   ├── weighted-shuffle.ts
│   │   │   │   ├── latency-based.ts
│   │   │   │   ├── cost-based.ts
│   │   │   │   └── failover.ts
│   │   │   └── circuit-breaker.ts
│   │   ├── providers/
│   │   │   ├── bedrock.ts
│   │   │   ├── openai.ts
│   │   │   ├── anthropic.ts
│   │   │   └── base.ts
│   │   ├── guardrails/
│   │   │   ├── pre-call.ts
│   │   │   ├── post-call.ts
│   │   │   └── bedrock-guardrails.ts
│   │   ├── cost/
│   │   │   ├── token-counter.ts
│   │   │   ├── price-calculator.ts
│   │   │   └── budget-enforcer.ts
│   │   ├── streaming/
│   │   │   └── sse-transformer.ts
│   │   └── Dockerfile
│   ├── admin/               # Admin Lambda functions
│   │   ├── key-generate.ts
│   │   ├── key-info.ts
│   │   ├── key-revoke.ts
│   │   ├── team-manage.ts
│   │   ├── spend-report.ts
│   │   └── config-update.ts
│   └── shared/              # Shared utilities
│       ├── dynamo-client.ts
│       ├── types.ts
│       ├── config.ts
│       └── logger.ts
├── config/
│   └── gateway-config.yaml  # Model routing config (LiteLLM-compatible format)
├── test/
│   ├── unit/
│   ├── integration/
│   └── load/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── package.json
├── tsconfig.json
├── .gitignore
└── .env.example
```

---

## 🚀 Quick Start

```bash
# Prerequisites
# - AWS CLI configured with appropriate permissions
# - Node.js 20+
# - Docker (for local dev + Fargate builds)

# Install
npm install

# Deploy infrastructure
cd infra && npx cdk deploy --all

# Local development
npm run dev

# Run tests
npm test
```

---

## 🗺️ Roadmap

### Phase 1 — Core Gateway ✈️ (Week 1-2)
- [ ] OpenAI-compatible `/v1/chat/completions`
- [ ] Bedrock provider (Claude, Titan)
- [ ] SSE streaming via Fargate + ALB
- [ ] Basic request/response logging

### Phase 2 — Virtual Keys & Auth (Week 2-3)
- [ ] Key generation/revocation API
- [ ] DynamoDB key store + DAX cache
- [ ] Per-key model ACL + budget
- [ ] Cognito JWT validation

### Phase 3 — Routing & Reliability (Week 3-4)
- [ ] Multi-provider routing config
- [ ] Weighted shuffle + failover strategies
- [ ] Circuit breaker pattern
- [ ] Retry with exponential backoff

### Phase 4 — Enterprise Controls (Week 4-6)
- [ ] Org → Team → Project → Key hierarchy
- [ ] Guardrails pipeline (Bedrock Guardrails + Comprehend)
- [ ] Rate limiting (TPM via DDB atomic counters)
- [ ] Audit logging (DDB Streams → S3)
- [ ] Secrets Manager rotation for provider keys

### Phase 5 — Observability & Admin UI (Week 6-8)
- [ ] CloudWatch dashboards
- [ ] X-Ray distributed tracing
- [ ] Spend analytics (Firehose → S3 → Athena)
- [ ] Admin UI (Amplify/React)
- [ ] Budget alerts (SNS)
- [ ] Semantic response caching (OpenSearch)

---

## 📐 Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Core compute | Fargate | Always-warm, native streaming, no cold starts |
| Admin APIs | Lambda | Cost-efficient for low-traffic admin operations |
| Primary DB | DynamoDB (single-table) | Serverless, predictable perf, native TTL |
| Auth | Cognito + JWT | Native OIDC/SAML, built-in API GW integration |
| Streaming | ALB + Fargate (chunked) | Simplest SSE path, no WebSocket complexity |
| IaC | CDK (TypeScript) | Type-safe, same language as app code |
| Config format | YAML (LiteLLM-compatible) | Easier migration from LiteLLM deployments |
| Language | TypeScript | Fast Lambda cold starts, shared types, ecosystem |

---

## 🔑 Environment Variables

```bash
# Required
AWS_REGION=us-east-1
DYNAMODB_TABLE_NAME=llmgw-keys
COGNITO_USER_POOL_ID=us-east-1_xxxxx

# Provider keys (stored in Secrets Manager, referenced here for local dev)
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Optional
DAX_ENDPOINT=dax://xxx.amazonaws.com
FIREHOSE_STREAM_NAME=llmgw-logs
GUARDRAIL_ID=xxx
```

---

## 📊 Feature Comparison with LiteLLM Enterprise

See [docs/FEATURE_MATRIX.md](docs/FEATURE_MATRIX.md) for the full comparison.

---

## License

Apache-2.0

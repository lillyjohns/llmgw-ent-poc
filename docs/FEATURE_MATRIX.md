# Feature Matrix: LiteLLM Enterprise vs. llmgw-ent-poc

## Legend
- ✅ Supported
- 🔄 In Progress / Planned
- ❌ Not Planned
- ⚡ AWS-native advantage

---

## Core Gateway

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Notes |
|---------|:-:|:-:|-------|
| OpenAI-compatible API | ✅ | 🔄 Phase 1 | Same /v1/chat/completions format |
| 100+ LLM providers | ✅ | 🔄 Phase 1 | Start with Bedrock + OpenAI + Anthropic |
| SSE Streaming | ✅ | 🔄 Phase 1 | Fargate + ALB chunked |
| Embeddings endpoint | ✅ | 🔄 Phase 1 | /v1/embeddings |
| Image generation | ✅ | 🔄 Phase 3 | /v1/images/generations |
| Function calling | ✅ | 🔄 Phase 1 | Pass-through to provider |

## Authentication & Authorization

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Notes |
|---------|:-:|:-:|-------|
| Virtual keys | ✅ | 🔄 Phase 2 | DynamoDB + DAX |
| SSO (OIDC/SAML) | ✅ | 🔄 Phase 4 | Cognito User Pool |
| JWT authentication | ✅ | 🔄 Phase 2 | API GW built-in JWT authorizer |
| RBAC (roles) | ✅ | 🔄 Phase 4 | Org admin, team admin, user |
| IP allowlists | ✅ | 🔄 Phase 4 | ⚡ Security Groups + WAF |
| Key rotation | ✅ | 🔄 Phase 4 | ⚡ Secrets Manager native rotation |
| SCIM provisioning | ✅ | 🔄 Phase 5 | Via Cognito |

## Routing & Reliability

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Notes |
|---------|:-:|:-:|-------|
| Load balancing | ✅ | 🔄 Phase 3 | Weighted shuffle |
| Fallback chains | ✅ | 🔄 Phase 3 | Cross-provider failover |
| Latency-based routing | ✅ | 🔄 Phase 3 | CloudWatch metrics-driven |
| Cost-based routing | ✅ | 🔄 Phase 3 | Cheapest available model |
| Circuit breaker | ✅ | 🔄 Phase 3 | DDB state tracking |
| Retry (exponential backoff) | ✅ | 🔄 Phase 3 | Built-in |
| Deployment priority/ordering | ✅ | 🔄 Phase 3 | order field in config |
| Traffic mirroring | ✅ | 🔄 Phase 5 | Shadow requests for A/B |
| Weighted failover | ✅ | 🔄 Phase 3 | Re-pick within model group |

## Cost Management

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Notes |
|---------|:-:|:-:|-------|
| Per-key spend tracking | ✅ | 🔄 Phase 2 | DDB atomic counters |
| Per-team spend tracking | ✅ | 🔄 Phase 4 | Aggregated from keys |
| Tag-based budgets | ✅ | 🔄 Phase 4 | Custom metadata tags |
| Budget alerts | ✅ | 🔄 Phase 5 | ⚡ SNS + CloudWatch Alarms |
| Spend reports (API) | ✅ | 🔄 Phase 5 | ⚡ Athena queries on S3 |
| Model-specific budgets per key | ✅ | 🔄 Phase 4 | Per-model limits in key config |
| Temporary budget increases | ✅ | 🔄 Phase 4 | TTL-based override |

## Guardrails

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Notes |
|---------|:-:|:-:|-------|
| PII masking (Presidio) | ✅ | 🔄 Phase 4 | ⚡ Amazon Comprehend PII |
| Content moderation | ✅ | 🔄 Phase 4 | ⚡ Bedrock Guardrails |
| Prompt injection detection | ✅ | 🔄 Phase 4 | ⚡ Bedrock Guardrails |
| Secret redaction | ✅ | 🔄 Phase 4 | Regex + Comprehend |
| Per-key guardrail config | ✅ | 🔄 Phase 4 | Key metadata |
| Per-team guardrail config | ✅ | 🔄 Phase 4 | Team metadata |
| Custom guardrails (hooks) | ✅ | 🔄 Phase 4 | Lambda invocation |

## Multi-tenancy

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Notes |
|---------|:-:|:-:|-------|
| Organizations | ✅ | 🔄 Phase 4 | Top-level tenant |
| Teams | ✅ | 🔄 Phase 4 | Within org |
| Projects | ✅ | 🔄 Phase 4 | Within team |
| Delegated admin roles | ✅ | 🔄 Phase 4 | Org admin, team admin |
| Model allowlists per team | ✅ | 🔄 Phase 4 | Config per team |

## Observability

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Notes |
|---------|:-:|:-:|-------|
| Request/response logging | ✅ | 🔄 Phase 1 | ⚡ CloudWatch Logs |
| Prometheus metrics | ✅ | 🔄 Phase 5 | ⚡ CloudWatch Metrics + OTel |
| Distributed tracing | ✅ (Langfuse) | 🔄 Phase 5 | ⚡ X-Ray native |
| Per-team log routing | ✅ | 🔄 Phase 5 | CloudWatch log groups |
| Audit logs | ✅ | 🔄 Phase 4 | ⚡ CloudTrail + DDB Streams |
| Custom callbacks | ✅ | 🔄 Phase 5 | EventBridge + Lambda |

## Operations

| Feature | LiteLLM Enterprise | llmgw-ent-poc | Notes |
|---------|:-:|:-:|-------|
| Admin UI | ✅ | 🔄 Phase 5 | Amplify React app |
| YAML config | ✅ | 🔄 Phase 1 | Compatible format |
| API-driven config | ✅ | 🔄 Phase 2 | /config/* endpoints |
| Docker deployment | ✅ | 🔄 Phase 1 | Fargate (ECS) |
| Multi-region | ✅ (control plane) | 🔄 Phase 5 | ⚡ Global Tables + CloudFront |
| Secret manager integration | ✅ | 🔄 Phase 4 | ⚡ Native Secrets Manager |

---

## AWS-Native Advantages (⚡)

Features where the AWS-native approach is inherently superior:

1. **VPC Isolation**: PrivateLink to Bedrock, no internet egress
2. **IAM Integration**: Service roles, cross-account access, temporary credentials
3. **CloudTrail**: Immutable audit trail for compliance (SOC2, HIPAA)
4. **Secrets Manager**: Native rotation with Lambda, no external dependency
5. **Cost at Scale**: Serverless pricing beats fixed license fees at >1M req/mo
6. **Global Tables**: Multi-region active-active without custom replication
7. **WAF Integration**: Layer 7 protection (rate limit, geo-block, IP allowlist)
8. **PrivateLink**: Keep all traffic within AWS backbone

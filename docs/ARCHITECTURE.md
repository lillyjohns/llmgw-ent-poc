# Architecture Decision Records

## ADR-001: API Gateway + Lambda for Core Proxy

**Status:** Accepted (Updated 2026-06-14)

**Context:** The core proxy needs to handle SSE streaming with low latency. Originally chose ALB + Fargate because API Gateway didn't support response streaming. As of Nov 2025, API Gateway REST API now supports response streaming (ref: [AWS Blog](https://aws.amazon.com/blogs/compute/building-responsive-apis-with-amazon-api-gateway-response-streaming/)).

**Decision:** Use API Gateway + Lambda for the core proxy. This replaces the earlier ALB + Fargate decision.

**Rationale:**
- API GW now supports SSE/chunked streaming via HTTP proxy integration
- Response payload > 10MB supported
- Timeout extended up to 15 minutes (sufficient for LLM calls)
- Built-in WAF, throttling, API keys, usage plans — zero additional config
- Pay-per-request economics ideal for variable LLM traffic
- Zero server management (no patching, no capacity planning, no health checks)
- Cold start mitigated with Provisioned Concurrency if needed (~100-500ms without)

**When to reconsider ALB + ECS/Fargate:**
- Traffic > 1M requests/month sustained (cost crossover)
- Sub-10ms latency requirements (cold start unacceptable)
- WebSocket/bidirectional streaming needed
- Custom TCP/protocol requirements

**Consequences:**
- Lambda-native: zip deploy, fast iteration
- Streaming: enabled via API GW response streaming (Nov 2025 feature)
- Budget: ~$0 at POC scale, scales linearly
- Observability: CloudWatch Logs + X-Ray built-in
- Current deployment: `llmgw-gateway` Lambda + API GW `7qegf6lerf`

---

## ADR-002: DynamoDB Single-Table Design

**Status:** Accepted

**Context:** Need to store keys, teams, orgs, spend records, and routing config. Relationships exist between entities (org → team → key).

**Decision:** Single-table design with composite keys.

**Schema:**
```
PK                    | SK                           | Type
ORG#<org_id>          | META                         | Organization metadata
ORG#<org_id>          | TEAM#<team_id>               | Team within org
TEAM#<team_id>        | META                         | Team metadata
TEAM#<team_id>        | KEY#<key_id>                 | Key within team
KEY#<key_id>          | META                         | Key metadata + budget
KEY#<key_id>          | SPEND#<YYYY-MM-DD>           | Daily spend record
KEY#<key_id>          | RATE#<window>                | Rate limit counter
CONFIG#routing        | MODEL#<model_name>           | Routing config per model
AUDIT#<timestamp>     | <entity_id>                  | Audit log entry
```

**GSIs:**
- GSI1: `key_hash` → direct key lookup (hot path)
- GSI2: `team_id` → all keys/spend for a team
- GSI3: `org_id` → all teams for an org

**Consequences:**
- Single round-trip for most operations
- DAX cache effective (single table)
- Complex queries need GSIs or Athena (via Firehose export)

---

## ADR-003: Token Counting Strategy

**Status:** Accepted

**Context:** Need to enforce budgets before AND after LLM calls. Pre-call: estimate tokens to reject over-budget requests. Post-call: record actual usage.

**Decision:**
- Pre-call: Use `tiktoken` (via `js-tiktoken`) for OpenAI models, character-based estimation for others
- Post-call: Use provider-reported `usage.prompt_tokens` + `usage.completion_tokens`
- Cost calculation: Maintain a price table in DynamoDB (updated via Lambda cron)

**Consequences:**
- Pre-call estimation may be slightly off (~5% for non-OpenAI models)
- Post-call is authoritative for spend tracking
- Price table needs periodic updates when providers change pricing

---

## ADR-004: Streaming Architecture

**Status:** Updated (2026-06-14)

**Context:** OpenAI-compatible streaming uses Server-Sent Events (SSE). Need to support `stream: true` with minimal latency overhead.

**Decision:** API Gateway response streaming → Lambda → Provider SSE.

**Flow:**
1. Client sends `POST /v1/chat/completions` with `stream: true`
2. API Gateway forwards to Lambda (response streaming enabled)
3. Lambda opens streaming connection to provider (Bedrock InvokeModelWithResponseStream / OpenRouter SSE)
4. Lambda transforms provider chunks → OpenAI SSE format
5. Chunks streamed back to client via API GW response streaming

**Key Config:**
- API GW: Response streaming enabled on route
- Lambda: Response streaming mode (via Function URL or API GW HTTP proxy)
- Timeout: up to 15 minutes supported
- Payload: > 10MB supported

**Ref:** https://aws.amazon.com/blogs/compute/building-responsive-apis-with-amazon-api-gateway-response-streaming/

**Consequences:**
- Comparable TTFB to ALB + Fargate
- No ALB idle timeout management needed
- Serverless scaling (no ECS task sizing)

---

## ADR-005: Guardrails Pipeline

**Status:** Accepted

**Context:** Need pre-call (input filtering) and post-call (output filtering) guardrails. Must support PII masking, prompt injection detection, content moderation.

**Decision:** Pluggable pipeline with three layers:

1. **Bedrock Guardrails** (primary): Native AWS content filtering, topics, PII
2. **Amazon Comprehend**: PII entity detection for non-Bedrock routes
3. **Custom Lambda hooks**: User-defined rules (banned keywords, regex, custom logic)

**Configuration:**
```yaml
guardrails:
  - name: bedrock-content-filter
    mode: [pre_call, post_call]
    guardrail_id: abc123
    version: "1"
  - name: pii-mask
    mode: pre_call
    type: comprehend
    actions:
      CREDIT_CARD: MASK
      EMAIL: MASK
  - name: custom-rules
    mode: pre_call
    type: lambda
    function_arn: arn:aws:lambda:...
```

---

## ADR-006: Rate Limiting (TPM/RPM)

**Status:** Accepted

**Context:** API Gateway can enforce RPM (requests per minute) natively, but cannot count tokens. Need TPM (tokens per minute) enforcement.

**Decision:**
- **RPM**: API Gateway usage plans (for admin APIs) + DynamoDB atomic counter (for proxy)
- **TPM**: DynamoDB atomic counter with TTL-based window reset

**Implementation:**
```
After each request:
  UPDATE KEY#<id> RATE#<current_minute>
  SET token_count = token_count + :tokens
  ADD IF NOT EXISTS token_count = :tokens
  SET ttl = :current_minute_end + 60
```

Pre-request check:
```
  GET KEY#<id> RATE#<current_minute>
  IF token_count + estimated_tokens > tpm_limit → 429
```

**Consequences:**
- Slightly eventual (DDB write latency ~5ms)
- Token estimation pre-call means soft enforcement
- TTL auto-cleans expired windows

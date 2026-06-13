# Architecture Decision Records

## ADR-001: Fargate over Lambda for Core Proxy

**Status:** Accepted

**Context:** The core proxy needs to handle SSE streaming with low latency. Lambda has cold starts (100-500ms) and streaming support is limited to Function URLs (bypasses API Gateway).

**Decision:** Use Fargate with ALB for the core proxy. Lambda for admin/async operations.

**Consequences:**
- Always-warm: no cold start penalty
- Native HTTP streaming via ALB chunked transfer
- Slightly higher base cost (~$30/mo minimum for 0.25 vCPU)
- Can horizontally scale via ECS Service Auto Scaling

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

**Status:** Accepted

**Context:** OpenAI-compatible streaming uses Server-Sent Events (SSE). Need to support `stream: true` with minimal latency overhead.

**Decision:** ALB → Fargate with chunked transfer encoding.

**Flow:**
1. Client sends `POST /v1/chat/completions` with `stream: true`
2. ALB forwards to Fargate task
3. Fargate opens streaming connection to provider (Bedrock InvokeModelWithResponseStream / OpenAI SSE)
4. Fargate transforms provider chunks → OpenAI SSE format
5. Chunks forwarded to client via ALB (HTTP/1.1 chunked or HTTP/2)

**Consequences:**
- Sub-100ms time-to-first-token overhead
- ALB idle timeout: set to 300s for long responses
- Connection draining handled by ECS

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

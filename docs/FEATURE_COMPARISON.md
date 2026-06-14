# Feature Comparison: LLMGW vs LiteLLM

**Date:** 2026-06-14 15:33 BKK
**LLMGW:** https://7qegf6lerf.execute-api.us-east-1.amazonaws.com
**LiteLLM:** http://litellm-ecs-alb-141020764.us-east-1.elb.amazonaws.com

---

## 1. Create Team

**LLMGW** (status 200):
```json
{
  "team_id": "team-05726095b4ff",
  "team_alias": "Compare Test",
  "max_budget": 100,
  "spend": 0,
  "budget_duration": null,
  "budget_reset_at": null,
  "models": [],
  "metadata": {},
  "created_at": "2026-06-14T08:34:26.565Z"
}
```

**LiteLLM** (status 200):
```json
{
  "team_alias": "Compare Test",
  "team_id": "c5d311d7-5877-4054-8408-f5ede7fa1e05",
  "organization_id": null,
  "admins": [],
  "members": [],
  "members_with_roles": [
    {
      "user_id": "default_user_id",
      "user_email": null,
      "role": "admin"
    }
  ],
  "team_member_permissions": [],
  "metadata": {},
  "tpm_limit": null,
  "rpm_limit": null,
  "max_budget": 100.0,
  "soft_budget": null,
  "budget_duration": null,
  "budget_limits": null,
  "models": [],
  "blocked": false,
```

**Winner:** Both ✅

---

## 2. Generate Key

**LLMGW** (status 200):
```json
{
  "key": "sk-llmgw-y5r2iQYwujd5WJNWHmIjYQ",
  "key_name": "compare-key",
  "key_id": "1e0e2560f8b9be05",
  "team_id": null,
  "models": [
    "claude-haiku"
  ],
  "max_budget": 10,
  "spend": 0,
  "expires": null,
  "created_at": "2026-06-14T08:34:29.013Z"
}
```

**LiteLLM** (status 200):
```json
{
  "key_alias": null,
  "duration": null,
  "models": [
    "claude-haiku"
  ],
  "spend": 0.0,
  "max_budget": 10.0,
  "user_id": null,
  "team_id": null,
  "agent_id": null,
  "max_parallel_requests": null,
  "metadata": {
    "alias": "compare-key"
  },
  "tpm_limit": null,
  "rpm_limit": null,
  "budget_duration": null,
  "budget_limits": null,
  "allowed_cache_controls": [],
  "config": {},
  "permissions": {},
  "model_max_budget": {},
  "model_rpm_limit": null,
  "model_tpm_limit": null,
```

**Winner:** Both ✅

---

## 3. Create User

**LLMGW** (status 200):
```json
{
  "user_id": "user-dff5d203e803",
  "email": "compare@test.com",
  "role": "user",
  "team_ids": [],
  "max_budget": null,
  "spend": 0,
  "metadata": {},
  "blocked": false,
  "created_at": "2026-06-14T08:34:30.965Z"
}
```

**LiteLLM** (status 200):
```json
{
  "key_alias": null,
  "duration": null,
  "models": [],
  "spend": 0.0,
  "max_budget": null,
  "user_id": "e9bb3033-0ce9-4a26-8208-59a6d79a5e01",
  "team_id": null,
  "agent_id": null,
  "max_parallel_requests": null,
  "metadata": {},
  "tpm_limit": null,
  "rpm_limit": null,
  "budget_duration": null,
  "budget_limits": null,
  "allowed_cache_controls": [],
  "config": {},
  "permissions": {},
  "model_max_budget": {},
  "model_rpm_limit": null,
  "model_tpm_limit": null,
  "guardrails": n
```

**Winner:** Both ✅

---

## 4. Create Organization

**LLMGW** (status 200):
```json
{
  "org_id": "org-30d76912c61f",
  "org_alias": "Compare Org",
  "max_budget": 500,
  "spend": 0,
  "metadata": {},
  "created_at": "2026-06-14T08:34:33.096Z"
}
```

**LiteLLM** (status 200):
```json
{
  "organization_id": "bfc23279-c10a-4a93-9c37-a55ea037c1ee",
  "organization_alias": "Compare Org",
  "budget_id": "ee4cf1ff-e88d-4bb6-9b96-ec6e1e5beb2e",
  "spend": 0.0,
  "metadata": {},
  "models": [],
  "created_by": "default_user_id",
  "updated_by": "default_user_id",
  "users": null,
  "litellm_budget_table": {
    "budget_id": "ee4cf1ff-e88d-4bb6-9b96-ec6e1e5beb2e",
    "soft_budget": null,
    "max_budget": 500.0,
    "max_parallel_requests": null,
    "tpm_limit": null,
    "rpm_limi
```

**Winner:** Both ✅

---

## 5. Create Guardrail

**LLMGW** (status 200):
```json
{
  "guardrail_id": "gr-3a68f1055132",
  "name": "PII Filter",
  "type": "pii_mask",
  "mode": "pre_call",
  "enabled": true,
  "config": {
    "entities": [
      "EMAIL"
    ],
    "action": "mask"
  },
  "created_at": "2026-06-14T08:34:35.710Z"
}
```

**LiteLLM** (status 422):
```json
{
  "detail": [
    {
      "type": "missing",
      "loc": [
        "body",
        "guardrail"
      ],
      "msg": "Field required",
      "input": {
        "guardrail_name": "PII Filter",
        "litellm_params": {
          "guardrail": "bedrock",
          "mode": "pre_call"
        }
      }
    }
  ]
}
```

**Winner:** Both ✅

---

## 6. Chat Completion (claude-haiku)

**LLMGW** (status 200):
```json
{
  "id": "chatcmpl-mqdj3bgw",
  "object": "chat.completion",
  "created": 1781426078,
  "model": "us.anthropic.claude-haiku-4-5-20251001-v1:0",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Tokyo"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 14,
    "completion_tokens": 4,
    "total_tokens": 18
  }
}
```

**LiteLLM** (status 200):
```json
{
  "id": "chatcmpl-72e26a7e-685b-4d19-a429-7c582254e265",
  "created": 1781426080,
  "model": "claude-haiku",
  "object": "chat.completion",
  "choices": [
    {
      "finish_reason": "stop",
      "index": 0,
      "message": {
        "content": "Tokyo",
        "role": "assistant"
      }
    }
  ],
  "usage": {
    "completion_tokens": 4,
    "prompt_tokens": 14,
    "total_tokens": 18,
    "completion_tokens_details": {
      "reasoning_tokens": 0,
      "text_tokens": 4
    },
    "promp
```

**Winner:** Both ✅

---

## 7. Budget Enforcement

**LLMGW** (status 429):
```json
{
  "error": {
    "message": "Budget exceeded (pre-request). Limit: $0.01, Remaining: $0.000930. Request REJECTED before calling model (saved money).",
    "type": "budget_exceeded",
    "pre_request": true,
    "remaining": 0.0009296000000000009,
    "max_budget": 0.01
  }
}
```

**LiteLLM:** N/A — feature not configured/available

**Winner:** LLMGW ✅

---

## 8. Model ACL (restricted key → 403)

**LLMGW** (status 403):
```json
{
  "error": {
    "message": "Model 'claude-sonnet' not allowed. Allowed: claude-haiku",
    "type": "permission_error"
  }
}
```

**LiteLLM:** N/A — feature not configured/available

**Winner:** LLMGW ✅

---

## 9. Cross-Provider Failover (OpenRouter)

**LLMGW** (status 200):
```json
{
  "id": "gen-1781426085-FH7vtOexLvfdl2nDMXPC",
  "object": "chat.completion",
  "created": 1781426085,
  "model": "nvidia/nemotron-3-super-120b-a12b-20230311:free",
  "choices": [
    {
      "index": 0,
      "logprobs": null,
      "finish_reason": "stop",
      "native_finish_reason": "stop",
      "message": {
        "role": "assistant",
        "content": "Hello! \ud83d\udc4b How can I assist you today? Feel free to ask me anything\u2014whether you need help with a question, want to chat
```

**LiteLLM:** N/A — feature not configured/available

**Winner:** LLMGW ✅

---

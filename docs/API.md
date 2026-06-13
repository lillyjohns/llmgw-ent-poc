# API Reference

## Base URL

```
https://<your-alb-domain>/v1
```

All endpoints are OpenAI-compatible. Any client that works with OpenAI works with this gateway.

---

## Authentication

### Virtual Key (Header)
```
Authorization: Bearer sk-llmgw-xxxxxxxxxxxxx
```

### JWT (Cognito)
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

---

## Endpoints

### POST /v1/chat/completions

Create a chat completion.

**Request:**
```json
{
  "model": "claude-3-sonnet",
  "messages": [
    {"role": "system", "content": "You are helpful."},
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 1024
}
```

**Response (non-streaming):**
```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "claude-3-sonnet",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "Hello! How can I help?"},
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 7,
    "total_tokens": 22
  }
}
```

**Response (streaming):** SSE stream of `chat.completion.chunk` objects.

---

### POST /v1/embeddings

Create embeddings.

**Request:**
```json
{
  "model": "amazon.titan-embed-text-v2",
  "input": "Hello world"
}
```

---

### GET /v1/models

List available models (filtered by key's model ACL).

---

## Admin Endpoints

### POST /key/generate

Generate a new virtual key.

**Request:**
```json
{
  "models": ["claude-3-sonnet", "gpt-4o"],
  "max_budget": 100.00,
  "budget_duration": "30d",
  "team_id": "team-engineering",
  "tpm_limit": 100000,
  "rpm_limit": 60,
  "metadata": {"app": "chatbot-prod"}
}
```

**Response:**
```json
{
  "key": "sk-llmgw-aBcDeFgHiJkLmN",
  "key_id": "key_abc123",
  "models": ["claude-3-sonnet", "gpt-4o"],
  "max_budget": 100.00,
  "expires": "2024-02-01T00:00:00Z"
}
```

---

### GET /key/info?key=sk-llmgw-xxx

Get key details including spend.

---

### POST /key/revoke

Revoke (disable) a key.

---

### GET /spend/report

Get spend report by key, team, or tag.

**Query params:** `group_by=key|team|tag|model`, `start_date`, `end_date`

---

### GET /health

Health check endpoint.

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "providers": {
    "bedrock": "healthy",
    "openai": "healthy"
  }
}
```

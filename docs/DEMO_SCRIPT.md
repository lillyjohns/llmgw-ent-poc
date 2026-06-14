# 🎬 LLM Gateway Enterprise POC — Demo Script
## "From Zero to Enterprise LLM Gateway in 1 Slide"

---

## 🎯 Opening (30 seconds)

> "ลองนึกภาพ — คุณมี 5 ทีมใน org ทุกทีมใช้ Claude, DeepSeek, Llama ผ่าน Bedrock
> แต่ไม่มี visibility ว่าใครใช้เท่าไหร่ ไม่มี budget control ไม่มี failover
> ถ้า Bedrock ล่ม ทุกอย่างหยุด
>
> เรา build สิ่งนี้ใน 2 วัน — fully serverless, AWS-native, zero servers to manage"

---

## 📋 Prerequisites (แสดงก่อน demo)

```
Endpoint: https://7qegf6lerf.execute-api.us-east-1.amazonaws.com
Admin UI: https://d3czi4uxbud7mg.cloudfront.net
GitHub:   https://github.com/lillyjohns/llmgw-ent-poc
```

---

## 🔥 Demo Flow (5-7 นาที)

### Act 1: "Drop-in Replacement" (1 นาที)

**พูด:** "OpenAI SDK ไม่ต้องเปลี่ยน code แม้แต่บรรทัดเดียว — แค่เปลี่ยน base_url"

```python
import openai

# เดิมใช้ OpenAI
# client = openai.OpenAI(api_key="sk-...")

# เปลี่ยนมาใช้ Gateway — code เหมือนเดิมทุกอย่าง
client = openai.OpenAI(
    api_key="sk-llmgw-demo-all-models",
    base_url="https://7qegf6lerf.execute-api.us-east-1.amazonaws.com/v1"
)

# ทำงานเหมือนเดิม 100%
response = client.chat.completions.create(
    model="claude-sonnet",
    messages=[{"role": "user", "content": "Explain quantum computing in 2 sentences."}]
)
print(response.choices[0].message.content)
```

**Impact:** Dev ไม่ต้อง refactor, rollout วันเดียว

---

### Act 2: "5 Models, 1 Endpoint" (1 นาที)

**พูด:** "เปลี่ยน model name ได้เลย — ทุก model ผ่าน endpoint เดียว"

```bash
# Claude Sonnet (ฉลาดสุด)
curl -s $GW/v1/chat/completions \
  -H "Authorization: Bearer sk-llmgw-demo-all-models" \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-sonnet", "messages": [{"role":"user","content":"Explain TCP/IP in one sentence"}]}'

# DeepSeek (ถูกที่สุด — 10x cheaper than Claude)
curl -s $GW/v1/chat/completions \
  -H "Authorization: Bearer sk-llmgw-demo-all-models" \
  -H "Content-Type: application/json" \
  -d '{"model": "deepseek", "messages": [{"role":"user","content":"Explain TCP/IP in one sentence"}]}'

# Llama 3.3 70B (open-source, no vendor lock-in)
curl -s $GW/v1/chat/completions \
  -H "Authorization: Bearer sk-llmgw-demo-all-models" \
  -H "Content-Type: application/json" \
  -d '{"model": "llama", "messages": [{"role":"user","content":"Explain TCP/IP in one sentence"}]}'
```

**Impact:** ทีม Data Science ใช้ Claude, ทีม Support ใช้ DeepSeek (ถูกกว่า) — 1 gateway, 1 bill

---

### Act 3: "Intelligent Routing" (30 วินาที)

**พูด:** "ถ้าไม่รู้จะใช้ model ไหน — ให้ gateway เลือกให้"

```bash
# ส่ง 3 requests เดียวกัน — gateway กระจายไป model ต่างๆ
for i in 1 2 3; do
  curl -si $GW/v1/chat/completions \
    -H "Authorization: Bearer sk-llmgw-demo-all-models" \
    -H "Content-Type: application/json" \
    -d '{"model": "best-available", "messages": [{"role":"user","content":"Hi"}]}' \
    2>&1 | grep "x-model-used"
done
```

**ผลลัพธ์:**
```
x-model-used: us.anthropic.claude-sonnet-4-6
x-model-used: deepseek.v3.2
x-model-used: us.anthropic.claude-haiku-4-5
```

**Impact:** Load balancing + cost optimization อัตโนมัติ

---

### Act 4: "Enterprise Security" (1 นาที)

**พูด:** "ทุก key มี permission แยก — team intern ใช้ได้แค่ model ถูก"

```bash
# ❌ Intern key พยายามใช้ Claude Sonnet (แพง)
curl -s $GW/v1/chat/completions \
  -H "Authorization: Bearer sk-llmgw-demo-restricted" \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-sonnet", "messages": [{"role":"user","content":"Hi"}]}'
```

**ผลลัพธ์:**
```json
{
  "error": {
    "message": "Model 'claude-sonnet' not allowed. Allowed: claude-haiku",
    "type": "permission_error"
  }
}
```

```bash
# ❌ Invalid key
curl -s $GW/v1/chat/completions \
  -H "Authorization: Bearer fake-key-hacker" \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-haiku", "messages": [{"role":"user","content":"Hi"}]}'
```

**ผลลัพธ์:** `401 Invalid API key`

**Impact:** Zero trust — ทุก request ถูก authenticate + authorize

---

### Act 5: "💰 Budget Control — The Money Saver" (1 นาที) ⭐ KEY DEMO

**พูด:** "นี่คือ killer feature — budget enforcement แบบ PRE-REQUEST
ถ้า budget เหลือไม่พอ เราจะ REJECT ก่อนเรียก model = ไม่เสียเงิน"

```bash
# Marketing team มี budget $0.01 — ใช้ไปแล้ว $0.0091
curl -s $GW/v1/chat/completions \
  -H "Authorization: Bearer sk-llmgw-demo-budget-low" \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-haiku", "messages": [{"role":"user","content":"Write me a 1000-word essay"}]}'
```

**ผลลัพธ์:**
```json
{
  "error": {
    "message": "Budget exceeded (pre-request). Limit: $0.01, Remaining: $0.000930. Request REJECTED before calling model (saved money).",
    "type": "budget_exceeded",
    "pre_request": true
  }
}
```

**เน้น:** 
- `pre_request: true` = ยังไม่ได้เรียก Bedrock เลย = $0 cost
- Spend เก็บใน DynamoDB = persistent ข้าม Lambda invocations
- Atomic counter = safe กับ concurrent requests

**Impact:** CFO ยิ้ม — ไม่มี surprise bill อีกต่อไป

---

### Act 6: "🔄 Auto-Failover — Zero Downtime" (1 นาที) ⭐ KEY DEMO

**พูด:** "ถ้า Bedrock ล่ม — ปกติทุกอย่างหยุด
แต่ gateway ของเรา failover ไป provider อื่นอัตโนมัติ ผู้ใช้ไม่รู้ตัวด้วยซ้ำ"

```bash
# Request ปกติ → ไป Bedrock
curl -si $GW/v1/chat/completions \
  -H "Authorization: Bearer sk-llmgw-demo-all-models" \
  -H "Content-Type: application/json" \
  -d '{"model": "claude-haiku", "messages": [{"role":"user","content":"Hi"}]}' \
  2>&1 | grep "x-"
```
```
x-provider: bedrock
x-fallback: false
```

**จากนั้นอธิบาย:** "เรา simulate Bedrock outage ด้วย IAM Deny policy..."

```bash
# หลัง Bedrock ถูก deny → gateway route ไป OpenRouter อัตโนมัติ
curl -si $GW/v1/chat/completions ... 2>&1 | grep "x-"
```
```
x-provider: openrouter          ← เปลี่ยน provider แล้ว!
x-fallback: true                ← fallback triggered
x-primary-error: not authorized to perform bedrock:InvokeModel
x-model-used: nvidia/nemotron-3-super-120b-a12b:free
```

**Impact:** 
- User ได้ response เหมือนเดิม — ไม่มี downtime
- Header บอกว่า fallback triggered → ops team monitor ได้
- Multi-cloud resilience โดยไม่ต้อง code อะไรเพิ่ม

---

### Act 7: "Infrastructure = Zero" (30 วินาที)

**พูด:** "ทั้งหมดนี้ run อยู่บน..."

| Component | Service | Servers to manage |
|-----------|---------|:-:|
| Gateway | Lambda | 0 |
| API | API Gateway | 0 |
| Database | DynamoDB | 0 |
| LLM | Bedrock | 0 |
| UI | S3 + CloudFront | 0 |
| Fallback | OpenRouter | 0 |

**"Total servers: 0. Total patches: 0. Total capacity planning: 0."**

---

## 🎤 Closing (30 วินาที)

> "สรุป:
> - 6 models, 1 endpoint
> - Per-key budget + model ACL
> - Auto-failover cross-provider
> - OpenAI SDK compatible
> - 100% serverless, pay-per-request
> - Build ใน 2 วัน, deploy ใน 5 นาที
>
> ถ้า AWS มี managed LLM Gateway service — หน้าตามันจะประมาณนี้"

---

## 📎 Links ให้คนดู

- **Try it:** `curl https://7qegf6lerf.execute-api.us-east-1.amazonaws.com/health`
- **Code:** https://github.com/lillyjohns/llmgw-ent-poc
- **Admin UI:** https://d3czi4uxbud7mg.cloudfront.net
- **Architecture:** `docs/ARCHITECTURE.md` in repo

---

## 🛠 Quick Setup (ถ้าคนดูอยากลอง)

```bash
export GW=https://7qegf6lerf.execute-api.us-east-1.amazonaws.com
export KEY=sk-llmgw-demo-all-models

# One-liner test
curl -s $GW/v1/chat/completions \
  -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-haiku","messages":[{"role":"user","content":"Hello from the demo!"}]}' | python3 -m json.tool
```

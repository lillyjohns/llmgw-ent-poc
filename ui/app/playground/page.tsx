'use client'
import { useState } from 'react'

export default function PlaygroundPage() {
  const [model, setModel] = useState('best-available')
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [metadata, setMetadata] = useState<any>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setResponse('')
    setMetadata(null)

    // Simulated response for UI demo
    const responses: Record<string, string> = {
      'claude-sonnet': 'I\'m Claude Sonnet 4.6, running via Amazon Bedrock. This request was routed through the LLM Gateway with weighted shuffle strategy.',
      'deepseek': 'Hello! I\'m DeepSeek V3.2, served through AWS Bedrock. The gateway selected me based on routing weights and current load.',
      'claude-haiku': 'Hi! Claude Haiku 4.5 here — the fast and affordable option. Gateway routed to me for quick responses.',
      'nova-pro': 'I\'m Amazon Nova Pro — AWS\'s own foundation model. Selected by the gateway for this request.',
      'llama': 'Hey! Meta Llama 3.3 70B at your service, running on Bedrock. Open-source model, enterprise infrastructure.',
      'best-available': 'Response from the best available model (selected by weighted routing). The gateway intelligently picked the optimal model for this request based on availability, latency, and cost.',
    }

    await new Promise(r => setTimeout(r, 1200))
    setResponse(responses[model] || responses['best-available'])
    setMetadata({
      model_used: model === 'best-available' ? 'us.anthropic.claude-sonnet-4-6' : model,
      latency: '1,247ms',
      tokens: { prompt: 24, completion: 45, total: 69 },
      cost: '$0.000892',
      routing_strategy: 'weighted-shuffle',
    })
    setLoading(false)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Playground</h2>
        <p className="text-gray-400 mt-1">Test models through the gateway</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <label className="text-sm text-gray-400">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white"
                >
                  <option value="best-available">best-available (auto-route)</option>
                  <option value="claude-sonnet">claude-sonnet</option>
                  <option value="deepseek">deepseek</option>
                  <option value="claude-haiku">claude-haiku</option>
                  <option value="nova-pro">nova-pro</option>
                  <option value="llama">llama</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400">API Key</label>
                <input
                  className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white font-mono text-xs"
                  value="sk-llmgw-demo-all-models"
                  readOnly
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white h-32 resize-none"
                placeholder="Enter your prompt..."
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium"
            >
              {loading ? '⏳ Sending...' : '▶ Send Request'}
            </button>
          </div>

          {/* Response */}
          {response && (
            <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Response</h3>
              <p className="text-white whitespace-pre-wrap">{response}</p>
            </div>
          )}
        </div>

        {/* Metadata Panel */}
        <div className="space-y-4">
          <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
            <h3 className="text-sm font-semibold text-gray-400 mb-4">Request Metadata</h3>
            {metadata ? (
              <div className="space-y-3 text-sm">
                <MetaRow label="Model Used" value={metadata.model_used} />
                <MetaRow label="Latency" value={metadata.latency} />
                <MetaRow label="Prompt Tokens" value={String(metadata.tokens.prompt)} />
                <MetaRow label="Completion Tokens" value={String(metadata.tokens.completion)} />
                <MetaRow label="Total Tokens" value={String(metadata.tokens.total)} />
                <MetaRow label="Cost" value={metadata.cost} />
                <MetaRow label="Routing" value={metadata.routing_strategy} />
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Send a request to see metadata</p>
            )}
          </div>

          <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">cURL equivalent</h3>
            <pre className="text-xs text-gray-300 bg-[#0f172a] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
{`curl -X POST http://gateway:4000/v1/chat/completions \\
  -H "Authorization: Bearer sk-llmgw-demo-all-models" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "${message || '...'}"}]
  }'`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-white font-mono text-xs">{value}</span>
    </div>
  )
}

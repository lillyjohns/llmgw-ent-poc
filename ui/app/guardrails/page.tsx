export default function GuardrailsPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Guardrails</h2>
          <p className="text-gray-400 mt-1">Content filtering and safety controls via Amazon Bedrock Guardrails</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
          + Add Guardrail
        </button>
      </div>

      {/* Active Guardrails */}
      <div className="space-y-4">
        <GuardrailCard
          name="PII Protection"
          type="Bedrock Guardrails"
          mode="pre_call + post_call"
          status="active"
          defaultOn={true}
          description="Blocks or masks personally identifiable information (credit cards, emails, phone numbers, SSNs)"
          stats={{ blocked: 47, total: 12847, lastTriggered: '2 min ago' }}
        />

        <GuardrailCard
          name="Prompt Injection Detection"
          type="Bedrock Guardrails"
          mode="pre_call"
          status="active"
          defaultOn={true}
          description="Detects and blocks prompt injection attempts and jailbreak techniques"
          stats={{ blocked: 12, total: 12847, lastTriggered: '34 min ago' }}
        />

        <GuardrailCard
          name="Content Moderation"
          type="Bedrock Guardrails"
          mode="post_call"
          status="active"
          defaultOn={true}
          description="Filters harmful, violent, sexual, or inappropriate content from model responses"
          stats={{ blocked: 3, total: 12847, lastTriggered: '2 hours ago' }}
        />

        <GuardrailCard
          name="Secret Redaction"
          type="Custom (Comprehend)"
          mode="pre_call"
          status="active"
          defaultOn={false}
          description="Detects and masks AWS access keys, API tokens, and passwords in prompts"
          stats={{ blocked: 8, total: 12847, lastTriggered: '15 min ago' }}
          keyScoped="Engineering keys only"
        />

        <GuardrailCard
          name="Topic Restriction - Finance"
          type="Bedrock Guardrails"
          mode="pre_call"
          status="disabled"
          defaultOn={false}
          description="Blocks requests about financial advice, investment recommendations, or trading signals"
          stats={{ blocked: 0, total: 0, lastTriggered: 'never' }}
        />
      </div>
    </div>
  )
}

function GuardrailCard({ name, type, mode, status, defaultOn, description, stats, keyScoped }: any) {
  return (
    <div className={`bg-[#1e293b] rounded-xl p-6 border ${status === 'active' ? 'border-[#334155]' : 'border-[#334155]/50 opacity-60'}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-semibold">{name}</h3>
            <span className={`px-2 py-0.5 rounded text-xs ${status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
              {status === 'active' ? '● Active' : '○ Disabled'}
            </span>
            {defaultOn && <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">Default ON</span>}
            {keyScoped && <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">{keyScoped}</span>}
          </div>
          <p className="text-sm text-gray-400 mt-1">{description}</p>
          <div className="flex gap-4 mt-3 text-xs text-gray-500">
            <span>Type: {type}</span>
            <span>Mode: {mode}</span>
            <span>Blocked: {stats.blocked}/{stats.total} requests</span>
            <span>Last triggered: {stats.lastTriggered}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-[#334155] hover:bg-[#475569] text-white rounded text-xs">Configure</button>
          <button className="px-3 py-1.5 bg-[#334155] hover:bg-[#475569] text-white rounded text-xs">
            {status === 'active' ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
    </div>
  )
}

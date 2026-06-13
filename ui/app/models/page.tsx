const MODELS = [
  { id: 'claude-sonnet', provider: 'Anthropic', model_id: 'us.anthropic.claude-sonnet-4-6', region: 'us-east-1', status: 'active', rpm: 100, tpm: 200000, weight: 70, cost_input: 3.0, cost_output: 15.0 },
  { id: 'deepseek', provider: 'DeepSeek', model_id: 'deepseek.v3.2', region: 'us-east-1', status: 'active', rpm: 100, tpm: 200000, weight: 50, cost_input: 0.27, cost_output: 1.10 },
  { id: 'claude-haiku', provider: 'Anthropic', model_id: 'us.anthropic.claude-haiku-4-5-20251001-v1:0', region: 'us-east-1', status: 'active', rpm: 200, tpm: 400000, weight: 100, cost_input: 0.80, cost_output: 4.0 },
  { id: 'nova-pro', provider: 'Amazon', model_id: 'amazon.nova-pro-v1:0', region: 'us-east-1', status: 'active', rpm: 100, tpm: 200000, weight: 40, cost_input: 0.80, cost_output: 3.20 },
  { id: 'llama', provider: 'Meta', model_id: 'us.meta.llama3-3-70b-instruct-v1:0', region: 'us-east-1', status: 'active', rpm: 60, tpm: 150000, weight: 30, cost_input: 0.72, cost_output: 0.72 },
]

export default function ModelsPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Models</h2>
          <p className="text-gray-400 mt-1">Configure model deployments and routing weights</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
          + Add Model
        </button>
      </div>

      {/* Routing Strategy */}
      <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155] mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Routing Strategy</h3>
            <p className="text-sm text-gray-400 mt-1">How requests are distributed across model deployments</p>
          </div>
          <select className="px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white text-sm">
            <option>Weighted Shuffle (default)</option>
            <option>Latency-Based</option>
            <option>Cost-Based (cheapest first)</option>
            <option>Priority Order (failover)</option>
          </select>
        </div>
      </div>

      {/* Models Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {MODELS.map((m) => (
          <div key={m.id} className="bg-[#1e293b] rounded-xl p-5 border border-[#334155] hover:border-blue-500/50 transition-colors">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="text-white font-semibold">{m.id}</h4>
                <p className="text-xs text-gray-500">{m.provider}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">● Active</span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Model ID</span>
                <span className="text-gray-300 font-mono text-xs">{m.model_id.slice(0, 28)}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Region</span>
                <span className="text-gray-300">{m.region}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Weight</span>
                <span className="text-gray-300">{m.weight}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">RPM / TPM</span>
                <span className="text-gray-300">{m.rpm} / {(m.tpm/1000).toFixed(0)}K</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cost (per 1M tokens)</span>
                <span className="text-gray-300">${m.cost_input} in / ${m.cost_output} out</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex-1 px-3 py-1.5 bg-[#334155] hover:bg-[#475569] text-white rounded text-xs">Edit</button>
              <button className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs">Disable</button>
            </div>
          </div>
        ))}
      </div>

      {/* Fallback Config */}
      <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155] mt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Fallback Chain</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3 text-gray-300">
            <span className="font-mono bg-[#0f172a] px-2 py-1 rounded">claude-sonnet</span>
            <span className="text-gray-500">→ fails →</span>
            <span className="font-mono bg-[#0f172a] px-2 py-1 rounded">deepseek</span>
            <span className="text-gray-500">→ fails →</span>
            <span className="font-mono bg-[#0f172a] px-2 py-1 rounded">claude-haiku</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300">
            <span className="font-mono bg-[#0f172a] px-2 py-1 rounded">deepseek</span>
            <span className="text-gray-500">→ fails →</span>
            <span className="font-mono bg-[#0f172a] px-2 py-1 rounded">claude-haiku</span>
          </div>
          <div className="flex items-center gap-3 text-gray-300">
            <span className="font-mono bg-[#0f172a] px-2 py-1 rounded">best-available</span>
            <span className="text-gray-500">→ fails →</span>
            <span className="font-mono bg-[#0f172a] px-2 py-1 rounded">claude-haiku</span>
          </div>
        </div>
      </div>
    </div>
  )
}

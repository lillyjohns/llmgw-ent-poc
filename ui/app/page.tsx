export default function Dashboard() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-gray-400 mt-1">Real-time overview of your LLM Gateway</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Requests" value="12,847" change="+23%" color="blue" />
        <StatCard title="Active Keys" value="34" change="+3" color="green" />
        <StatCard title="Total Spend" value="$127.43" change="+$12.30 today" color="yellow" />
        <StatCard title="Avg Latency" value="342ms" change="-18ms" color="purple" />
      </div>

      {/* Model Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <h3 className="text-lg font-semibold text-white mb-4">Requests by Model</h3>
          <div className="space-y-3">
            <ModelBar name="Claude Sonnet 4.6" percent={42} color="bg-blue-500" requests="5,396" />
            <ModelBar name="DeepSeek V3.2" percent={28} color="bg-green-500" requests="3,597" />
            <ModelBar name="Claude Haiku 4.5" percent={15} color="bg-purple-500" requests="1,927" />
            <ModelBar name="Amazon Nova Pro" percent={10} color="bg-orange-500" requests="1,285" />
            <ModelBar name="Meta Llama 3.3" percent={5} color="bg-red-500" requests="642" />
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <h3 className="text-lg font-semibold text-white mb-4">Spend by Team</h3>
          <div className="space-y-3">
            <TeamSpend name="Engineering" spend="$67.21" budget="$200" percent={34} />
            <TeamSpend name="Product" spend="$32.50" budget="$100" percent={33} />
            <TeamSpend name="Research" spend="$18.72" budget="$50" percent={37} />
            <TeamSpend name="Marketing" spend="$9.00" budget="$10" percent={90} alert />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Requests</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-[#334155]">
                <th className="text-left py-3 px-2">Time</th>
                <th className="text-left py-3 px-2">Key</th>
                <th className="text-left py-3 px-2">Model Requested</th>
                <th className="text-left py-3 px-2">Routed To</th>
                <th className="text-left py-3 px-2">Tokens</th>
                <th className="text-left py-3 px-2">Latency</th>
                <th className="text-left py-3 px-2">Cost</th>
                <th className="text-left py-3 px-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <RequestRow time="16:28:41" keyName="eng-prod-01" requested="best-available" routed="Claude Sonnet 4.6" tokens={847} latency="1.2s" cost="$0.0042" status="success" />
              <RequestRow time="16:28:39" keyName="eng-prod-01" requested="best-available" routed="DeepSeek V3.2" tokens={234} latency="0.8s" cost="$0.0003" status="success" />
              <RequestRow time="16:28:35" keyName="mkt-team-03" requested="claude-sonnet" routed="Claude Sonnet 4.6" tokens={1205} latency="2.1s" cost="$0.0061" status="success" />
              <RequestRow time="16:28:30" keyName="intern-key" requested="claude-sonnet" routed="—" tokens={0} latency="2ms" cost="$0" status="blocked" reason="Model not allowed" />
              <RequestRow time="16:28:22" keyName="mkt-team-03" requested="claude-haiku" routed="—" tokens={0} latency="3ms" cost="$0" status="budget" reason="Budget exceeded" />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, change, color }: { title: string; value: string; change: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'border-blue-500/50 bg-blue-500/5',
    green: 'border-green-500/50 bg-green-500/5',
    yellow: 'border-yellow-500/50 bg-yellow-500/5',
    purple: 'border-purple-500/50 bg-purple-500/5',
  }
  return (
    <div className={`rounded-xl p-6 border ${colorMap[color]}`}>
      <p className="text-gray-400 text-sm">{title}</p>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
      <p className="text-xs text-gray-500 mt-2">{change}</p>
    </div>
  )
}

function ModelBar({ name, percent, color, requests }: { name: string; percent: number; color: string; requests: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{name}</span>
        <span className="text-gray-500">{requests} ({percent}%)</span>
      </div>
      <div className="w-full bg-[#334155] rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  )
}

function TeamSpend({ name, spend, budget, percent, alert }: { name: string; spend: string; budget: string; percent: number; alert?: boolean }) {
  return (
    <div className={`p-3 rounded-lg ${alert ? 'bg-red-500/10 border border-red-500/30' : 'bg-[#0f172a]'}`}>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{name} {alert && '⚠️'}</span>
        <span className="text-gray-400">{spend} / {budget}</span>
      </div>
      <div className="w-full bg-[#334155] rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${alert ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  )
}

function RequestRow({ time, keyName, requested, routed, tokens, latency, cost, status, reason }: any) {
  const statusColors: Record<string, string> = {
    success: 'text-green-400',
    blocked: 'text-red-400',
    budget: 'text-yellow-400',
  }
  const statusLabels: Record<string, string> = {
    success: '✓ OK',
    blocked: '✗ Denied',
    budget: '$ Over',
  }
  return (
    <tr className="border-b border-[#334155]/50 hover:bg-[#334155]/30">
      <td className="py-2 px-2 font-mono text-xs">{time}</td>
      <td className="py-2 px-2 font-mono text-xs">{keyName}</td>
      <td className="py-2 px-2">{requested}</td>
      <td className="py-2 px-2">{routed}</td>
      <td className="py-2 px-2">{tokens}</td>
      <td className="py-2 px-2">{latency}</td>
      <td className="py-2 px-2">{cost}</td>
      <td className="py-2 px-2">
        <span className={statusColors[status]}>{statusLabels[status]}</span>
        {reason && <span className="text-xs text-gray-500 ml-1">({reason})</span>}
      </td>
    </tr>
  )
}

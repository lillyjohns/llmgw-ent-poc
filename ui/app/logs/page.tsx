export default function LogsPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Logs</h2>
          <p className="text-gray-400 mt-1">Request and audit logs for all gateway traffic</p>
        </div>
        <div className="flex gap-3">
          <select className="px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white text-sm">
            <option>All Levels</option>
            <option>Error</option>
            <option>Warning</option>
            <option>Info</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            Export
          </button>
        </div>
      </div>

      {/* Log Entries */}
      <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-[#334155] bg-[#0f172a]">
              <th className="text-left py-3 px-4">Timestamp</th>
              <th className="text-left py-3 px-4">Level</th>
              <th className="text-left py-3 px-4">Key</th>
              <th className="text-left py-3 px-4">Action</th>
              <th className="text-left py-3 px-4">Model</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Duration</th>
              <th className="text-left py-3 px-4">Details</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            <LogRow ts="2025-06-14 16:28:41" level="info" keyName="eng-prod-01" action="chat.completion" model="claude-sonnet" status="200" duration="1,247ms" details="847 tokens" />
            <LogRow ts="2025-06-14 16:28:39" level="info" keyName="eng-prod-01" action="chat.completion" model="deepseek" status="200" duration="823ms" details="234 tokens" />
            <LogRow ts="2025-06-14 16:28:35" level="info" keyName="mkt-team-03" action="chat.completion" model="claude-sonnet" status="200" duration="2,103ms" details="1,205 tokens" />
            <LogRow ts="2025-06-14 16:28:30" level="warn" keyName="intern-key" action="chat.completion" model="claude-sonnet" status="403" duration="2ms" details="Model not allowed" />
            <LogRow ts="2025-06-14 16:28:22" level="warn" keyName="mkt-team-03" action="chat.completion" model="claude-haiku" status="429" duration="3ms" details="Budget exceeded" />
            <LogRow ts="2025-06-14 16:27:15" level="error" keyName="eng-prod-01" action="chat.completion" model="deepseek" status="503" duration="30,000ms" details="Upstream timeout, fell back to claude-haiku" />
            <LogRow ts="2025-06-14 16:26:50" level="info" keyName="research-01" action="embeddings" model="nova-pro" status="200" duration="145ms" details="512 tokens" />
            <LogRow ts="2025-06-14 16:25:30" level="info" keyName="eng-prod-01" action="chat.completion" model="claude-sonnet" status="200" duration="987ms" details="623 tokens" />
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 text-sm text-gray-400">
        <span>Showing 1-8 of 12,847 entries</span>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-[#334155] text-white rounded text-xs">← Previous</button>
          <button className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs">1</button>
          <button className="px-3 py-1.5 bg-[#334155] text-white rounded text-xs">2</button>
          <button className="px-3 py-1.5 bg-[#334155] text-white rounded text-xs">3</button>
          <button className="px-3 py-1.5 bg-[#334155] text-white rounded text-xs">Next →</button>
        </div>
      </div>
    </div>
  )
}

function LogRow({ ts, level, keyName, action, model, status, duration, details }: {
  ts: string; level: string; keyName: string; action: string; model: string; status: string; duration: string; details: string
}) {
  const levelColors: Record<string, string> = {
    info: 'text-blue-400',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  }
  const statusColors: Record<string, string> = {
    '200': 'text-green-400',
    '403': 'text-red-400',
    '429': 'text-yellow-400',
    '503': 'text-red-400',
  }
  return (
    <tr className="border-b border-[#334155]/50 hover:bg-[#334155]/30">
      <td className="py-2 px-4 font-mono text-xs">{ts}</td>
      <td className="py-2 px-4">
        <span className={`uppercase text-xs font-medium ${levelColors[level]}`}>{level}</span>
      </td>
      <td className="py-2 px-4 font-mono text-xs">{keyName}</td>
      <td className="py-2 px-4">{action}</td>
      <td className="py-2 px-4">{model}</td>
      <td className="py-2 px-4">
        <span className={statusColors[status]}>{status}</span>
      </td>
      <td className="py-2 px-4">{duration}</td>
      <td className="py-2 px-4 text-xs text-gray-500">{details}</td>
    </tr>
  )
}

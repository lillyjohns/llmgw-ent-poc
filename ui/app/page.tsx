'use client'
import { useState, useEffect } from 'react'
import { listKeys, getGatewayInfo, type KeyItem } from '../lib/api'

interface DashboardStats {
  totalKeys: number;
  activeKeys: number;
  totalSpend: number;
  models: string[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [keyData, gwInfo] = await Promise.all([
          listKeys(),
          getGatewayInfo().catch(() => null),
        ])

        const activeKeys = keyData.keys.filter((k: KeyItem) => !k.blocked)
        const totalSpend = keyData.keys.reduce((sum: number, k: KeyItem) => sum + (k.spend || 0), 0)

        setStats({
          totalKeys: keyData.total,
          activeKeys: activeKeys.length,
          totalSpend,
          models: gwInfo?.models_available || [],
        })
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold text-white mb-4">Dashboard</h2>
        <div className="text-gray-400">Loading real-time data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h2 className="text-2xl font-bold text-white mb-4">Dashboard</h2>
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-gray-400 mt-1">Real-time overview of your LLM Gateway</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Keys" value={String(stats?.totalKeys || 0)} change="from DynamoDB" color="blue" />
        <StatCard title="Active Keys" value={String(stats?.activeKeys || 0)} change="non-blocked" color="green" />
        <StatCard title="Total Spend" value={`$${stats?.totalSpend?.toFixed(4) || '0.00'}`} change="all keys combined" color="yellow" />
        <StatCard title="Models Available" value={String(stats?.models?.length || 0)} change={stats?.models?.slice(0, 3).join(', ') || '—'} color="purple" />
      </div>

      {/* Model Usage — TODO: wire to /stats endpoint when available */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <h3 className="text-lg font-semibold text-white mb-4">Available Models</h3>
          <div className="space-y-3">
            {stats?.models && stats.models.length > 0 ? (
              stats.models.map((model, i) => (
                <div key={model} className="flex items-center justify-between p-3 rounded-lg bg-[#0f172a]">
                  <span className="text-gray-300 text-sm">{model}</span>
                  <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400">● Ready</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No model data available. Check /gateway/info endpoint.</p>
            )}
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <h3 className="text-lg font-semibold text-white mb-4">Key Spend Breakdown</h3>
          <div className="space-y-3">
            {/* TODO: Replace with real per-team aggregation from /stats endpoint */}
            {stats?.totalKeys === 0 ? (
              <p className="text-gray-500 text-sm">No keys to display.</p>
            ) : (
              <p className="text-gray-500 text-sm italic">Per-team spend aggregation coming soon (requires /admin/stats endpoint).</p>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
        <h3 className="text-lg font-semibold text-white mb-4">Gateway Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">API Endpoint</span>
            <p className="text-white font-mono text-xs mt-1 truncate">7qegf6lerf.execute-api.us-east-1</p>
          </div>
          <div>
            <span className="text-gray-400">Runtime</span>
            <p className="text-white mt-1">Lambda (Node 20)</p>
          </div>
          <div>
            <span className="text-gray-400">Region</span>
            <p className="text-white mt-1">us-east-1</p>
          </div>
          <div>
            <span className="text-gray-400">Status</span>
            <p className="text-green-400 mt-1">● Operational</p>
          </div>
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

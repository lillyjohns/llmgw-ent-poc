'use client'
import { useState, useEffect } from 'react'
import { listKeys, generateKey, type KeyItem } from '../../lib/api'

export default function KeysPage() {
  const [keys, setKeys] = useState<KeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null)

  // Form state
  const [formAlias, setFormAlias] = useState('')
  const [formTeam, setFormTeam] = useState('')
  const [formModels, setFormModels] = useState<string[]>([])
  const [formBudget, setFormBudget] = useState('50')
  const [formRpm, setFormRpm] = useState('60')
  const [formTpm, setFormTpm] = useState('100000')

  useEffect(() => {
    fetchKeys()
  }, [])

  async function fetchKeys() {
    try {
      setLoading(true)
      setError(null)
      const data = await listKeys()
      setKeys(data.keys)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch keys')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    try {
      setCreating(true)
      setNewKeyResult(null)
      const result = await generateKey({
        key_alias: formAlias || undefined,
        team_id: formTeam || undefined,
        models: formModels.length > 0 ? formModels : undefined,
        max_budget: parseFloat(formBudget) || 50,
        rpm_limit: parseInt(formRpm) || 60,
        tpm_limit: parseInt(formTpm) || 100000,
      })
      setNewKeyResult(result.key)
      // Refresh list
      await fetchKeys()
    } catch (err: any) {
      setError(err.message || 'Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  function getStatus(key: KeyItem): { label: string; color: string } {
    if (key.blocked) return { label: '✗ Blocked', color: 'bg-red-500/20 text-red-400' }
    if (key.max_budget && key.spend / key.max_budget > 0.9) return { label: '⚠ Near Limit', color: 'bg-yellow-500/20 text-yellow-400' }
    return { label: '● Active', color: 'bg-green-500/20 text-green-400' }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Virtual Keys</h2>
          <p className="text-gray-400 mt-1">Manage API keys for teams and applications</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + Generate Key
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400 text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-300 hover:text-white">✕</button>
        </div>
      )}

      {newKeyResult && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
          <p className="text-green-400 text-sm font-semibold mb-1">Key Created Successfully</p>
          <code className="text-green-300 text-xs font-mono bg-[#0f172a] px-3 py-1 rounded block">{newKeyResult}</code>
          <p className="text-gray-500 text-xs mt-2">Copy this key now — it won&apos;t be shown again.</p>
          <button onClick={() => setNewKeyResult(null)} className="mt-2 text-green-400 hover:text-white text-xs">Dismiss</button>
        </div>
      )}

      {showCreate && (
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155] mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Generate New Key</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400">Key Alias</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white"
                placeholder="e.g. prod-chatbot"
                value={formAlias}
                onChange={(e) => setFormAlias(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Team ID</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white"
                placeholder="e.g. team-engineering"
                value={formTeam}
                onChange={(e) => setFormTeam(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Allowed Models (comma-separated)</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white"
                placeholder="claude-haiku, deepseek (empty = all)"
                onChange={(e) => setFormModels(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">Monthly Budget ($)</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white"
                type="number"
                value={formBudget}
                onChange={(e) => setFormBudget(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">RPM Limit</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white"
                type="number"
                value={formRpm}
                onChange={(e) => setFormRpm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400">TPM Limit</label>
              <input
                className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white"
                type="number"
                value={formTpm}
                onChange={(e) => setFormTpm(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded-lg text-sm"
            >
              {creating ? 'Creating...' : 'Create Key'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Keys Table */}
      <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading keys...</div>
        ) : keys.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No keys found. Generate one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-[#334155] bg-[#0f172a]">
                <th className="text-left py-3 px-4">Alias</th>
                <th className="text-left py-3 px-4">Key ID</th>
                <th className="text-left py-3 px-4">Team</th>
                <th className="text-left py-3 px-4">Models</th>
                <th className="text-left py-3 px-4">Budget</th>
                <th className="text-left py-3 px-4">Spend</th>
                <th className="text-left py-3 px-4">RPM</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Last Used</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {keys.map((k) => {
                const status = getStatus(k)
                return (
                  <tr key={k.key_id} className="border-b border-[#334155]/50 hover:bg-[#334155]/30">
                    <td className="py-3 px-4 font-medium text-white">{k.key_alias || k.key_id}</td>
                    <td className="py-3 px-4 font-mono text-xs">{k.key_id.slice(0, 12)}...</td>
                    <td className="py-3 px-4">{k.team_id || '—'}</td>
                    <td className="py-3 px-4 text-xs">{k.models?.length > 0 ? k.models.join(', ') : 'All'}</td>
                    <td className="py-3 px-4">${k.max_budget}</td>
                    <td className="py-3 px-4">
                      <span className={k.max_budget && k.spend / k.max_budget > 0.9 ? 'text-red-400' : ''}>
                        ${k.spend?.toFixed(4) || '0.00'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{k.rpm_limit || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-500">
                      {k.last_used ? new Date(k.last_used).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-4 text-xs text-gray-500">
        Total: {keys.length} key{keys.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

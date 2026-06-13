'use client'
import { useState } from 'react'

const DEMO_KEYS = [
  { id: 'key_demo_all', name: 'Engineering - All Models', key: 'sk-llmgw-demo-all...dels', team: 'Engineering', models: 'All', budget: 100, spend: 12.43, rpm: 60, status: 'active' },
  { id: 'key_demo_budget', name: 'Marketing - Budget Limited', key: 'sk-llmgw-demo-bud...low', team: 'Marketing', models: 'claude-haiku, nova-pro', budget: 10, spend: 9.50, rpm: 30, status: 'warning' },
  { id: 'key_demo_restricted', name: 'Intern - Haiku Only', key: 'sk-llmgw-demo-res...ted', team: 'Intern', models: 'claude-haiku', budget: 5, spend: 0.23, rpm: 10, status: 'active' },
  { id: 'key_prod_01', name: 'Prod API Service', key: 'sk-llmgw-xK9m...4nQ', team: 'Engineering', models: 'All', budget: 500, spend: 67.21, rpm: 120, status: 'active' },
]

export default function KeysPage() {
  const [showCreate, setShowCreate] = useState(false)

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

      {showCreate && (
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155] mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Generate New Key</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400">Key Name</label>
              <input className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white" placeholder="e.g. prod-chatbot" />
            </div>
            <div>
              <label className="text-sm text-gray-400">Team</label>
              <select className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white">
                <option>Engineering</option>
                <option>Product</option>
                <option>Marketing</option>
                <option>Research</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400">Allowed Models</label>
              <select className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white" multiple>
                <option>All Models</option>
                <option>claude-sonnet</option>
                <option>deepseek</option>
                <option>claude-haiku</option>
                <option>nova-pro</option>
                <option>llama</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-400">Monthly Budget ($)</label>
              <input className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white" type="number" placeholder="50" />
            </div>
            <div>
              <label className="text-sm text-gray-400">RPM Limit</label>
              <input className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white" type="number" placeholder="60" />
            </div>
            <div>
              <label className="text-sm text-gray-400">TPM Limit</label>
              <input className="w-full mt-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-white" type="number" placeholder="100000" />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm">Create Key</button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Keys Table */}
      <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-[#334155] bg-[#0f172a]">
              <th className="text-left py-3 px-4">Name</th>
              <th className="text-left py-3 px-4">Key</th>
              <th className="text-left py-3 px-4">Team</th>
              <th className="text-left py-3 px-4">Models</th>
              <th className="text-left py-3 px-4">Budget</th>
              <th className="text-left py-3 px-4">Spend</th>
              <th className="text-left py-3 px-4">RPM</th>
              <th className="text-left py-3 px-4">Status</th>
              <th className="text-left py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="text-gray-300">
            {DEMO_KEYS.map((k) => (
              <tr key={k.id} className="border-b border-[#334155]/50 hover:bg-[#334155]/30">
                <td className="py-3 px-4 font-medium text-white">{k.name}</td>
                <td className="py-3 px-4 font-mono text-xs">{k.key}</td>
                <td className="py-3 px-4">{k.team}</td>
                <td className="py-3 px-4 text-xs">{k.models}</td>
                <td className="py-3 px-4">${k.budget}</td>
                <td className="py-3 px-4">
                  <span className={k.spend / k.budget > 0.9 ? 'text-red-400' : ''}>${k.spend.toFixed(2)}</span>
                </td>
                <td className="py-3 px-4">{k.rpm}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded text-xs ${k.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {k.status === 'active' ? '● Active' : '⚠ Near Limit'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <button className="text-blue-400 hover:text-blue-300 text-xs mr-2">Edit</button>
                  <button className="text-red-400 hover:text-red-300 text-xs">Revoke</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-gray-400 mt-1">Gateway configuration and system settings</p>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <h3 className="text-lg font-semibold text-white mb-4">General</h3>
          <div className="space-y-4">
            <SettingRow label="Gateway Name" value="llmgw-prod-01" description="Identifier for this gateway instance" />
            <SettingRow label="Region" value="us-east-1" description="Primary AWS region" />
            <SettingRow label="Environment" value="production" description="Current deployment environment" />
            <SettingRow label="Gateway URL" value="https://llmgw.example.com/v1" description="Public endpoint for API requests" />
          </div>
        </div>

        {/* Rate Limiting */}
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <h3 className="text-lg font-semibold text-white mb-4">Rate Limiting</h3>
          <div className="space-y-4">
            <SettingRow label="Global RPM Limit" value="1,000" description="Max requests per minute across all keys" />
            <SettingRow label="Global TPM Limit" value="2,000,000" description="Max tokens per minute across all keys" />
            <SettingRow label="Burst Allowance" value="1.5x" description="Burst multiplier for short spikes" />
            <SettingRow label="Rate Limit Strategy" value="sliding_window" description="Algorithm used for rate limiting" />
          </div>
        </div>

        {/* Caching */}
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <h3 className="text-lg font-semibold text-white mb-4">Response Caching</h3>
          <div className="space-y-4">
            <SettingRow label="Cache Enabled" value="Yes" description="Semantic caching for repeated prompts" />
            <SettingRow label="Cache Backend" value="ElastiCache (Redis)" description="Storage backend for cached responses" />
            <SettingRow label="TTL" value="3600s" description="Cache entry time-to-live" />
            <SettingRow label="Cache Hit Rate" value="23%" description="Current cache hit percentage" />
          </div>
        </div>

        {/* Authentication */}
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <h3 className="text-lg font-semibold text-white mb-4">Authentication</h3>
          <div className="space-y-4">
            <SettingRow label="Auth Mode" value="API Key (Bearer)" description="How clients authenticate to the gateway" />
            <SettingRow label="Key Prefix" value="sk-llmgw-" description="Required prefix for all gateway keys" />
            <SettingRow label="Key Rotation" value="90 days" description="Recommended key rotation interval" />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-[#1e293b] rounded-xl p-6 border border-red-500/30">
          <h3 className="text-lg font-semibold text-red-400 mb-4">⚠️ Danger Zone</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Reset All Budgets</p>
                <p className="text-gray-500 text-xs">Clear all team and key spend counters</p>
              </div>
              <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-sm">
                Reset Budgets
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm font-medium">Revoke All Keys</p>
                <p className="text-gray-500 text-xs">Immediately invalidate all API keys</p>
              </div>
              <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg text-sm">
                Revoke All
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingRow({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#334155]/50 last:border-0">
      <div>
        <p className="text-white text-sm font-medium">{label}</p>
        <p className="text-gray-500 text-xs">{description}</p>
      </div>
      <span className="text-gray-300 text-sm font-mono bg-[#0f172a] px-3 py-1 rounded">{value}</span>
    </div>
  )
}

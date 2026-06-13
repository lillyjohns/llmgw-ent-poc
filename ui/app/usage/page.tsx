export default function UsagePage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Usage & Spend</h2>
        <p className="text-gray-400 mt-1">Cost tracking per key, team, and model</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <p className="text-gray-400 text-sm">This Month</p>
          <p className="text-3xl font-bold text-white mt-2">$127.43</p>
          <p className="text-xs text-green-400 mt-1">↓ 12% vs last month</p>
        </div>
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <p className="text-gray-400 text-sm">Today</p>
          <p className="text-3xl font-bold text-white mt-2">$12.30</p>
          <p className="text-xs text-gray-500 mt-1">847 requests</p>
        </div>
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <p className="text-gray-400 text-sm">Total Tokens (Today)</p>
          <p className="text-3xl font-bold text-white mt-2">2.4M</p>
          <p className="text-xs text-gray-500 mt-1">1.8M prompt + 0.6M completion</p>
        </div>
      </div>

      {/* Spend by Model */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <h3 className="text-lg font-semibold text-white mb-4">Cost by Model (This Month)</h3>
          <div className="space-y-3">
            <SpendRow model="Claude Sonnet 4.6" cost={67.21} tokens="1.2M" percent={53} color="bg-blue-500" />
            <SpendRow model="DeepSeek V3.2" cost={12.50} tokens="4.8M" percent={10} color="bg-green-500" />
            <SpendRow model="Claude Haiku 4.5" cost={28.72} tokens="3.2M" percent={23} color="bg-purple-500" />
            <SpendRow model="Amazon Nova Pro" cost={14.00} tokens="1.5M" percent={11} color="bg-orange-500" />
            <SpendRow model="Meta Llama 3.3" cost={5.00} tokens="2.1M" percent={4} color="bg-red-500" />
          </div>
        </div>

        <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
          <h3 className="text-lg font-semibold text-white mb-4">Cost by Team (This Month)</h3>
          <div className="space-y-3">
            <SpendRow model="Engineering" cost={67.21} tokens="6.2M" percent={53} color="bg-blue-500" budget={200} />
            <SpendRow model="Product" cost={32.50} tokens="3.1M" percent={26} color="bg-green-500" budget={100} />
            <SpendRow model="Research" cost={18.72} tokens="2.4M" percent={15} color="bg-purple-500" budget={50} />
            <SpendRow model="Marketing" cost={9.00} tokens="1.1M" percent={7} color="bg-yellow-500" budget={10} alert />
          </div>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="bg-[#1e293b] rounded-xl p-6 border border-[#334155]">
        <h3 className="text-lg font-semibold text-white mb-4">Daily Spend (Last 7 Days)</h3>
        <div className="grid grid-cols-7 gap-2">
          {[
            { day: 'Mon', spend: 18.50 },
            { day: 'Tue', spend: 22.30 },
            { day: 'Wed', spend: 15.80 },
            { day: 'Thu', spend: 28.40 },
            { day: 'Fri', spend: 19.60 },
            { day: 'Sat', spend: 12.30 },
            { day: 'Sun', spend: 10.53 },
          ].map((d) => (
            <div key={d.day} className="text-center">
              <div className="bg-[#0f172a] rounded-lg p-3">
                <div className="h-24 flex items-end justify-center">
                  <div
                    className="w-8 bg-blue-500 rounded-t"
                    style={{ height: `${(d.spend / 30) * 100}%` }}
                  ></div>
                </div>
                <p className="text-white text-sm mt-2">${d.spend}</p>
                <p className="text-gray-500 text-xs">{d.day}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SpendRow({ model, cost, tokens, percent, color, budget, alert }: any) {
  return (
    <div className={`${alert ? 'bg-red-500/10 p-2 rounded-lg' : ''}`}>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{model} {alert && '⚠️'}</span>
        <span className="text-gray-400">
          ${cost.toFixed(2)} {budget && <span className="text-gray-600">/ ${budget}</span>} • {tokens} tokens
        </span>
      </div>
      <div className="w-full bg-[#334155] rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  )
}

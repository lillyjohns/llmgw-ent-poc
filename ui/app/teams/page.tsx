export default function TeamsPage() {
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Teams</h2>
          <p className="text-gray-400 mt-1">Manage team budgets, permissions, and membership</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
          + Create Team
        </button>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TeamCard
          name="Engineering"
          members={12}
          keys={4}
          budget={200}
          spend={67.21}
          models="All"
          color="blue"
        />
        <TeamCard
          name="Product"
          members={6}
          keys={2}
          budget={100}
          spend={32.50}
          models="claude-sonnet, deepseek, claude-haiku"
          color="green"
        />
        <TeamCard
          name="Research"
          members={4}
          keys={2}
          budget={50}
          spend={18.72}
          models="All"
          color="purple"
        />
        <TeamCard
          name="Marketing"
          members={3}
          keys={1}
          budget={10}
          spend={9.00}
          models="claude-haiku, nova-pro"
          color="yellow"
          alert
        />
        <TeamCard
          name="Intern"
          members={2}
          keys={1}
          budget={5}
          spend={0.23}
          models="claude-haiku"
          color="gray"
        />
      </div>
    </div>
  )
}

function TeamCard({ name, members, keys, budget, spend, models, color, alert }: {
  name: string; members: number; keys: number; budget: number; spend: number; models: string; color: string; alert?: boolean
}) {
  const borderColors: Record<string, string> = {
    blue: 'border-blue-500/30',
    green: 'border-green-500/30',
    purple: 'border-purple-500/30',
    yellow: 'border-yellow-500/30',
    gray: 'border-gray-500/30',
  }
  const percent = Math.round((spend / budget) * 100)

  return (
    <div className={`bg-[#1e293b] rounded-xl p-6 border ${alert ? 'border-red-500/50' : borderColors[color]}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg">{name} {alert && '⚠️'}</h3>
          <p className="text-gray-500 text-sm">{members} members • {keys} active keys</p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 bg-[#334155] hover:bg-[#475569] text-white rounded text-xs">Edit</button>
          <button className="px-3 py-1.5 bg-[#334155] hover:bg-[#475569] text-white rounded text-xs">Keys</button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Budget Usage</span>
            <span className={`${alert ? 'text-red-400' : 'text-gray-300'}`}>
              ${spend.toFixed(2)} / ${budget} ({percent}%)
            </span>
          </div>
          <div className="w-full bg-[#334155] rounded-full h-2">
            <div
              className={`h-2 rounded-full ${alert ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(percent, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Allowed Models</span>
          <span className="text-gray-300 text-xs">{models}</span>
        </div>
      </div>
    </div>
  )
}

import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'LLM Gateway - Admin Dashboard',
  description: 'AWS-Native LLM Gateway Enterprise Administration',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-[#1e293b] border-r border-[#334155] flex flex-col">
            <div className="p-6 border-b border-[#334155]">
              <h1 className="text-xl font-bold text-white">🚀 LLM Gateway</h1>
              <p className="text-xs text-gray-400 mt-1">Enterprise Admin</p>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              <NavItem href="/" icon="📊" label="Dashboard" />
              <NavItem href="/keys" icon="🔑" label="Virtual Keys" />
              <NavItem href="/models" icon="🤖" label="Models" />
              <NavItem href="/teams" icon="👥" label="Teams" />
              <NavItem href="/usage" icon="💰" label="Usage & Spend" />
              <NavItem href="/guardrails" icon="🛡️" label="Guardrails" />
              <NavItem href="/logs" icon="📋" label="Logs" />
              <NavItem href="/playground" icon="💬" label="Playground" />
              <NavItem href="/settings" icon="⚙️" label="Settings" />
            </nav>
            <div className="p-4 border-t border-[#334155] text-xs text-gray-500">
              v0.1.0 • AWS-Native
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}

function NavItem({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-[#334155] hover:text-white transition-colors"
    >
      <span>{icon}</span>
      <span className="text-sm">{label}</span>
    </a>
  )
}

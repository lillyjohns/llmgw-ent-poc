'use client'
import './globals.css'
import { useState } from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <html lang="en">
      <head>
        <title>LLM Gateway - Admin Dashboard</title>
        <meta name="description" content="AWS-Native LLM Gateway Enterprise Administration" />
      </head>
      <body>
        <div className="flex h-screen">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 z-30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={`
            fixed inset-y-0 left-0 z-40 w-64 bg-[#1e293b] border-r border-[#334155] flex flex-col
            transform transition-transform duration-200 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:relative md:translate-x-0
          `}>
            <div className="p-6 border-b border-[#334155] flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white">🚀 LLM Gateway</h1>
                <p className="text-xs text-gray-400 mt-1">Enterprise Admin</p>
              </div>
              {/* Close button on mobile */}
              <button
                className="md:hidden text-gray-400 hover:text-white"
                onClick={() => setSidebarOpen(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              <NavItem href="/" icon="📊" label="Dashboard" onClick={() => setSidebarOpen(false)} />
              <NavItem href="/keys/" icon="🔑" label="Virtual Keys" onClick={() => setSidebarOpen(false)} />
              <NavItem href="/models/" icon="🤖" label="Models" onClick={() => setSidebarOpen(false)} />
              <NavItem href="/teams/" icon="👥" label="Teams" onClick={() => setSidebarOpen(false)} />
              <NavItem href="/usage/" icon="💰" label="Usage & Spend" onClick={() => setSidebarOpen(false)} />
              <NavItem href="/guardrails/" icon="🛡️" label="Guardrails" onClick={() => setSidebarOpen(false)} />
              <NavItem href="/logs/" icon="📋" label="Logs" onClick={() => setSidebarOpen(false)} />
              <NavItem href="/playground/" icon="💬" label="Playground" onClick={() => setSidebarOpen(false)} />
              <NavItem href="/settings/" icon="⚙️" label="Settings" onClick={() => setSidebarOpen(false)} />
            </nav>
            <div className="p-4 border-t border-[#334155] text-xs text-gray-500">
              v0.1.0 • AWS-Native
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile header with hamburger */}
            <div className="md:hidden flex items-center p-4 bg-[#0f172a] border-b border-[#334155]">
              <button
                className="text-gray-300 hover:text-white"
                onClick={() => setSidebarOpen(true)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="ml-3 text-white font-semibold">LLM Gateway</span>
            </div>

            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}

function NavItem({ href, icon, label, onClick }: { href: string; icon: string; label: string; onClick: () => void }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-[#334155] hover:text-white transition-colors"
    >
      <span>{icon}</span>
      <span className="text-sm">{label}</span>
    </a>
  )
}

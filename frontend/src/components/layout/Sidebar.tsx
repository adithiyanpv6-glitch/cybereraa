import { NavLink } from "react-router-dom"
import { LayoutDashboard, ShieldAlert, FileSearch, Activity, MessageSquare, Settings } from "lucide-react"

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Agentic Defense", path: "/defense", icon: ShieldAlert },
  { name: "Threat Analyzer", path: "/analyzer", icon: FileSearch },
  { name: "Live Monitoring", path: "/monitoring", icon: Activity },
  { name: "Groq Chat", path: "/chat", icon: MessageSquare },
  { name: "Settings", path: "/settings", icon: Settings },
]

export default function Sidebar() {
  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full shadow-sm">
      <div className="h-16 flex items-center px-6 border-b">
        <div className="flex items-center gap-2 text-primary font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
            <ShieldAlert size={20} />
          </div>
          ERA_CURITY
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-brown-100/50 hover:text-foreground"
                }`
              }
            >
              <item.icon size={18} />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t">
        <div className="bg-brown-100/50 rounded-md p-3 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">System Status</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            All systems operational
          </div>
        </div>
      </div>
    </aside>
  )
}

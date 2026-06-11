import { Bell, Search, UserCircle } from "lucide-react"

export default function Topbar() {
  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 shadow-sm z-10">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-96 max-w-md hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search events, IP addresses, hashes..."
            className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-muted-foreground hover:bg-brown-100/50 rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full border-2 border-card"></span>
        </button>
        <div className="h-8 w-px bg-border"></div>
        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium leading-none">Admin User</p>
            <p className="text-xs text-muted-foreground">SecOps Team</p>
          </div>
          <UserCircle size={32} className="text-muted-foreground" />
        </div>
      </div>
    </header>
  )
}

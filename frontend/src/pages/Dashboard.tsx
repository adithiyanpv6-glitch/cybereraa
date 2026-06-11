import { useQuery } from "@tanstack/react-query"
import { ShieldAlert, AlertTriangle, Activity, ServerCrash } from "lucide-react"

// Since we are mocking the fetch, we define types here
type Incident = {
  id: string;
  severity: string;
  description: string;
  timestamp: string;
  status: string;
}

export default function Dashboard() {
  const { data: incidents, isLoading } = useQuery({
    queryKey: ['recent-threats'],
    queryFn: async () => {
      // Use env API URL or fallback to localhost
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      const res = await fetch(`${apiUrl}/threats/recent`)
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json() as Promise<Incident[]>
    }
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your autonomous defense perimeter.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* KPI Cards */}
        <div className="bg-card rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Threat Level</h3>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div className="text-2xl font-bold text-destructive">ELEVATED</div>
          <p className="text-xs text-muted-foreground mt-1">+2 from yesterday</p>
        </div>
        
        <div className="bg-card rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Active Agents</h3>
            <ShieldAlert className="h-4 w-4 text-primary" />
          </div>
          <div className="text-2xl font-bold">12 / 15</div>
          <p className="text-xs text-muted-foreground mt-1">3 agents idle</p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">Blocked Intrusions</h3>
            <ServerCrash className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">8,234</div>
          <p className="text-xs text-muted-foreground mt-1">+12% from last week</p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium text-muted-foreground">System Load</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold">34%</div>
          <p className="text-xs text-muted-foreground mt-1">Normal operating levels</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4 bg-card border rounded-xl shadow-sm">
          <div className="p-6 border-b">
            <h3 className="font-semibold leading-none tracking-tight">Recent Incidents</h3>
            <p className="text-sm text-muted-foreground mt-1.5">Latest threats triaged by autonomous agents.</p>
          </div>
          <div className="p-6">
            {isLoading ? (
              <div className="text-sm text-muted-foreground animate-pulse">Loading incidents...</div>
            ) : (
              <div className="space-y-4">
                {incidents?.map((incident) => (
                  <div key={incident.id} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                    <div className={`p-2 rounded-full ${incident.severity === 'CRITICAL' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                      <AlertTriangle size={16} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{incident.description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(incident.timestamp).toLocaleString()} - {incident.id}</p>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-md font-medium border ${incident.status === 'Investigating' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-green-100 text-green-800 border-green-200'}`}>
                      {incident.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-3 bg-card border rounded-xl shadow-sm">
          <div className="p-6 border-b">
            <h3 className="font-semibold leading-none tracking-tight">Agentic Activity Feed</h3>
            <p className="text-sm text-muted-foreground mt-1.5">Live view of autonomous defense actions.</p>
          </div>
          <div className="p-6">
            <div className="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-2.5 before:w-px before:bg-border">
              <div className="relative">
                <div className="absolute left-[-24px] bg-primary w-2 h-2 rounded-full ring-4 ring-card"></div>
                <p className="text-sm font-medium">TriageBot Alpha quarantined file</p>
                <p className="text-xs text-muted-foreground">2 mins ago</p>
              </div>
              <div className="relative">
                <div className="absolute left-[-24px] bg-secondary w-2 h-2 rounded-full ring-4 ring-card"></div>
                <p className="text-sm font-medium">Sherlock-X initiated Groq analysis</p>
                <p className="text-xs text-muted-foreground">15 mins ago</p>
              </div>
              <div className="relative">
                <div className="absolute left-[-24px] bg-muted-foreground w-2 h-2 rounded-full ring-4 ring-card"></div>
                <p className="text-sm font-medium">Containment Unit 7 updated firewall rules</p>
                <p className="text-xs text-muted-foreground">1 hr ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

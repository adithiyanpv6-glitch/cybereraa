import { useQuery } from "@tanstack/react-query"
import { Shield, BrainCircuit, Activity } from "lucide-react"

export default function AgenticDefense() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['active-agents'],
    queryFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      const res = await fetch(`${apiUrl}/agents/active`)
      if (!res.ok) throw new Error('Failed to fetch agents')
      return res.json()
    }
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Agentic Defense Fleet</h1>
        <p className="text-muted-foreground mt-1">Manage and monitor your autonomous AI security agents.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full animate-pulse text-muted-foreground text-sm">Initializing fleet...</div>
        ) : (
          agents?.map((agent: any) => (
            <div key={agent.id} className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b bg-brown-100/30">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-2 rounded-lg ${agent.status === 'Active' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {agent.role === 'Triage' && <Shield size={24} />}
                    {agent.role === 'Investigation' && <BrainCircuit size={24} />}
                    {agent.role === 'Containment' && <Activity size={24} />}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${agent.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {agent.status}
                  </span>
                </div>
                <h3 className="font-semibold text-lg">{agent.name}</h3>
                <p className="text-sm text-muted-foreground">{agent.role} Specialization</p>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">Current Task</p>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border">{agent.current_task}</p>
                </div>
                <div className="mt-6 flex gap-2">
                  <button className="flex-1 bg-primary text-primary-foreground text-sm font-medium py-2 rounded-md hover:bg-primary/90 transition-colors">
                    Reassign
                  </button>
                  <button className="flex-1 bg-background border border-input text-foreground text-sm font-medium py-2 rounded-md hover:bg-muted transition-colors">
                    View Logs
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

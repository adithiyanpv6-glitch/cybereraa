import { useEffect, useState, useRef } from "react"
import { Activity, Radio, AlertTriangle } from "lucide-react"

type LogEvent = {
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: Date;
}

export default function LiveMonitoring() {
  const [events, setEvents] = useState<LogEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Determine WS URL based on VITE_API_URL or fallback
    const httpUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
    const wsUrl = httpUrl.replace('http', 'ws').replace('/api/v1', '') + '/ws/live-monitoring'
    
    let ws: WebSocket;
    
    const connect = () => {
      ws = new WebSocket(wsUrl)
      
      ws.onopen = () => setIsConnected(true)
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        setEvents(prev => [...prev, { ...data, timestamp: new Date() }].slice(-50)) // keep last 50
      }

      ws.onclose = () => {
        setIsConnected(false)
        setTimeout(connect, 3000) // reconnect
      }
    }

    connect()

    return () => {
      if (ws) ws.close()
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [events])

  return (
    <div className="space-y-6 max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            Live Monitoring
            {isConnected ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full border border-green-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                LIVE
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold bg-red-100 text-red-700 px-2.5 py-1 rounded-full border border-red-200">
                <Radio size={12} />
                DISCONNECTED
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">Real-time mock feed of agentic behavior detection.</p>
        </div>
        <div className="bg-card px-4 py-2 rounded-lg border shadow-sm text-sm font-medium">
          Events tracked: <span className="text-primary">{events.length}</span>
        </div>
      </div>

      <div className="bg-black text-green-400 font-mono rounded-xl border shadow-sm flex-1 overflow-hidden flex flex-col relative">
        <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 shrink-0">
          <Activity size={16} className="text-zinc-500 mr-2" />
          <span className="text-xs text-zinc-400">/var/log/era_curity/defense.log</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2 text-sm">
          {events.length === 0 ? (
            <div className="text-zinc-600 italic">Waiting for incoming telemetry...</div>
          ) : (
            events.map((ev, idx) => (
              <div key={idx} className="flex gap-4 break-words">
                <span className="text-zinc-500 shrink-0">[{ev.timestamp.toISOString().split('T')[1].slice(0, -1)}]</span>
                <span className={`shrink-0 font-bold ${
                  ev.severity === 'critical' ? 'text-red-500' : 
                  ev.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  [{ev.severity.toUpperCase()}]
                </span>
                <span className={`${ev.severity === 'critical' ? 'text-red-300 font-semibold flex items-center gap-2' : 'text-green-300'}`}>
                  {ev.severity === 'critical' && <AlertTriangle size={14} className="inline" />}
                  {ev.message}
                </span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}

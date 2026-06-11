import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { FileSearch, AlertCircle, CheckCircle2, Globe, ShieldAlert, ShieldCheck } from "lucide-react"

export default function ThreatAnalyzer() {
  const [logData, setLogData] = useState("")
  const [scanUrl, setScanUrl] = useState("")

  const mutation = useMutation({
    mutationFn: async (payload: { type: 'log' | 'url', data: string }) => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      
      const endpoint = payload.type === 'url' ? '/threats/analyze-url' : '/threats/analyze'
      const bodyParams = payload.type === 'url' ? { url: payload.data } : { log_data: payload.data }
      
      const res = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyParams)
      })
      if (!res.ok) throw new Error("Failed to analyze threat")
      return res.json()
    }
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Threat Analyzer</h1>
        <p className="text-muted-foreground mt-1">Submit logs or suspicious text to the Groq/HF AI models for deep analysis.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
              <Globe size={18} className="text-primary" />
              <h3 className="font-medium text-sm">Scan Website</h3>
            </div>
            <div className="p-4">
              <input
                type="text"
                className="w-full bg-background border rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary mb-4"
                placeholder="https://example.com"
                value={scanUrl}
                onChange={(e) => setScanUrl(e.target.value)}
              />
              <div className="flex justify-end">
                <button 
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  onClick={() => mutation.mutate({ type: 'url', data: scanUrl })}
                  disabled={!scanUrl.trim() || mutation.isPending}
                >
                  {mutation.isPending ? "Scanning..." : "Scan Website"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
              <FileSearch size={18} className="text-primary" />
              <h3 className="font-medium text-sm">Input Log Data</h3>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              <textarea
                className="flex-1 w-full bg-background border rounded-md p-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary resize-none min-h-[150px]"
                placeholder="Paste raw server logs, API payloads, or suspicious prompt injections here..."
                value={logData}
                onChange={(e) => setLogData(e.target.value)}
              />
              <div className="mt-4 flex justify-end">
                <button 
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                  onClick={() => mutation.mutate({ type: 'log', data: logData })}
                  disabled={!logData.trim() || mutation.isPending}
                >
                  {mutation.isPending ? "Analyzing..." : "Analyze Logs"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-muted/30 flex items-center gap-2">
            <AlertCircle size={18} className="text-secondary" />
            <h3 className="font-medium text-sm">Analysis Results</h3>
          </div>
          <div className="p-4 flex-1 bg-brown-100/10">
            {mutation.isPending && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Groq LLM is analyzing payload...</p>
              </div>
            )}
            
            {!mutation.isPending && !mutation.data && !mutation.isError && (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                <CheckCircle2 size={48} className="mb-4" />
                <p className="text-sm">Awaiting input</p>
              </div>
            )}

            {mutation.isError && (
              <div className="text-destructive text-sm bg-destructive/10 p-4 rounded-md border border-destructive/20">
                Error during analysis. Make sure the backend is running and Groq API key is valid.
              </div>
            )}

            {mutation.data && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-1 rounded-md border border-primary/20">
                    Model: {mutation.data.model}
                  </span>
                </div>
                
                {(() => {
                  try {
                    const report = JSON.parse(mutation.data.response)
                    const scoreColor = report.risk_score > 70 ? "text-green-600 bg-green-100 border-green-200" : report.risk_score > 40 ? "text-yellow-600 bg-yellow-100 border-yellow-200" : "text-red-600 bg-red-100 border-red-200"
                    return (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-background border rounded-lg shadow-sm">
                           <div>
                             <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Overall Risk Score</h4>
                             <div className="text-3xl font-bold mt-1 flex items-center gap-2 text-foreground">
                               {report.risk_score} <span className="text-sm font-medium text-muted-foreground">/ 100</span>
                             </div>
                           </div>
                           <div className={`px-4 py-2 rounded-full border font-bold text-sm flex items-center gap-2 ${scoreColor}`}>
                             {report.risk_score > 70 ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                             {report.risk_level}
                           </div>
                        </div>

                        <div>
                           <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><AlertCircle size={16} className="text-primary"/> Summary</h4>
                           <p className="text-sm leading-relaxed text-foreground bg-background p-4 rounded-lg border shadow-sm">
                             {report.summary}
                           </p>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                           <div className="bg-background p-4 rounded-lg border shadow-sm">
                             <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-red-600"><AlertCircle size={16}/> Missing Headers</h4>
                             <ul className="space-y-2 text-sm text-muted-foreground">
                               {report.missing_headers?.length > 0 ? report.missing_headers.map((h: string, i: number) => (
                                 <li key={i} className="flex items-start gap-2">
                                   <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></span> {h}
                                 </li>
                               )) : <li className="text-green-600">No missing headers detected.</li>}
                             </ul>
                           </div>
                           <div className="bg-background p-4 rounded-lg border shadow-sm">
                             <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-red-600"><AlertCircle size={16}/> Vulnerabilities</h4>
                             <ul className="space-y-2 text-sm text-muted-foreground">
                               {report.vulnerabilities?.length > 0 ? report.vulnerabilities.map((v: string, i: number) => (
                                 <li key={i} className="flex items-start gap-2">
                                   <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></span> {v}
                                 </li>
                               )) : <li className="text-green-600">No immediate vulnerabilities detected.</li>}
                             </ul>
                           </div>
                        </div>
                      </div>
                    )
                  } catch (e) {
                    return (
                      <div className="prose prose-sm prose-brown max-w-none text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {mutation.data.response}
                      </div>
                    )
                  }
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

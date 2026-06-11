import { useState } from "react"
import { Key, Shield, User, HardDrive } from "lucide-react"

export default function Settings() {
  const [groqKey, setGroqKey] = useState("gsk_........................................")
  const [hfToken, setHfToken] = useState("hf_.........................")
  
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your API integrations and platform preferences.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-1">
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium bg-primary/10 text-primary rounded-md">
            <Key size={16} /> API Keys
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors">
            <Shield size={16} /> Security
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors">
            <HardDrive size={16} /> Data Retention
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted rounded-md transition-colors">
            <User size={16} /> Account
          </button>
        </div>

        <div className="md:col-span-3 space-y-6">
          <div className="bg-card border rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-lg mb-4 text-foreground">API Integrations</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Groq API Key</label>
                <div className="text-sm text-muted-foreground mb-2">Required for threat analysis and chat capabilities.</div>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    className="flex-1 bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button className="bg-muted text-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-muted/80">
                    Verify
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <label className="text-sm font-medium text-foreground">Hugging Face Token</label>
                <div className="text-sm text-muted-foreground mb-2">Optional. Required for downloading private models or using high-tier inference.</div>
                <div className="flex gap-2">
                  <input 
                    type="password" 
                    value={hfToken}
                    onChange={(e) => setHfToken(e.target.value)}
                    className="flex-1 bg-background border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button className="bg-muted text-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-muted/80">
                    Verify
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t flex justify-end">
              <button className="bg-primary text-primary-foreground px-6 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

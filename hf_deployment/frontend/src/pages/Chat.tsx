import { useState, useRef, useEffect } from "react"
import { useMutation } from "@tanstack/react-query"
import { Send, UserCircle, Shield } from "lucide-react"

type Message = {
  role: 'user' | 'assistant';
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello. I am ERA_CURITY SecOps AI. How can I assist with your investigation today?' }
  ])
  const [input, setInput] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const mutation = useMutation({
    mutationFn: async (msgs: Message[]) => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
      const res = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: msgs })
      })
      if (!res.ok) throw new Error("Chat failed")
      const data = await res.json()
      return data.reply as string
    },
    onSuccess: (reply) => {
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    }
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, mutation.isPending])

  const handleSend = () => {
    if (!input.trim() || mutation.isPending) return
    const userMsg: Message = { role: 'user', content: input }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput("")
    mutation.mutate(newMessages)
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col bg-card border rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-muted/30 flex items-center gap-3">
        <div className="bg-primary/20 p-2 rounded-lg text-primary">
          <Shield size={20} />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Groq SecOps Chat</h2>
          <p className="text-xs text-muted-foreground">Powered by Llama-3.1 via Groq</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-brown-100/10">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0 mt-1">
                <Shield size={16} />
              </div>
            )}
            
            <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm shadow-sm ${
              msg.role === 'user' 
                ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                : 'bg-card border rounded-tl-sm text-foreground'
            }`}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0 mt-1">
                <UserCircle size={20} />
              </div>
            )}
          </div>
        ))}
        {mutation.isPending && (
           <div className="flex gap-4 justify-start">
             <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground shrink-0 mt-1">
               <Shield size={16} />
             </div>
             <div className="bg-card border rounded-2xl rounded-tl-sm px-5 py-3 text-sm shadow-sm flex items-center gap-2 text-muted-foreground">
               <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></div>
               <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></div>
             </div>
           </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 bg-background border-t">
        <div className="relative flex items-center">
          <input
            type="text"
            className="w-full bg-muted/50 border rounded-full pl-6 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-colors"
            placeholder="Ask about a specific threat, IP, or CVE..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={mutation.isPending}
          />
          <button 
            className="absolute right-2 p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
            onClick={handleSend}
            disabled={!input.trim() || mutation.isPending}
          >
            <Send size={16} className="-ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

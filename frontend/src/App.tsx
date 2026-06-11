import { BrowserRouter, Routes, Route } from "react-router-dom"
import Layout from "./components/layout/Layout"
import Dashboard from "./pages/Dashboard"
import AgenticDefense from "./pages/AgenticDefense"
import ThreatAnalyzer from "./pages/ThreatAnalyzer"
import LiveMonitoring from "./pages/LiveMonitoring"
import Settings from "./pages/Settings"
import Chat from "./pages/Chat"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="defense" element={<AgenticDefense />} />
          <Route path="analyzer" element={<ThreatAnalyzer />} />
          <Route path="monitoring" element={<LiveMonitoring />} />
          <Route path="chat" element={<Chat />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

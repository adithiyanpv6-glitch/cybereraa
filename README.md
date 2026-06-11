# ⚡ ERA_CURITY

**Defying AI Gravity — Autonomous Defense Against Agentic Threats**

ERA_CURITY is an AI-powered autonomous cybersecurity defense platform designed to counter AI-powered, agentic, and autonomous cyber attacks.

ERA_CURITY consists of three parts that work together:

```
Chrome Extension  →  FastAPI Backend  →  React Dashboard
(collects data)      (analyzes threats)   (shows results)
```

---

## What It Detects

| Layer | Threats |
|---|---|
| **DOM** | Hidden iframes, clickjacking, malicious redirects, password forms on HTTP, credit card harvesters |
| **JavaScript** | eval() abuse, obfuscated scripts, cryptomining (Coinhive etc.), data exfiltration patterns, keylogger patterns |
| **HTTP Headers** | Missing CSP, HSTS, X-Frame-Options, cookie flags (HttpOnly/Secure/SameSite), CORS wildcards, tech disclosure |
| **Network** | Scripts from raw IPs, known malicious domains, mixed content, supply chain risks |
| **Privacy** | Tracking pixels, analytics networks, fingerprinting |
| **AI Summary** | Groq/Llama 3.1 synthesizes all findings into a plain-language verdict |

---

## Project Structure

```
antigravity/
├── extension/           ← Chrome extension (load unpacked)
│   ├── manifest.json
│   ├── content.js       ← Runs on every page, collects data
│   ├── background.js    ← Intercepts HTTP headers
│   ├── popup.html       ← Extension popup UI
│   └── popup.js
│
├── backend/             ← FastAPI threat analysis engine
│   ├── main.py          ← API routes
│   ├── models.py        ← Pydantic schemas
│   ├── analyzers/
│   │   ├── dom_analyzer.py
│   │   ├── script_analyzer.py
│   │   ├── header_analyzer.py
│   │   ├── network_analyzer.py
│   │   └── ai_analyzer.py   ← Groq integration
│   └── requirements.txt
│
└── frontend/            ← React dashboard
    └── src/App.tsx      ← Full dashboard UI
```

---

## Setup Instructions

### Step 1: Start the Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo "GROQ_API_KEY=your_groq_key_here" > .env

uvicorn main:app --reload --port 8000
```

Verify: visit http://localhost:8000 — should show `{"status":"Antigravity online"}`

### Step 2: Start the Frontend Dashboard

```bash
cd frontend
npm install
npm run dev
```

Visit http://localhost:5173 to see the dashboard.

### Step 3: Install the Chrome Extension

1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `extension/` folder from this project
5. Pin the ⚡ Antigravity icon to your toolbar

### Step 4: Scan Any Website

1. Visit any website (Flipkart, YouTube, any URL)
2. The extension auto-scans every page you visit
3. Click the ⚡ icon to see instant results in the popup
4. Open the dashboard for full detail, history, and AI analysis

---

## Docker (Optional)

```bash
cp .env.example .env    # Add your GROQ_API_KEY
docker-compose up --build
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/scan` | Analyze a page (called by extension) |
| POST | `/api/headers` | Analyze HTTP headers |
| GET | `/api/history` | Recent scan history |
| GET | `/api/stats` | Aggregate statistics |
| GET | `/health` | Health check |

---

## Adding New Threat Detectors

Create a new file in `backend/analyzers/`:

```python
from models import ScanRequest, Threat
import uuid

class MyAnalyzer:
    @staticmethod
    def analyze(req: ScanRequest) -> list[Threat]:
        threats = []
        # Your detection logic here
        threats.append(Threat(
            id=str(uuid.uuid4())[:8],
            category="My Category",
            title="Threat Name",
            description="What this means",
            severity="high",  # critical|high|medium|low|info
            evidence="What triggered it",
            recommendation="What to do"
        ))
        return threats
```

Then import and call it in `main.py`'s `analyze_page()` function.

---

## License

MIT

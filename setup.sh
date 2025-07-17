#!/usr/bin/env bash
set -euo pipefail

# -------------------------------------------------------------
# ONE-CLICK SETUP SCRIPT
# React/Vite TS Frontend, FastAPI Backend, SQLite Vault & Ollama AI,
# WebSocket Chat & WebRTC P2P
# -------------------------------------------------------------

echo "🔧 Starting fresh fullstack scaffold..."

# 1. Create empty SQLite vault file on host
mkdir -p backend
touch backend/vault.db
chmod 600 backend/vault.db

echo "[*] Initialized backend/vault.db"

# 2. docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  api:
    build: ./backend
    ports:
      - "8000:8000"
    volumes:
      - ./backend/vault.db:/app/vault.db
    command: uvicorn main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - api
EOF

echo "[*] Created docker-compose.yml"

# 3. Backend scaffold
cat > backend/requirements.txt << 'EOF'
fastapi
uvicorn
pydantic
sqlalchemy
python-multipart
EOF

cat > backend/Dockerfile << 'EOF'
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
# vault.db is bind-mounted at runtime
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
EOF

cat > backend/main.py << 'EOF'
import os, sqlite3, subprocess
from fastapi import FastAPI, HTTPException, WebSocket
from pydantic import BaseModel
from typing import List

# SQLite vault setup
db_path = os.path.join(os.getcwd(), 'vault.db')
conn = sqlite3.connect(db_path, check_same_thread=False)
conn.execute('CREATE TABLE IF NOT EXISTS secrets(path TEXT PRIMARY KEY, value TEXT)')
conn.commit()

app = FastAPI()

class Secret(BaseModel): value: str
class RecReq(BaseModel): user_id: str; history: List[str]

@app.get('/health')
def health(): return {'status':'ok'}

@app.post('/secret/{p:path}')
def write_secret(p: str, s: Secret):
    conn.execute('REPLACE INTO secrets(path, value) VALUES(?,?)', (p, s.value))
    conn.commit()
    return {'status':'ok'}

@app.get('/secret/{p:path}')
def read_secret(p: str):
    r = conn.execute('SELECT value FROM secrets WHERE path=?', (p,)).fetchone()
    if not r: raise HTTPException(404, 'Not found')
    return {'value': r[0]}

@app.post('/recommend')
def recommend(req: RecReq):
    prompt = f"Recommend next based on {req.history}\n"
    res = subprocess.run(['ollama', 'llama2', 'predict', prompt], capture_output=True, text=True)
    if res.returncode != 0:
        raise HTTPException(500, detail=res.stderr)
    return {'recs': res.stdout.splitlines()}

# WebSocket chat and signaling
clients_chat = []
@app.websocket('/ws/chat')
async def ws_chat(ws: WebSocket):
    await ws.accept()
    clients_chat.append(ws)
    try:
        while True:
            msg = await ws.receive_text()
            for c in clients_chat:
                if c is not ws: await c.send_text(msg)
    finally: clients_chat.remove(ws)

clients_signal = []
@app.websocket('/ws/signal')
async def ws_signal(ws: WebSocket):
    await ws.accept()
    clients_signal.append(ws)
    try:
        while True:
            sig = await ws.receive_text()
            for c in clients_signal:
                if c is not ws: await c.send_text(sig)
    finally: clients_signal.remove(ws)
EOF

echo "[*] Created backend files"

# 4. Frontend scaffold
mkdir -p frontend/src
cat > frontend/package.json << 'EOF'
{
  "name": "cinema-frontend",
  "version": "0.1.0",
  "scripts": { "dev": "vite", "build": "vite build" },
  "dependencies": { "react": "^18", "react-dom": "^18", "simple-peer": "^9" },
  "devDependencies": { "typescript": "^4", "vite": "^4", "@vitejs/plugin-react": "^3" }
}
EOF

cat > frontend/vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], server: { port: 3000 } })
EOF

cat > frontend/Dockerfile << 'EOF'
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

cat > frontend/src/index.tsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
EOF

cat > frontend/src/App.tsx << 'EOF'
import React from 'react'
import Chat from './chat'
import Video from './video'
export default () => <div style={{padding:'1rem'}}><h1>Cinema Demo</h1><Chat/><Video/></div>
EOF

cat > frontend/src/chat.tsx << 'EOF'
import React, {useState,useEffect} from 'react'
export default ()=>{
  const [msg,setMsg]=useState('')
  const [log,setLog]=useState<string[]>([])
  const ws=new WebSocket('ws://'+window.location.hostname+':8000/ws/chat')
  useEffect(()=>{ ws.onmessage=e=>setLog(l=>[...l,e.data]) },[])
  return <div><h2>Chat</h2><div style={{maxHeight:150,overflowY:'auto'}}>{log.map((m,i)=><div key={i}>{m}</div>)}</div><input value={msg} onChange={e=>setMsg(e.target.value)}/><button onClick={()=>ws.send(msg)}>Send</button></div>
}
EOF

cat > import React, { useRef, useEffect } from 'react'

export default () => {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Dynamic import of simple-peer to ensure correct bundling under Vite + nginx
    import('simple-peer')
      .then(({ default: SimplePeer }) => {
        const ws = new WebSocket(`ws://${window.location.hostname}:8000/ws/signal`)
        const p = new SimplePeer({ initiator: true, trickle: false })

        p.on('signal', data => {
          try { ws.send(JSON.stringify(data)) }
          catch (err) { console.error('Signal send failed', err) }
        })

        p.on('stream', stream => {
          if (ref.current) ref.current.srcObject = stream
        })

        ws.onmessage = async e => {
          try {
            const sig = JSON.parse(e.data)
            p.signal(sig)
          } catch (err) {
            console.error('Signal parse/chain error', err)
          }
        }
      })
      .catch(err => console.error('Failed to load simple-peer', err))
  }, [])

  return (
    <div>
      <h2>Watch Together</h2>
      <video ref={ref} autoPlay style={{ width: 300, border: '1px solid #ccc' }} />
    </div>
  )
} << 'EOF'
import React,{useRef,useEffect} from 'react'
import Peer from 'simple-peer'
export default ()=>{
  const ref=useRef<HTMLVideoElement>(null)
  useEffect(()=>{
    const ws=new WebSocket('ws://'+window.location.hostname+':8000/ws/signal')
    const p=new Peer({initiator:true})
    p.on('signal',data=>ws.send(JSON.stringify(data)))
    p.on('stream',stream=>{ if(ref.current) ref.current.srcObject=stream })
    ws.onmessage=e=>p.signal(JSON.parse(e.data))
  },[])
  return <div><h2>Video</h2><video ref={ref} autoPlay style={{width:300}}/></div>
}
EOF

cat > frontend/.dockerignore << 'EOF'
node_modules
dist
.git
EOF

echo "[*] Created frontend files"

# 5. Install dependencies
echo "[*] Installing dependencies..."
if ! command -v pip &>/dev/null; then echo "Error: pip not found" >&2; exit 1; fi
pip install --no-cache-dir -r backend/requirements.txt
if ! command -v npm &>/dev/null; then echo "Error: npm not found" >&2; exit 1; fi
pushd frontend >/dev/null
npm install
popd >/dev/null

# 6. Final instructions
echo -e "
🎉 Scaffold ready!
Run:
  docker compose build
  docker compose up

Then open:
  Frontend: http://localhost:3000
  API:      http://localhost:8000/health
  Chat WS:  ws://localhost:8000/ws/chat
  Signal WS: ws://localhost:8000/ws/signal
"

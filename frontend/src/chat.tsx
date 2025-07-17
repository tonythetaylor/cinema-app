// src/components/Chat.tsx
import React, { useState, useEffect, useRef } from 'react';

export default function Chat() {
  const [msg, setMsg] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://${window.location.hostname}:8000/ws/chat`);
    ws.onmessage = e => setLog(l => [...l, e.data]);
    wsRef.current = ws;
    return () => ws.close();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const sendMessage = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN && msg.trim()) {
      wsRef.current.send(msg);
      setMsg('');
    }
  };

  return (
    <div className="p-6 bg-gray-900 rounded-lg shadow-lg max-w-md mx-auto my-4">
      <h2 className="text-2xl font-bold text-white mb-3">Chat</h2>
      <div className="mb-4 h-40 overflow-y-auto bg-gray-800 p-3 rounded">
        {log.map((m, i) => (
          <div key={i} className="text-gray-200 mb-1">
            {m}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="flex">
        <input
          className="flex-1 px-3 py-2 rounded-l bg-gray-700 text-white focus:outline-none"
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message…"
        />
        <button
          onClick={sendMessage}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-r"
        >
          Send
        </button>
      </div>
    </div>
  );
}
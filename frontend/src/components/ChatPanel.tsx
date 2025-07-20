import React, { useRef, useState, useEffect } from "react";
import { UsersIcon, ChevronUpIcon } from "@heroicons/react/24/outline";

interface ChatMessage {
  movieId: string;
  user: string;
  text: string;
  timestamp: number;
  sentAt: string;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend(text: string, user: string): void;
  currentUser?: string;
  liveUsers?: string[]; // optional prop
}

export default function ChatPanel({
  messages,
  onSend,
  currentUser = "You",
  liveUsers = [],
}: ChatPanelProps) {
  const [text, setText] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.scrollTo(0, boxRef.current.scrollHeight);
  }, [messages]);

  const submit = () => {
    if (!text.trim()) return;
    onSend(text.trim(), currentUser);
    setText("");
  };

  return (
    <div className="relative h-full flex flex-col p-4 bg-black/30 backdrop-blur-lg ring-1 ring-black/50 rounded-r-2xl overflow-hidden">
      <h3 className="text-lg font-bold mb-2 text-white">Live Chat</h3>

      {/* 👤 Users in room toggle */}
      <div className="mb-2">
        <button
          onClick={() => setShowUsers((prev) => !prev)}
          className="flex items-center gap-1 text-sm text-gray-300 hover:text-white transition"
        >
          <UsersIcon className="h-5 w-5" />
          <span>{liveUsers.length}</span>
          <ChevronUpIcon
            className={`h-4 w-4 transition-transform ${showUsers ? "rotate-180" : ""}`}
          />
        </button>

        {/* 🧑 Slide-up list */}
        {showUsers && (
          <div className="mt-2 max-h-32 overflow-y-auto bg-gray-800/80 text-sm text-white rounded-md px-3 py-2 shadow-inner">
            <ul className="space-y-1">
              {liveUsers.map((user, idx) => (
                <li key={idx} className="truncate">
                  {user === currentUser ? "👤 You" : user}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Chat messages */}
      <div ref={boxRef} className="flex-1 overflow-y-auto space-y-2 mb-3 pt-2">
        {messages.map((m, i) => {
          if (m.user === "System") {
            return (
              <div key={i} className="flex justify-center">
                <span className="text-sm italic text-gray-400">{m.text}</span>
              </div>
            );
          }

          const isMe = m.user === currentUser;
          return (
            <div key={i} className={`flex flex-col space-y-1 ${isMe ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-xs px-3 py-2 backdrop-blur-sm ${
                  isMe
                    ? "bg-blue-900/60 text-white rounded-l-2xl rounded-tr-2xl"
                    : "bg-gray-900/50 text-gray-200 rounded-r-2xl rounded-tl-2xl"
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold opacity-80">
                    {isMe ? "You" : m.user}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {m.sentAt && !isNaN(Date.parse(m.sentAt))
                      ? new Date(m.sentAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : null}
                  </span>
                </div>
                <p className="leading-snug mt-1">{m.text}</p>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(m.timestamp * 1000).toISOString().substr(14, 5)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="flex items-center space-x-2">
        <input
          className="flex-1 px-3 py-2 bg-gray-800/60 text-gray-200 placeholder-gray-500 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          onClick={submit}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
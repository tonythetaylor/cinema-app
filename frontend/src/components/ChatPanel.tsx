import React, { useRef, useState, useEffect } from "react";

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
}

export default function ChatPanel({
  messages,
  onSend,
  currentUser = "You",
}: ChatPanelProps) {
  const [text, setText] = useState("");
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
    <div
      role="region"
      aria-label="Live chat"
      className="
        relative
        h-full flex flex-col p-4
        bg-black/30 backdrop-blur-lg
        ring-1 ring-black/50
        rounded-r-2xl
        overflow-hidden
        before:absolute before:inset-y-0 before:-left-6 before:w-6
        before:bg-gradient-to-r before:from-black/80 before:to-transparent
      "
    >
      <h3 className="text-lg font-bold mb-2 text-white">Live Chat</h3>

      <div ref={boxRef} className="flex-1 overflow-y-auto space-y-2 mb-3 pt-4">
        {messages.map((m, i) => {
          // system notices
          if (m.user === "System") {
            return (
              <div key={i} className="flex justify-center">
                <span className="text-sm italic text-gray-400">{m.text}</span>
              </div>
            );
          }

          const isMe = m.user === currentUser;
          return (
            <div
              key={i}
              className={`
        flex flex-col space-y-1
        ${isMe ? "items-end" : "items-start"}
      `}
            >
              {/* Message bubble */}
              <div
                className={`
          max-w-xs px-3 py-2
          ${
            isMe
              ? "bg-blue-900/60 text-white rounded-l-2xl rounded-tr-2xl"
              : "bg-gray-900/50 text-gray-200 rounded-r-2xl rounded-tl-2xl"
          }
          backdrop-blur-sm
        `}
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

              {/* Video timestamp outside the bubble */}
              <span className="text-xs text-gray-400">
                {new Date(m.timestamp * 1000).toISOString().substr(14, 5)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center space-x-2">
        <input
          className="
            flex-1 px-3 py-2
            bg-gray-800/60 text-gray-200 placeholder-gray-500
            rounded-full
            focus:outline-none focus:ring-2 focus:ring-blue-500
            transition
          "
          placeholder="Type a message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button
          onClick={submit}
          className="
            px-4 py-2
            bg-blue-600 hover:bg-blue-700
            text-white font-medium
            rounded-full
            transition
          "
        >
          Send
        </button>
      </div>
    </div>
  );
}

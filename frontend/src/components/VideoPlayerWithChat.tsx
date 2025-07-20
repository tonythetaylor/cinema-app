import React, { useRef, useState, useEffect, useCallback } from "react";
import throttle from "lodash/throttle";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import CommentsOverlay from "./CommentsOverlay";
import ChatPanel from "./ChatPanel";

interface ChatMessage {
  movieId: string;
  user: string;
  text: string;
  timestamp: number; // video time in seconds
  sentAt: string; // ISO timestamp
}

interface ControlEventBase {
  type: "play" | "pause" | "seek" | "init" | "ping";
  timestamp: number; // video.currentTime
  sentAt: string;
}
interface PlayPauseEvent extends ControlEventBase {
  type: "play" | "pause";
}
interface SeekEvent extends ControlEventBase {
  type: "seek";
}
interface InitEvent extends ControlEventBase {
  type: "init";
  // you could extend this with `isPlaying: boolean` if your server sends it
}
type ControlEvent =
  | PlayPauseEvent
  | SeekEvent
  | InitEvent
  | { type: "ping"; timestamp: number; sentAt: string };

interface Props {
  movieUrl: string;
  movieId: string;
  userId: string;
}

export default function VideoPlayerWithChat({
  movieUrl,
  movieId,
  userId,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // local play/pause state (for your UI styling)
  const [isPlaying, setIsPlaying] = useState(false);

  // what the remote “leader” is doing
  const [lastRemoteTime, setLastRemoteTime] = useState(0);
  const [remoteIsPlaying, setRemoteIsPlaying] = useState(false);

  // — Chat socket —
  const chatWsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // — Control socket —
  const ctlWsRef = useRef<WebSocket | null>(null);
  const isRemote = useRef(false);

  // — UI state —
  const [chatVisible, setChatVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);

  const { id } = useParams(); // id is the movieId

  const WS_SCHEME = window.location.protocol === "https:" ? "wss:" : "ws:";

  // ── Chat WS (same as before) ────────────────────────
  const handleChatMessage = useCallback((e: MessageEvent) => {
    const data = JSON.parse(e.data);
    if (data.type === "ping") return;
    if (!data.text || !data.sentAt) return;
    setMessages((ms) => [...ms, data as ChatMessage]);
  }, []);

  useEffect(() => {
    let ws: WebSocket;
    let pingInterval: any;
    let reconnectTimeout: any;

    function connect() {
      // if (!movieId || !userId) {
      //   console.warn("Missing movieId or userId for WebSocket connection.");
      //   return;
      // }
      ws = new WebSocket(
        `${WS_SCHEME}//${window.location.host}` +
          `/ws/chat?movieId=${id}&userId=${encodeURIComponent(userId)}`
      );
      ws.onmessage = handleChatMessage;
      ws.onopen = () => {
        // Send "init" event immediately after connecting
        ws.send(
          JSON.stringify({
            type: "init",
            user: userId,
            movieId: id,
            timestamp: 0,
            sentAt: new Date().toISOString(),
          })
        );

        // Notify others explicitly on reconnect
        ws.send(
          JSON.stringify({
            movieId: id,
            user: "System",
            text: `${userId} has joined the room.`,
            timestamp: 0,
            sentAt: new Date().toISOString(),
          })
        );

        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: "ping",
                timestamp: 0,
                sentAt: new Date().toISOString(),
              })
            );
          }
        }, 30_000);
      };
      ws.onclose = () => {
        clearInterval(pingInterval);
        reconnectTimeout = setTimeout(connect, 1_000);
      };
      chatWsRef.current = ws;
    }

    connect();
    return () => {
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
      ws.close();
    };
  }, [id, userId, handleChatMessage]);

  const sendChat = (text: string) => {
    const ws = chatWsRef.current;
    const vid = videoRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !vid) return;
    ws.send(
      JSON.stringify({
        id,
        user: userId,
        text,
        timestamp: Math.floor(vid.currentTime),
        sentAt: new Date().toISOString(),
      })
    );
  };

  // ── Control WS ─────────────────────────────────────
  const handleControlMessage = useCallback((e: MessageEvent) => {
    const ev = JSON.parse(e.data) as ControlEvent;
    if (ev.type === "ping") return;

    // always record where they are
    setLastRemoteTime(ev.timestamp);

    if (ev.type === "init") {
      // if your server sends {type:"init", timestamp, isPlaying}, you could:
      // setRemoteIsPlaying((ev as InitEvent & {isPlaying:boolean}).isPlaying);
      // but we’ll assume play/pause follow-up events will come
      return;
    }

    // record play/pause state
    setRemoteIsPlaying(ev.type === "play");

    // **do not** force the video to jump/play here.
    // we only use these values for the “Catch Up” button.
  }, []);

  useEffect(() => {
    const ws = new WebSocket(
      `${WS_SCHEME}//${window.location.host}/ws/control?movieId=${id}`
    );
    ws.onmessage = handleControlMessage;
    ctlWsRef.current = ws;

    const pingInt = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "ping",
            timestamp: 0,
            sentAt: new Date().toISOString(),
          })
        );
      }
    }, 30_000);

    return () => {
      clearInterval(pingInt);
      ws.close();
    };
  }, [id, handleControlMessage]);

  const broadcastControl = (type: ControlEvent["type"]) => {
    const vid = videoRef.current;
    const ws = ctlWsRef.current;
    if (!vid || !ws || ws.readyState !== WebSocket.OPEN) return;
    if (isRemote.current) {
      isRemote.current = false;
      return;
    }
    const ev = {
      type,
      timestamp: Math.floor(vid.currentTime * 1000) / 1000,
      sentAt: new Date().toISOString(),
    };
    ws.send(JSON.stringify(ev));
  };

  // ── Local timeupdate for overlay ───────────────────
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const handler = throttle(() => setCurrentTime(vid.currentTime), 250);
    vid.addEventListener("timeupdate", handler);
    return () => {
      vid.removeEventListener("timeupdate", handler);
      handler.cancel();
    };
  }, []);

  // ── Catch-Up logic ─────────────────────────────────
  const behind = lastRemoteTime - (videoRef.current?.currentTime || 0);
  const showCatchUp = behind > 5;

  const doCatchUp = () => {
    const vid = videoRef.current;
    const ws = ctlWsRef.current;
    if (!vid || !ws || ws.readyState !== WebSocket.OPEN) return;

    // 1) jump to the remote time
    vid.currentTime = lastRemoteTime;

    // 2) resume playing locally
    vid.play();

    // 3) notify everyone: first a seek, then a play
    ws.send(
      JSON.stringify({
        type: "seek",
        timestamp: Math.floor(vid.currentTime * 1000) / 1000,
        sentAt: new Date().toISOString(),
      })
    );
    ws.send(
      JSON.stringify({
        type: "play",
        timestamp: Math.floor(vid.currentTime * 1000) / 1000,
        sentAt: new Date().toISOString(),
      })
    );
  };

  return (
    <div
      className={`flex h-full ${
        isPlaying ? "bg-black" : "bg-black/30"
      } transition-colors duration-500`}
    >
      <div className="flex-1 p-6 flex justify-center items-center">
        <div className="relative overflow-hidden rounded-2xl shadow-2xl backdrop-blur-lg bg-white/5">
          <video
            ref={videoRef}
            src={movieUrl}
            controls
            className="w-full h-auto max-h-[80vh]"
            onPlay={() => {
              setIsPlaying(true);
              broadcastControl("play");
            }}
            onPause={() => {
              setIsPlaying(false);
              broadcastControl("pause");
            }}
            onSeeked={() => {
              if (isRemote.current) isRemote.current = false;
              else broadcastControl("seek");
            }}
          />
          <CommentsOverlay
            videoRef={videoRef}
            messages={messages.filter(
              (m) => Math.abs(m.timestamp - currentTime) < 2
            )}
          />
          {showCatchUp && (
            <button
              onClick={doCatchUp}
              className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600/80 hover:bg-blue-700/90 text-white px-4 py-1 rounded-full backdrop-blur-md transition"
            >
              Catch up to{" "}
              {new Date(lastRemoteTime * 1000).toISOString().substr(14, 5)}
            </button>
          )}
        </div>
      </div>
      <div
        className={`relative transition-all duration-300 ${
          chatVisible ? "w-80" : "w-0"
        } overflow-hidden backdrop-blur-lg bg-black/10 rounded-r-2xl shadow-inner before:content-[''] before:absolute before:inset-y-0 before:-left-6 before:w-6 before:bg-gradient-to-r before:from-black/80 before:to-transparent`}
      >
        {chatVisible && (
          <ChatPanel
            onSend={sendChat}
            messages={messages}
            currentUser={userId}
          />
        )}
      </div>
      <button
        onClick={() => setChatVisible((v) => !v)}
        className={`absolute top-5 right-5 p-2 bg-white/10 backdrop-blur-md hover:bg-white/20 text-white text-sm font-medium rounded-full shadow-md transition-opacity duration-300 ${
          chatVisible ? "opacity-100" : "opacity-50"
        }`}
      >
        {chatVisible ? "Close" : "Chat"}
      </button>
    </div>
  );
}

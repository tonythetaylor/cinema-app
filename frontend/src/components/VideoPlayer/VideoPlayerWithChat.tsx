import React, { useRef, useState, useEffect, useCallback } from "react";
import throttle from "lodash/throttle";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ChatPanel from "../ChatPanel";
import CommentsOverlay from "../CommentsOverlay";
import { useSocket } from "../../context/SocketContext"; // adjust path if needed
interface ChatMessage {
  movieId: string;
  user: string;
  text: string;
  timestamp: number;
  sentAt: string;
}

interface ControlEventBase {
  type: "play" | "pause" | "seek" | "init" | "ping";
  timestamp: number;
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
  isPlaying?: boolean;
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
  const navigate = useNavigate();
  const { liveUsers } = useSocket();
  const { id: watchPartyParamId } = useParams();
  const WS_SCHEME = window.location.protocol === "https:" ? "wss:" : "ws:";

  const [effectiveInfo, setEffectiveInfo] = useState<{
    movieId: string;
    userId: string;
    watchPartyId: string;
  } | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [lastRemoteTime, setLastRemoteTime] = useState(0);
  const [remoteIsPlaying, setRemoteIsPlaying] = useState(false);
  const [isChatConnected, setIsChatConnected] = useState(false);
  const [isControlConnected, setIsControlConnected] = useState(false);
  const [chatVisible, setChatVisible] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  const chatWsRef = useRef<WebSocket | null>(null);
  const ctlWsRef = useRef<WebSocket | null>(null);
  const isRemote = useRef(false);

  const location = useLocation();
  const passedLiveUsers = location.state?.liveUsers || {};
  const passedUsername = location.state?.username || "anonymous";

  // Optional: convert liveUsers into initial participants list
  const initialParticipants = Object.values(passedLiveUsers) as string[];
  const [participants, setParticipants] =
    useState<string[]>(initialParticipants);

  // For debugging
  console.debug("[Init] Passed liveUsers:", passedLiveUsers);
  console.debug("[Init] Initial participants:", initialParticipants);

  useEffect(() => {
    // Inject initial "joined" system messages for existing participants
    initialParticipants.forEach((name) => {
      setMessages((ms) => [
        ...ms,
        {
          movieId,
          user: "System",
          text: `${name} has joined the room.`,
          timestamp: 0,
          sentAt: new Date().toISOString(),
        },
      ]);
    });
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem("watchPartyUserInfo");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setEffectiveInfo(parsed);
      } catch {
        console.warn("Corrupt session data");
      }
    } else {
      setEffectiveInfo({
        movieId,
        userId,
        watchPartyId: watchPartyParamId || "",
      });
    }
  }, [movieId, userId, watchPartyParamId]);

  useEffect(() => {
    if (!watchPartyParamId) return;
    sessionStorage.setItem(
      "watchPartyUserInfo",
      JSON.stringify({ movieId, userId, watchPartyId: watchPartyParamId })
    );
  }, [movieId, userId, watchPartyParamId]);

  const handleChatMessage = useCallback((e: MessageEvent) => {
    const data = JSON.parse(e.data);

    if (data.type === "ping") return;

    // Handle presence sync
    if (data.type === "presence" && Array.isArray(data.users)) {
      setParticipants(data.users);
      return;
    }

    // Handle system join/leave messages
    if (data.user === "System") {
      const text: string = data.text || "";
      const match = text.match(/^(.+?) has (joined|left) the room\./);

      if (match) {
        const [_, name, action] = match;

        // Skip adding your own "joined" message
        if (!(action === "joined" && name === effectiveInfo?.userId)) {
          setMessages((ms) => [...ms, data as ChatMessage]);
        }

        // Sync participants regardless
        setParticipants((prev) =>
          action === "joined"
            ? [...new Set([...prev, name])]
            : prev.filter((u) => u !== name)
        );
      } else {
        // Still allow non-join/leave system messages
        setMessages((ms) => [...ms, data as ChatMessage]);
      }

      return;
    }

    // Regular chat message
    if (data.text && data.sentAt) {
      setMessages((ms) => [...ms, data as ChatMessage]);
    }
  }, []);

  const handleControlMessage = useCallback((e: MessageEvent) => {
    const ev = JSON.parse(e.data) as ControlEvent;
    if (ev.type === "ping") return;
    setLastRemoteTime(ev.timestamp);
    if (ev.type === "init" && "isPlaying" in ev) {
      setRemoteIsPlaying(ev.isPlaying!);
    } else {
      setRemoteIsPlaying(ev.type === "play");
    }
  }, []);

  useEffect(() => {
    if (!effectiveInfo) return;
    let ws: WebSocket;
    let pingInterval: any;
    let reconnectTimeout: any;

    function connect() {
      ws = new WebSocket(
        `${WS_SCHEME}//${window.location.host}/ws/chat?watchPartyId=${
          effectiveInfo?.watchPartyId
        }&userId=${encodeURIComponent(effectiveInfo?.userId!)}`
      );
      ws.onmessage = handleChatMessage;
      ws.onopen = () => {
        setIsChatConnected(true);
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
        }, 30000);
      };
      ws.onclose = () => {
        setIsChatConnected(false);
        clearInterval(pingInterval);
        reconnectTimeout = setTimeout(connect, 1000);
      };
      chatWsRef.current = ws;
    }

    connect();
    return () => {
      clearInterval(pingInterval);
      clearTimeout(reconnectTimeout);
      ws.close();
    };
  }, [effectiveInfo, handleChatMessage]);

  useEffect(() => {
    if (!effectiveInfo) return;
    const ws = new WebSocket(
      `${WS_SCHEME}//${window.location.host}/ws/control?watchPartyId=${effectiveInfo.watchPartyId}`
    );
    ws.onmessage = handleControlMessage;
    ws.onopen = () => setIsControlConnected(true);
    ws.onclose = () => setIsControlConnected(false);
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
    }, 30000);

    return () => {
      clearInterval(pingInt);
      ws.close();
    };
  }, [effectiveInfo, handleControlMessage]);

  const sendChat = (text: string) => {
    const ws = chatWsRef.current;
    const vid = videoRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !vid || !effectiveInfo)
      return;
    ws.send(
      JSON.stringify({
        movieId: effectiveInfo.movieId,
        user: effectiveInfo.userId,
        text,
        timestamp: Math.floor(vid.currentTime),
        sentAt: new Date().toISOString(),
      })
    );
  };

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

  useEffect(() => {
    return () => {
      setParticipants([]);
    };
  }, []);

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

  if (!effectiveInfo)
    return <div className="text-white p-4">Loading session...</div>;

  const behind = lastRemoteTime - (videoRef.current?.currentTime || 0);
  const showCatchUp = behind > 5;

  const doCatchUp = () => {
    const vid = videoRef.current;
    const ws = ctlWsRef.current;
    if (!vid || !ws || ws.readyState !== WebSocket.OPEN) return;
    vid.currentTime = lastRemoteTime;
    vid.play();
    const ts = Math.floor(vid.currentTime * 1000) / 1000;
    const sentAt = new Date().toISOString();
    ws.send(JSON.stringify({ type: "seek", timestamp: ts, sentAt }));
    ws.send(JSON.stringify({ type: "play", timestamp: ts, sentAt }));
  };

  return (
    <div
      className={`flex h-full ${
        isPlaying ? "bg-black" : "bg-black/30"
      } transition-colors duration-500`}
    >
      {(!isChatConnected || !isControlConnected) && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-600 text-white text-center py-1 z-50">
          Reconnecting to watch party…
        </div>
      )}
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
            messages={messages}
            onSend={sendChat}
            currentUser={effectiveInfo.userId}
            liveUsers={Array.from(liveUsers.values())}
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
      {!isPlaying && (
        <div className="absolute bottom-4 left-4 z-50 group">
          <button
            onClick={() => {
              chatWsRef.current?.close();
              ctlWsRef.current?.close();
              sessionStorage.removeItem("watchPartyUserInfo");

              setTimeout(() => {
                navigate("/");
              }, 150); // 150–250ms is usually enough
            }}
            className="opacity-0 group-hover:opacity-100 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full shadow transition-opacity duration-300"
          >
            <span className="material-icons text-white">logout</span>
            <span>Leave</span>
          </button>
        </div>
      )}
    </div>
  );
}

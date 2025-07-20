import React, {
  createContext,
  useContext,
  useRef,
  useEffect,
  useState,
  ReactNode,
} from "react";

interface SocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
  send: (data: object) => void;
  latestMessage: any;
  liveUsers: Map<string, string>;
  setLiveUsers: React.Dispatch<React.SetStateAction<Map<string, string>>>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  send: () => {},
  latestMessage: null,
  liveUsers: new Map(),
  setLiveUsers: () => {},
});

interface SocketProviderProps {
  children: ReactNode;
  watchPartyId: string;
  userId: string;
  displayName: string;
}

export const SocketProvider = ({
  children,
  watchPartyId,
  userId,
  displayName,
}: SocketProviderProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [latestMessage, setLatestMessage] = useState(null);
  const [liveUsers, setLiveUsers] = useState<Map<string, string>>(new Map());
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const scheme = window.location.protocol === "https:" ? "wss" : "ws";
    const ws = new WebSocket(
      `${scheme}://${window.location.host}/ws/lobby?watchPartyId=${watchPartyId}&userId=${userId}&displayName=${displayName}`
    );
    socketRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = (e) => console.warn("Socket error", e);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        setLatestMessage(msg);

        if (msg.type === "lobby_state" && msg.users) {
          const entries = Object.entries(msg.users) as [string, string][];
          setLiveUsers(new Map(entries));
        } else if (msg.type === "joined") {
          setLiveUsers((prev) => new Map(prev.set(msg.userId, msg.displayName || msg.userId)));
        } else if (msg.type === "left") {
          setLiveUsers((prev) => {
            const next = new Map(prev);
            next.delete(msg.userId);
            return next;
          });
        }
      } catch (err) {
        console.warn("Failed to parse socket message", err);
      }
    };

    return () => {
      ws.close();
    };
  }, [watchPartyId, userId, displayName]);

  const send = (data: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(data));
    }
  };

  return (
    <SocketContext.Provider
      value={{ socket: socketRef.current, isConnected, send, latestMessage, liveUsers, setLiveUsers }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
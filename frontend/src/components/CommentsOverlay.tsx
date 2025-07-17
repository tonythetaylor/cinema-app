// CommentsOverlay.tsx
import React, { useEffect, useState } from 'react'

interface ChatMessage {
  user: string
  text: string
  timestamp: number
}

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>
  messages: ChatMessage[]   // only messages within ~2s of currentTime
}

export default function CommentsOverlay({ videoRef, messages }: Props) {
  const [currentTime, setCurrentTime] = useState(0)

  // subscribe to video time updates
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    const onTime = () => setCurrentTime(vid.currentTime)
    vid.addEventListener('timeupdate', onTime)
    return () => { vid.removeEventListener('timeupdate', onTime) }
  }, [videoRef])

  const FADE_WINDOW = 2 // seconds


    // Helper to format seconds as HH:MM:SS or MM:SS
  function formatTimestamp(sec: number) {
    const hrs = Math.floor(sec / 3600)
    const mins = Math.floor((sec % 3600) / 60)
    const secs = Math.floor(sec % 60)
    const mm = String(mins).padStart(2, '0')
    const ss = String(secs).padStart(2, '0')
    return hrs > 0
      ? `${String(hrs).padStart(2, '0')}:${mm}:${ss}`
      : `${mm}:${ss}`
  }
  
  return (
    <div className="absolute bottom-4 left-4 right-4 pointer-events-none space-y-2">
      {messages.map((m, i) => {
        const age = currentTime - m.timestamp
        // age runs from 0 → FADE_WINDOW
        const opacity = Math.max(0, Math.min(1, 1 - age / FADE_WINDOW))
        return (
          <div
            key={i}
            className="bg-black/50 text-white px-2 py-1 rounded transition-opacity ease-out duration-500"
            style={{ opacity }}
          >
            <span className="font-mono text-xs text-gray-300">{formatTimestamp(m.timestamp)}</span>{' '}
            <span className="font-semibold">{m.user}:</span> {m.text}
          </div>
        )
      })}
    </div>
  )
}
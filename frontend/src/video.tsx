// src/components/Video.tsx
import React, { useRef, useEffect } from 'react';

export default function Video() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!(window as any).global) (window as any).global = window;
    const params = new URLSearchParams(window.location.search);
    const isInitiator = params.get('init') === 'true';
    const ws = new WebSocket(`ws://${window.location.hostname}:8000/ws/signal`);

    import('simple-peer')
      .then(({ default: SimplePeer }) => {
        const peer = new SimplePeer({ initiator: isInitiator, trickle: false });
        peer.on('signal', data => ws.send(JSON.stringify(data)));
        peer.on('stream', stream => {
          if (ref.current) ref.current.srcObject = stream;
        });
        ws.onmessage = evt => {
          try { peer.signal(JSON.parse(evt.data)); }
          catch (err) { console.error(err); }
        };
      })
      .catch(err => console.error('Failed to load simple-peer', err));

    return () => ws.close();
  }, []);

  return (
    <div className="p-6 bg-gray-800 rounded-lg shadow-lg max-w-md mx-auto my-4">
      <h2 className="text-2xl font-bold text-white mb-4">Watch Together</h2>
      <video
        ref={ref}
        autoPlay
        playsInline
        className="w-full h-auto rounded-md border-2 border-gray-700"
      />
    </div>
  );
}
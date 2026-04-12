import { useRef } from 'react';

interface Props {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  isLocal?: boolean;
  allowFullscreen?: boolean;
}

export function MediaTile({ stream, label, muted = false, isLocal = false, allowFullscreen = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  function handleFullscreen() {
    if (videoRef.current) {
      videoRef.current.requestFullscreen().catch(() => {});
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl aspect-video group"
      style={{
        background: 'rgba(30,26,77,0.45)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,237,212,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      }}
    >
      {stream ? (
        <video
          ref={(el) => {
            (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
            if (el) el.srcObject = stream;
          }}
          autoPlay
          playsInline
          muted={muted}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span
            className="text-4xl font-bold"
            style={{ color: 'rgba(255,237,212,0.15)' }}
          >
            {label.charAt(0).toUpperCase()}
          </span>
        </div>
      )}

      {/* Fullscreen button — visible on hover */}
      {allowFullscreen && stream && (
        <button
          onClick={handleFullscreen}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1.5"
          style={{
            background: 'rgba(13,11,30,0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,237,212,0.15)',
            color: '#FFEDD4',
          }}
          title="Fullscreen"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      )}

      {/* Label pill */}
      <div className="absolute bottom-2 left-2">
        <span
          className="text-xs px-2.5 py-1 rounded-full"
          style={{
            background: 'rgba(13,11,30,0.65)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,237,212,0.10)',
            color: '#FFEDD4',
          }}
        >
          {label}
          {isLocal && <span style={{ color: 'rgba(255,237,212,0.4)' }}> (you)</span>}
        </span>
      </div>
    </div>
  );
}

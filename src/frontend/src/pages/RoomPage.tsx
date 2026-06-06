import { useState, useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import { getSocket, useSocket } from '../hooks/useSocket';
import { useMedia } from '../hooks/useMedia';
import { useAudioBuffer } from '../hooks/useAudioBuffer';
import { MediaTile } from '../components/MediaTile';
import { BookmarkPanel } from '../components/BookmarkPanel';
import { SOCKET_EVENTS } from '@shared/types/index';
import type { BookmarkResult } from '@shared/types/index';

const glass = {
  background: 'rgba(255, 237, 212, 0.04)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 237, 212, 0.10)',
} as const;

export function RoomPage() {
  const { state, dispatch } = useRoom();
  const {
    localStream, screenStream, remoteStreams,
    isReady, isCameraOn, startCamera, stopCamera, stopAll,
    startScreenShare, stopScreenShare,
  } = useMedia();
  const { start: startBuffer, stop: stopBuffer, getBlob } = useAudioBuffer();

  const [bookmarks, setBookmarks] = useState<BookmarkResult[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [newBookmark, setNewBookmark] = useState(false);

  useEffect(() => {
    if (localStream) startBuffer(localStream);
    else stopBuffer();
  }, [localStream, startBuffer, stopBuffer]);

  useSocket('bookmark-result', (data: unknown) => {
    const result = data as BookmarkResult;
    setBookmarks((prev) => [...prev, result]);
    setNewBookmark(true);
    setPanelOpen(true);
  });

  async function handleBookmark() {
    if (!state.room) return;
    setBookmarkLoading(true);
    const blob = await getBlob();
    if (!blob) { setBookmarkLoading(false); return; }

    try {
      const form = new FormData();
      form.append('audio', blob, 'recording.webm');
      form.append('roomId', state.room.id);
      form.append('triggeredBy', state.peers.find((p) => p.id === getSocket().id)?.pseudo ?? 'Unknown');

      const backendUrl = import.meta.env.VITE_BACKEND_URL ?? '';
      const res = await fetch(`${backendUrl}/api/bookmark`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      console.error('Bookmark error:', err);
    } finally {
      setBookmarkLoading(false);
    }
  }

  async function handleLeave() {
    stopBuffer();
    stopScreenShare();
    await stopAll();
    getSocket().emit(SOCKET_EVENTS.LEAVE_ROOM);
    dispatch({ type: 'LEFT' });
  }

  if (!state.room) return null;

  const hasMic = !!localStream;
  const isScreenSharing = !!screenStream;
  const pseudoBySocketId = new Map(state.peers.map((p) => [p.id, p.pseudo]));
  const myPseudo = state.peers.find((p) => p.id === getSocket().id)?.pseudo ?? 'You';
  const videoTiles = Array.from(remoteStreams.values()).filter((r) => r.kind === 'video');
  const hasLocalVideo = isCameraOn && !!localStream?.getVideoTracks().length;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(135deg, #0d0b1e 0%, #1E1A4D 50%, #2a0f10 100%)' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ ...glass, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <h2
            className="font-semibold text-lg truncate"
            style={{ color: '#FFEDD4' }}
          >
            # {state.room.name}
          </h2>
          <span
            className="text-sm shrink-0"
            style={{ color: 'rgba(255,237,212,0.4)' }}
          >
            {state.peers.length} / 10
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          {hasMic && (
            <button
              onClick={handleBookmark}
              disabled={bookmarkLoading}
              className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all active:scale-95"
              style={{
                background: bookmarkLoading
                  ? 'rgba(161,116,30,0.3)'
                  : 'rgba(161,116,30,0.2)',
                border: '1px solid rgba(255,200,80,0.25)',
                color: '#fcd34d',
                cursor: bookmarkLoading ? 'wait' : 'pointer',
              }}
            >
              {bookmarkLoading ? 'Processing…' : "🔖 À l'affût"}
            </button>
          )}

          <button
            onClick={() => { setPanelOpen((v) => !v); setNewBookmark(false); }}
            className="relative text-sm px-3 py-1.5 rounded-lg transition-all"
            style={{ ...glass }}
          >
            <span style={{ color: '#FFEDD4' }}>📋</span>
            {newBookmark && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-yellow-400 rounded-full" />
            )}
          </button>

          {isReady && (
            <>
              <button
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all active:scale-95"
                style={{
                  background: isScreenSharing
                    ? 'rgba(130,24,26,0.5)'
                    : 'rgba(255,237,212,0.08)',
                  border: isScreenSharing
                    ? '1px solid rgba(130,24,26,0.6)'
                    : '1px solid rgba(255,237,212,0.15)',
                  color: '#FFEDD4',
                }}
              >
                {isScreenSharing ? 'Stop Share' : 'Share Screen'}
              </button>

              <button
                onClick={isCameraOn ? stopCamera : startCamera}
                className="text-sm font-medium px-3 py-1.5 rounded-lg transition-all active:scale-95"
                style={{
                  background: isCameraOn
                    ? 'rgba(130,24,26,0.6)'
                    : 'linear-gradient(135deg, #82181A, #a01e20)',
                  border: '1px solid rgba(130,24,26,0.5)',
                  color: '#FFEDD4',
                  boxShadow: isCameraOn ? 'none' : '0 2px 12px rgba(130,24,26,0.4)',
                }}
              >
                {isCameraOn ? 'Stop Camera' : 'Start Camera'}
              </button>
            </>
          )}

          <button
            onClick={handleLeave}
            className="text-sm px-3 py-1.5 rounded-lg transition-all"
            style={{ color: 'rgba(255,237,212,0.5)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#FFEDD4'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,237,212,0.5)'; }}
          >
            Leave
          </button>
        </div>
      </header>

      {/* Media grid */}
      <main className="flex-1 p-4 overflow-auto">
        {(hasLocalVideo || screenStream || videoTiles.length > 0) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {hasLocalVideo && localStream && (
              <MediaTile stream={localStream} label={myPseudo} muted isLocal />
            )}
            {screenStream && (
              <MediaTile stream={screenStream} label={`${myPseudo} (screen)`} muted isLocal allowFullscreen />
            )}
            {videoTiles.map((remote) => (
              <MediaTile
                key={remote.producerId}
                stream={remote.stream}
                label={`${pseudoBySocketId.get(remote.socketId) ?? remote.socketId.slice(0, 6)}${remote.source === 'screen' ? ' (screen)' : ''}`}
                allowFullscreen={remote.source === 'screen'}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="text-sm" style={{ color: 'rgba(255,237,212,0.35)' }}>
              No active cameras
            </p>
            {isReady && (
              <button
                onClick={startCamera}
                className="text-sm px-5 py-2.5 rounded-xl transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #82181A, #a01e20)',
                  color: '#FFEDD4',
                  boxShadow: '0 4px 20px rgba(130,24,26,0.4)',
                }}
              >
                Start Camera
              </button>
            )}
          </div>
        )}

        {/* Invisible audio elements */}
        {Array.from(remoteStreams.values())
          .filter((r) => r.kind === 'audio')
          .map((remote) => (
            <audio
              key={remote.producerId}
              autoPlay
              ref={(el) => { if (el) el.srcObject = remote.stream; }}
            />
          ))}
      </main>

      {/* Peer list */}
      <aside
        className="shrink-0 px-4 py-3"
        style={{ ...glass, borderLeft: 'none', borderRight: 'none', borderBottom: 'none' }}
      >
        <p
          className="text-xs uppercase tracking-widest mb-2"
          style={{ color: 'rgba(255,237,212,0.3)' }}
        >
          Connected
        </p>
        <div className="flex flex-wrap gap-2">
          {state.peers.map((peer) => (
            <span
              key={peer.id}
              className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm"
              style={{
                background: 'rgba(255,237,212,0.06)',
                border: '1px solid rgba(255,237,212,0.10)',
                color: '#FFEDD4',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: '#82181A', boxShadow: '0 0 6px rgba(130,24,26,0.8)' }}
              />
              {peer.pseudo}
            </span>
          ))}
        </div>
      </aside>

      {panelOpen && (
        <BookmarkPanel
          bookmarks={bookmarks}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}

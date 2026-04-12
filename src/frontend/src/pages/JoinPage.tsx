import { useState, type FormEvent } from 'react';
import type { JoinRoomPayload } from '@shared/types/index';
import Silk from '../components/Silk';

interface Props {
  onJoin: (payload: JoinRoomPayload) => void;
}

export function JoinPage({ onJoin }: Props) {
  const [pseudo, setPseudo] = useState('');
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const p = pseudo.trim();
    const r = roomName.trim();
    if (!p || !r) {
      setError('Both fields are required.');
      return;
    }
    setError('');
    onJoin({ pseudo: p, roomName: r });
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: '#0d0b1e' }}>
      {/* Silk animated background */}
      <div className="absolute inset-0">
        <Silk color="#82181A" speed={4} scale={1.2} noiseIntensity={1.8} rotation={0.3} />
      </div>

      {/* Dark overlay to deepen the mood */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(30,26,77,0.72) 0%, rgba(13,11,30,0.55) 100%)' }}
      />

      {/* Centered glass card */}
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div
          className="w-full max-w-sm rounded-2xl p-8"
          style={{
            background: 'rgba(255, 237, 212, 0.05)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 237, 212, 0.12)',
            boxShadow: '0 8px 48px rgba(130, 24, 26, 0.25), 0 1px 0 rgba(255,237,212,0.06) inset',
          }}
        >
          {/* Logo / title */}
          <div className="mb-8 text-center">
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ color: '#FFEDD4' }}
            >
              Reo le Scribe
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'rgba(255,237,212,0.45)' }}>
              Join a room to start
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Your pseudo"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              maxLength={50}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: 'rgba(255, 237, 212, 0.07)',
                border: '1px solid rgba(255, 237, 212, 0.14)',
                color: '#FFEDD4',
                caretColor: '#FFEDD4',
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid rgba(255,237,212,0.35)';
                e.currentTarget.style.background = 'rgba(255,237,212,0.10)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = '1px solid rgba(255,237,212,0.14)';
                e.currentTarget.style.background = 'rgba(255,237,212,0.07)';
              }}
            />
            <input
              type="text"
              placeholder="Room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={100}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: 'rgba(255, 237, 212, 0.07)',
                border: '1px solid rgba(255, 237, 212, 0.14)',
                color: '#FFEDD4',
                caretColor: '#FFEDD4',
              }}
              onFocus={(e) => {
                e.currentTarget.style.border = '1px solid rgba(255,237,212,0.35)';
                e.currentTarget.style.background = 'rgba(255,237,212,0.10)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = '1px solid rgba(255,237,212,0.14)';
                e.currentTarget.style.background = 'rgba(255,237,212,0.07)';
              }}
            />

            {error && (
              <p className="text-xs" style={{ color: '#f87171' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mt-2 w-full rounded-xl py-3 text-sm font-semibold transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #82181A 0%, #a01e20 100%)',
                color: '#FFEDD4',
                boxShadow: '0 4px 20px rgba(130,24,26,0.45)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 6px 28px rgba(130,24,26,0.65)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(130,24,26,0.45)';
              }}
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

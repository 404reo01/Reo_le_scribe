# Reo le Scribe

Real-time communication tool (voice, video, screen share) for small teams (max 10 users).  
**X-Factor:** "À l'affût" bookmark button — triggers targeted AI transcription + summary of key moments, not a full recording.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + TypeScript + Express + Socket.io |
| SFU (media routing) | Mediasoup 3 |
| Database | PostgreSQL 16 |
| Containerization | Docker + Docker Compose |
| AI | OpenRouter API (Whisper STT + summarization) |

---

## Project Structure

```
Reo-le-scribe/
├── shared/types/index.ts       # Shared TS types + socket event constants (Front ↔ Back contract)
├── src/
│   ├── backend/
│   │   └── src/
│   │       ├── index.ts                  # Entrypoint: boots worker + server
│   │       ├── config.ts                 # All env vars in one typed object
│   │       ├── server.ts                 # Express + Socket.io setup
│   │       ├── rooms/
│   │       │   └── RoomManager.ts        # In-memory room + peer state
│   │       ├── socket/
│   │       │   └── handlers.ts           # Socket event handlers (join, leave, disconnect)
│   │       ├── db/
│   │       │   ├── client.ts             # pg Pool singleton
│   │       │   └── rooms.ts              # DB persistence helpers
│   │       └── mediasoup/
│   │           └── worker.ts             # Mediasoup worker + router factory
│   └── frontend/
│       └── src/
│           ├── main.tsx                  # React root mount
│           ├── App.tsx                   # Top-level routing (join → room)
│           ├── index.css                 # Tailwind directives
│           ├── context/
│           │   └── RoomContext.tsx       # Global room state (useReducer)
│           ├── hooks/
│           │   └── useSocket.ts          # Socket singleton + event subscription hook
│           └── pages/
│               ├── JoinPage.tsx          # Pseudo + room name form
│               └── RoomPage.tsx          # Connected peers view
├── docker/
│   ├── backend/Dockerfile        # Node 20 Alpine + native mediasoup build deps
│   ├── frontend/Dockerfile       # Node 20 Alpine, Vite dev server
│   └── postgres/init.sql         # Schema: rooms, users, bookmarks
├── .claude/commands/             # Custom slash commands for this project
│   ├── review.md   →  /review    # Code audit + quality gate checklist
│   ├── clean.md    →  /clean     # Remove dead code, French comments, lint
│   ├── test.md     →  /test      # Generate Vitest / Playwright tests
│   └── docs.md     →  /docs      # Update this README
├── docker-compose.yml
├── .env.example
└── Claude.md                     # Project manifest + development rules
```

---

## Architecture & Data Flow

### Connection & Signaling Pipeline

```
Browser                     Backend                      PostgreSQL
  │                            │                              │
  │── WebSocket connect ───────▶│                              │
  │                            │ socket registered            │
  │── join-room ───────────────▶│                              │
  │   { pseudo, roomName }     │                              │
  │                            │ RoomManager.getOrCreate()    │
  │                            │ RoomManager.addPeer()        │
  │                            │                              │
  │◀── room-joined ────────────│  (async, non-blocking) ─────▶│
  │   { room, peers[] }        │  persistRoomAndUser()        │
  │                            │                              │
  │                    Other peers in room:                   │
  │                            │──▶ peer-joined { peer }      │
  │                            │                              │
  │── leave-room ──────────────▶│                              │
  │  (or disconnect)           │ RoomManager.removePeer()     │
  │                            │──▶ peer-left { id }          │
```

### Key architectural decisions

**In-memory vs DB for room state**  
`RoomManager` holds live room state in a `Map` — no DB round-trip on the critical join path. PostgreSQL is written to *after* the join completes, async. This means the join response is fast regardless of DB latency. Tradeoff: state is lost on server restart (acceptable for Phase 1, will be revisited for production).

**Singleton socket**  
`getSocket()` in `useSocket.ts` returns one shared `Socket` instance for the app's lifetime. This avoids duplicate connections when multiple components subscribe to events.

**Reducer for room state**  
`RoomContext` uses `useReducer` with typed actions (`JOINED`, `PEER_JOINED`, `PEER_LEFT`, `LEFT`). State transitions are explicit and testable — no scattered `setState` calls.

**DB persistence is fire-and-forget**  
`persistRoomAndUser()` is called with `.catch(console.error)` — a DB failure never surfaces to the user or breaks the join flow.

---

## File-by-File Reference

### `shared/types/index.ts`
The single source of truth for the Front ↔ Back contract.  
- `Peer` — a connected user: `{ id (socketId), pseudo, roomId }`  
- `Room` — a room descriptor: `{ id, name }`  
- `JoinRoomPayload` — what the client sends to join: `{ pseudo, roomName }`  
- `SOCKET_EVENTS` — const object of all socket event names. Both sides import this — no hardcoded strings.

### `src/backend/src/config.ts`
Reads all environment variables once at startup and exports a typed `config` object. Every other file imports from here — no `process.env` scattered through the codebase.

### `src/backend/src/index.ts`
Boots the app in two steps: `createWorker()` (Mediasoup), then `createServer(worker)`. Handles fatal errors with `process.exit(1)`.

### `src/backend/src/server.ts`
Sets up Express (REST) + Socket.io (WebSocket) on the same HTTP server. On each socket `connection`, calls `registerHandlers(io, socket)` to wire up the room logic.

### `src/backend/src/rooms/RoomManager.ts`
Pure in-memory state. A singleton class (`roomManager`) that manages a `Map<roomId, RoomState>`.  
- Rooms are created lazily on first join.  
- Rooms are deleted automatically when the last peer leaves.  
- `addPeer` returns `{ ok: true }` or `{ ok: false, reason }` — no exceptions thrown.  
- Enforces the 10-user cap.

### `src/backend/src/socket/handlers.ts`
All socket event logic in one place.  
- `join-room`: validates payload → get/create room → add peer → `socket.join(roomId)` → emit `room-joined` to joiner → broadcast `peer-joined` to room → async DB persist.  
- `leave-room` and `disconnect` both call `handleDisconnect` — no duplication.  
- `handleDisconnect`: removes peer from `RoomManager`, broadcasts `peer-left` to remaining peers.

### `src/backend/src/db/client.ts`
Creates a single `pg.Pool` from `config.db`. One pool for the whole process.

### `src/backend/src/db/rooms.ts`
`persistRoomAndUser(room, peer)` — upserts the room (ON CONFLICT on name), inserts the user. Idempotent.

### `src/backend/src/mediasoup/worker.ts`
`createWorker()` — spawns 1 Mediasoup worker with RTP port range from config. Exits process if worker dies unexpectedly.  
`createRouter(worker)` — creates a Router with Opus (audio), VP8 and H264 (video) codecs. The Router is the SFU's media routing table — used in Phase 2.

### `src/frontend/src/hooks/useSocket.ts`
Two exports:  
- `getSocket()` — lazy singleton `Socket`. Call this to emit events.  
- `useSocket(event, handler)` — subscribes to a socket event for the lifetime of a component. Uses a `useRef` to keep the handler stable and avoid stale closures. Cleans up on unmount.

### `src/frontend/src/context/RoomContext.tsx`
Provides room state to the whole component tree.  
State: `{ room: Room | null, peers: Peer[] }`.  
Actions: `JOINED`, `PEER_JOINED`, `PEER_LEFT`, `LEFT`.  
`useRoom()` throws if called outside the provider — fast failure.

### `src/frontend/src/pages/JoinPage.tsx`
Simple controlled form. Validates locally before emitting. Mobile-first layout (`max-w-sm`, full-width inputs, tactile padding).

### `src/frontend/src/pages/RoomPage.tsx`
Subscribes to `room-joined`, `peer-joined`, `peer-left` via `useSocket`. Dispatches to `RoomContext`. Shows peer list with green presence dots and a peer count `X / 10`.

### `src/frontend/src/App.tsx`
Routing by state: if `state.room` is null → render `JoinPage`, else → render `RoomPage`. `AppInner` is split from `App` so it can consume `RoomContext` (Provider must be above in the tree).

### `docker/postgres/init.sql`
Three tables:  
- `rooms` — uuid, name (unique), created_at  
- `users` — uuid, pseudo, room_id (FK → rooms), joined_at  
- `bookmarks` — uuid, room_id, triggered_by (user), transcript, summary, created_at (Phase 3)

---

## Getting Started

```bash
# 1. Copy env and fill in values
cp .env.example .env

# 2. Install dependencies
cd src/backend && npm install && cd ../..
cd src/frontend && npm install && cd ../..

# 3. Start Postgres
docker-compose up postgres

# 4. Start backend (separate terminal)
cd src/backend && npm run dev

# 5. Start frontend (separate terminal)
cd src/frontend && npm run dev
# → http://localhost:5173
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Backend HTTP/WS port |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |
| `POSTGRES_HOST` | `postgres` | DB host (use `localhost` outside Docker) |
| `POSTGRES_PORT` | `5432` | DB port |
| `POSTGRES_USER` | `reo_user` | DB user |
| `POSTGRES_PASSWORD` | `reo_pass` | DB password |
| `POSTGRES_DB` | `reo_db` | DB name |
| `MEDIASOUP_LISTEN_IP` | `0.0.0.0` | Mediasoup local listen IP |
| `MEDIASOUP_ANNOUNCED_IP` | `127.0.0.1` | IP announced to peers (set to public IP in prod) |
| `MEDIASOUP_RTP_MIN_PORT` | `40000` | RTP port range start |
| `MEDIASOUP_RTP_MAX_PORT` | `40099` | RTP port range end (100 ports = enough for 10 users) |
| `MEDIASOUP_NUM_WORKERS` | `1` | Number of Mediasoup workers |
| `OPENROUTER_API_KEY` | — | OpenRouter key (Phase 3, AI features) |

---

## Current State (Phase 1 complete)

- Room join/leave with pseudo + room name
- Real-time peer list updates via Socket.io
- Max 10 users per room enforced server-side
- Async DB persistence (rooms + users)
- Mediasoup worker initialized and ready for Phase 2

## What's Next (Phase 2)

WebRTC media layer via Mediasoup:
- Create WebRTC transports (send + receive) per peer
- Publish audio/video tracks (Producers)
- Subscribe to other peers' tracks (Consumers)
- Screen share support

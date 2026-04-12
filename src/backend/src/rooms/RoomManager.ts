import type { Peer, Room } from '../../../../shared/types/index.js';

const MAX_PEERS_PER_ROOM = 10;

interface RoomState extends Room {
  peers: Map<string, Peer>; // key = socket id
}

export class RoomManager {
  private rooms = new Map<string, RoomState>();

  getOrCreateRoom(name: string): RoomState {
    const existing = this.findByName(name);
    if (existing) return existing;

    const room: RoomState = {
      id: crypto.randomUUID(),
      name,
      peers: new Map(),
    };
    this.rooms.set(room.id, room);
    return room;
  }

  addPeer(roomId: string, peer: Peer): { ok: true } | { ok: false; reason: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: 'Room not found' };
    if (room.peers.size >= MAX_PEERS_PER_ROOM) {
      return { ok: false, reason: 'Room is full (max 10 users)' };
    }
    room.peers.set(peer.id, peer);
    return { ok: true };
  }

  // Returns the room the peer was in, or null
  removePeer(socketId: string): RoomState | null {
    for (const room of this.rooms.values()) {
      if (room.peers.has(socketId)) {
        room.peers.delete(socketId);
        if (room.peers.size === 0) this.rooms.delete(room.id);
        return room;
      }
    }
    return null;
  }

  getPeers(roomId: string): Peer[] {
    return Array.from(this.rooms.get(roomId)?.peers.values() ?? []);
  }

  private findByName(name: string): RoomState | undefined {
    return Array.from(this.rooms.values()).find((r) => r.name === name);
  }
}

// Singleton — one instance for the process lifetime
export const roomManager = new RoomManager();

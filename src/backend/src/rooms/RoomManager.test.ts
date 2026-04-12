import { describe, it, expect, beforeEach } from 'vitest';

// Re-import a fresh instance for each test suite
// We test the class directly to avoid singleton state leaking between tests
import { RoomManager } from './RoomManager.js';

describe('RoomManager', () => {
  let rm: RoomManager;

  beforeEach(() => {
    rm = new RoomManager();
  });

  describe('getOrCreateRoom', () => {
    it('creates a new room when name is unknown', () => {
      const room = rm.getOrCreateRoom('general');
      expect(room.name).toBe('general');
      expect(room.id).toBeTruthy();
    });

    it('returns the same room on subsequent calls with the same name', () => {
      const a = rm.getOrCreateRoom('general');
      const b = rm.getOrCreateRoom('general');
      expect(a.id).toBe(b.id);
    });

    it('creates distinct rooms for distinct names', () => {
      const a = rm.getOrCreateRoom('alpha');
      const b = rm.getOrCreateRoom('beta');
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('addPeer', () => {
    it('adds a peer successfully', () => {
      const room = rm.getOrCreateRoom('general');
      const peer = { id: 'socket-1', pseudo: 'Alice', roomId: room.id };
      const result = rm.addPeer(room.id, peer);
      expect(result.ok).toBe(true);
      expect(rm.getPeers(room.id)).toHaveLength(1);
    });

    it('returns error when room does not exist', () => {
      const result = rm.addPeer('nonexistent-id', {
        id: 's1',
        pseudo: 'Alice',
        roomId: 'nonexistent-id',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBeTruthy();
    });

    it('enforces the 10-user cap', () => {
      const room = rm.getOrCreateRoom('full-room');
      for (let i = 0; i < 10; i++) {
        rm.addPeer(room.id, { id: `s${i}`, pseudo: `User${i}`, roomId: room.id });
      }
      const result = rm.addPeer(room.id, {
        id: 's-overflow',
        pseudo: 'Overflow',
        roomId: room.id,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toMatch(/full/i);
    });
  });

  describe('removePeer', () => {
    it('removes a peer and returns the room', () => {
      const room = rm.getOrCreateRoom('general');
      rm.addPeer(room.id, { id: 's1', pseudo: 'Alice', roomId: room.id });
      rm.addPeer(room.id, { id: 's2', pseudo: 'Bob', roomId: room.id });

      const returned = rm.removePeer('s1');
      expect(returned?.id).toBe(room.id);
      expect(rm.getPeers(room.id)).toHaveLength(1);
    });

    it('returns null when socket is not in any room', () => {
      const result = rm.removePeer('ghost-socket');
      expect(result).toBeNull();
    });

    it('deletes the room when the last peer leaves', () => {
      const room = rm.getOrCreateRoom('solo');
      rm.addPeer(room.id, { id: 's1', pseudo: 'Alone', roomId: room.id });
      rm.removePeer('s1');
      // Room is gone — getPeers returns empty
      expect(rm.getPeers(room.id)).toHaveLength(0);
      // A new call to getOrCreate should create a NEW room (different id)
      const newRoom = rm.getOrCreateRoom('solo');
      expect(newRoom.id).not.toBe(room.id);
    });
  });

  describe('getPeers', () => {
    it('returns all peers in the room', () => {
      const room = rm.getOrCreateRoom('group');
      rm.addPeer(room.id, { id: 's1', pseudo: 'Alice', roomId: room.id });
      rm.addPeer(room.id, { id: 's2', pseudo: 'Bob', roomId: room.id });
      const peers = rm.getPeers(room.id);
      expect(peers).toHaveLength(2);
      expect(peers.map((p) => p.pseudo)).toContain('Alice');
      expect(peers.map((p) => p.pseudo)).toContain('Bob');
    });

    it('returns empty array for unknown room', () => {
      expect(rm.getPeers('unknown')).toHaveLength(0);
    });
  });
});

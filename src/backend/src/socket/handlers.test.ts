import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as connectClient, type Socket as ClientSocket } from 'socket.io-client';
import { registerHandlers } from './handlers.js';
import { SOCKET_EVENTS } from '../../../../shared/types/index.js';

// Mock DB persistence — we test signaling logic, not DB writes
vi.mock('../db/rooms.js', () => ({
  persistRoomAndUser: vi.fn().mockResolvedValue(undefined),
}));

function createTestServer(): Promise<{ io: Server; port: number; cleanup: () => Promise<void> }> {
  return new Promise((resolve) => {
    const httpServer = createServer();
    const io = new Server(httpServer, { cors: { origin: '*' } });

    io.on('connection', (socket) => {
      registerHandlers(io, socket);
    });

    httpServer.listen(0, () => {
      const port = (httpServer.address() as { port: number }).port;
      const cleanup = () =>
        new Promise<void>((res) => {
          io.close(() => httpServer.close(() => res()));
        });
      resolve({ io, port, cleanup });
    });
  });
}

function waitForEvent(socket: ClientSocket, event: string): Promise<unknown> {
  return new Promise((resolve) => socket.once(event, resolve));
}

describe('Socket handlers', () => {
  let server: { io: Server; port: number; cleanup: () => Promise<void> };
  let client1: ClientSocket;
  let client2: ClientSocket;

  beforeEach(async () => {
    server = await createTestServer();
  });

  afterEach(async () => {
    client1?.disconnect();
    client2?.disconnect();
    await server.cleanup();
  });

  function connect(): ClientSocket {
    return connectClient(`http://localhost:${server.port}`, {
      transports: ['websocket'],
    });
  }

  it('emits room-joined with room and peers list on successful join', async () => {
    client1 = connect();
    await waitForEvent(client1, 'connect');

    const joinedPromise = waitForEvent(client1, 'room-joined');
    client1.emit(SOCKET_EVENTS.JOIN_ROOM, { pseudo: 'Alice', roomName: 'test-room' });

    const data = (await joinedPromise) as { room: { name: string }; peers: { pseudo: string }[] };
    expect(data.room.name).toBe('test-room');
    expect(data.peers).toHaveLength(1);
    expect(data.peers[0].pseudo).toBe('Alice');
  });

  it('broadcasts peer-joined to existing members when a second user joins', async () => {
    client1 = connect();
    client2 = connect();
    await Promise.all([waitForEvent(client1, 'connect'), waitForEvent(client2, 'connect')]);

    // client1 joins first
    client1.emit(SOCKET_EVENTS.JOIN_ROOM, { pseudo: 'Alice', roomName: 'shared-room' });
    await waitForEvent(client1, 'room-joined');

    // listen for peer-joined on client1 before client2 joins
    const peerJoinedPromise = waitForEvent(client1, SOCKET_EVENTS.PEER_JOINED);
    client2.emit(SOCKET_EVENTS.JOIN_ROOM, { pseudo: 'Bob', roomName: 'shared-room' });

    const peer = (await peerJoinedPromise) as { pseudo: string };
    expect(peer.pseudo).toBe('Bob');
  });

  it('includes existing peers in room-joined for the second joiner', async () => {
    client1 = connect();
    client2 = connect();
    await Promise.all([waitForEvent(client1, 'connect'), waitForEvent(client2, 'connect')]);

    client1.emit(SOCKET_EVENTS.JOIN_ROOM, { pseudo: 'Alice', roomName: 'shared-room' });
    await waitForEvent(client1, 'room-joined');

    const joinedPromise = waitForEvent(client2, 'room-joined');
    client2.emit(SOCKET_EVENTS.JOIN_ROOM, { pseudo: 'Bob', roomName: 'shared-room' });

    const data = (await joinedPromise) as { peers: { pseudo: string }[] };
    expect(data.peers).toHaveLength(2);
  });

  it('emits peer-left to remaining peers when a user disconnects', async () => {
    client1 = connect();
    client2 = connect();
    await Promise.all([waitForEvent(client1, 'connect'), waitForEvent(client2, 'connect')]);

    client1.emit(SOCKET_EVENTS.JOIN_ROOM, { pseudo: 'Alice', roomName: 'leave-room' });
    await waitForEvent(client1, 'room-joined');
    client2.emit(SOCKET_EVENTS.JOIN_ROOM, { pseudo: 'Bob', roomName: 'leave-room' });
    await waitForEvent(client2, 'room-joined');

    const peerLeftPromise = waitForEvent(client1, SOCKET_EVENTS.PEER_LEFT);
    client2.disconnect();

    const data = (await peerLeftPromise) as { id: string };
    expect(data.id).toBeTruthy();
  });

  it('emits error when pseudo is missing', async () => {
    client1 = connect();
    await waitForEvent(client1, 'connect');

    const errorPromise = waitForEvent(client1, 'error');
    client1.emit(SOCKET_EVENTS.JOIN_ROOM, { pseudo: '', roomName: 'test' });

    const err = (await errorPromise) as { message: string };
    expect(err.message).toBeTruthy();
  });

  it('emits error when room is full', async () => {
    client1 = connect();
    await waitForEvent(client1, 'connect');

    // Fill the room with 10 users using direct server-side manipulation
    const roomName = 'full-room';
    const clients: ClientSocket[] = [client1];

    // Join 10 clients
    for (let i = 0; i < 10; i++) {
      const c = i === 0 ? client1 : connect();
      if (i > 0) {
        clients.push(c);
        await waitForEvent(c, 'connect');
      }
      c.emit(SOCKET_EVENTS.JOIN_ROOM, { pseudo: `User${i}`, roomName });
      await waitForEvent(c, 'room-joined');
    }

    // 11th client should get an error
    const overflow = connect();
    clients.push(overflow);
    await waitForEvent(overflow, 'connect');

    const errorPromise = waitForEvent(overflow, 'error');
    overflow.emit(SOCKET_EVENTS.JOIN_ROOM, { pseudo: 'Overflow', roomName });
    const err = (await errorPromise) as { message: string };
    expect(err.message).toMatch(/full/i);

    // Cleanup extra clients
    clients.forEach((c) => c !== client1 && c !== client2 && c.disconnect());
  });
});

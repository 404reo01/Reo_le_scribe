import type { Server, Socket } from 'socket.io';
import { roomManager } from '../rooms/RoomManager.js';
import { persistRoomAndUser } from '../db/rooms.js';
import { transportManager } from '../mediasoup/TransportManager.js';
import { producerConsumerManager } from '../mediasoup/ProducerConsumerManager.js';
import { roomRouterManager } from '../mediasoup/RoomRouter.js';
import { SOCKET_EVENTS } from '../../../../shared/types/index.js';
import type { JoinRoomPayload, Peer } from '../../../../shared/types/index.js';

export function registerHandlers(io: Server, socket: Socket): void {
  socket.on(SOCKET_EVENTS.JOIN_ROOM, async (payload: JoinRoomPayload) => {
    const { pseudo, roomName } = payload;

    if (!pseudo?.trim() || !roomName?.trim()) {
      socket.emit('error', { message: 'Pseudo and room name are required' });
      return;
    }

    const room = roomManager.getOrCreateRoom(roomName.trim());
    const peer: Peer = { id: socket.id, pseudo: pseudo.trim(), roomId: room.id };

    const result = roomManager.addPeer(room.id, peer);
    if (!result.ok) {
      socket.emit('error', { message: result.reason });
      return;
    }

    await socket.join(room.id);

    // Send current room state to the new joiner
    socket.emit('room-joined', {
      room: { id: room.id, name: room.name },
      peers: roomManager.getPeers(room.id),
    });

    // Notify others in the room
    socket.to(room.id).emit(SOCKET_EVENTS.PEER_JOINED, peer);

    // Persist to DB async — don't block the join flow
    persistRoomAndUser(room, peer).catch((err) =>
      console.error('DB persist error:', err)
    );
  });

  socket.on(SOCKET_EVENTS.LEAVE_ROOM, () => {
    handleDisconnect(io, socket);
  });

  socket.on('disconnect', () => {
    handleDisconnect(io, socket);
  });
}

function handleDisconnect(io: Server, socket: Socket): void {
  const room = roomManager.removePeer(socket.id);
  if (!room) return;

  // Close media: producers + consumers + transports
  const closedProducerIds = producerConsumerManager.cleanupPeer(socket.id);
  transportManager.cleanup(socket.id);

  // Notify remaining peers to remove this peer's tracks
  for (const producerId of closedProducerIds) {
    io.to(room.id).emit('producer-closed', { producerId });
  }

  io.to(room.id).emit(SOCKET_EVENTS.PEER_LEFT, { id: socket.id });
  socket.leave(room.id);

  // Clean up router if room is now empty
  if (roomManager.getPeers(room.id).length === 0) {
    roomRouterManager.delete(room.id);
  }
}

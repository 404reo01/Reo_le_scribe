import type { Server, Socket } from 'socket.io';
import type { RtpCapabilities } from 'mediasoup/types';
import { roomRouterManager } from '../mediasoup/RoomRouter.js';
import { transportManager } from '../mediasoup/TransportManager.js';
import { producerConsumerManager } from '../mediasoup/ProducerConsumerManager.js';

type Ack<T = void> = (err: string | null, data?: T) => void;

// Returns the mediasoup room id (= socket.io room id) for a connected socket
function getRoomId(socket: Socket): string | null {
  for (const room of socket.rooms) {
    if (room !== socket.id) return room;
  }
  return null;
}

export function registerMediaHandlers(io: Server, socket: Socket): void {

  // Returns router RTP capabilities + list of existing producers in the room
  socket.on('get-capabilities', async (_data: unknown, ack: Ack<object>) => {
    try {
      const roomId = getRoomId(socket);
      if (!roomId) return ack('Not in a room');

      const router = await roomRouterManager.getOrCreate(roomId);
      const existing = producerConsumerManager
        .getProducersInRoom(roomId)
        .map(({ producer, socketId, source }) => ({
          producerId: producer.id,
          socketId,
          kind: producer.kind,
          source,
        }));

      ack(null, { rtpCapabilities: router.rtpCapabilities, existingProducers: existing });
    } catch (err) {
      ack(String(err));
    }
  });

  // Creates a WebRtcTransport and returns its ICE/DTLS params to the client
  socket.on('create-transport', async (
    { direction }: { direction: 'send' | 'recv' },
    ack: Ack<object>
  ) => {
    try {
      const roomId = getRoomId(socket);
      if (!roomId) return ack('Not in a room');

      const router = await roomRouterManager.getOrCreate(roomId);
      const transport = await transportManager.create(router, socket.id, direction);

      ack(null, {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });
    } catch (err) {
      ack(String(err));
    }
  });

  // Finalises the DTLS handshake for a transport
  socket.on('connect-transport', async (
    { transportId, dtlsParameters }: { transportId: string; dtlsParameters: object },
    ack: Ack
  ) => {
    try {
      await transportManager.connect(transportId, dtlsParameters as never);
      ack(null);
    } catch (err) {
      ack(String(err));
    }
  });

  // Client starts sending a track — creates a Producer server-side
  socket.on('produce', async (
    { kind, rtpParameters, appData }: {
      kind: 'audio' | 'video';
      rtpParameters: object;
      appData?: { source?: string };
    },
    ack: Ack<{ producerId: string }>
  ) => {
    try {
      const roomId = getRoomId(socket);
      if (!roomId) return ack('Not in a room');

      const sendTransport = transportManager.getByDirection(socket.id, 'send');
      if (!sendTransport) return ack('No send transport found');

      const source: 'camera' | 'screen' = appData?.source === 'screen' ? 'screen' : 'camera';

      const producer = await producerConsumerManager.produce(
        sendTransport, socket.id, roomId, kind, rtpParameters as never, source
      );

      ack(null, { producerId: producer.id });

      // Notify all other peers so they can consume
      socket.to(roomId).emit('new-producer', {
        producerId: producer.id,
        socketId: socket.id,
        kind,
        source,
      });
    } catch (err) {
      ack(String(err));
    }
  });

  // Client stops a single producer mid-session (stop screen share, stop camera)
  socket.on('close-producer', async (
    { producerId }: { producerId: string },
    ack: Ack
  ) => {
    try {
      const roomId = getRoomId(socket);
      producerConsumerManager.closeProducer(producerId, socket.id);
      if (roomId) socket.to(roomId).emit('producer-closed', { producerId });
      ack(null);
    } catch (err) {
      ack(String(err));
    }
  });

  // Client wants to receive a producer's track — creates a Consumer server-side
  socket.on('consume', async (
    { producerId, rtpCapabilities }: { producerId: string; rtpCapabilities: RtpCapabilities },
    ack: Ack<object>
  ) => {
    try {
      const roomId = getRoomId(socket);
      if (!roomId) return ack('Not in a room');

      const router = await roomRouterManager.getOrCreate(roomId);
      const recvTransport = transportManager.getByDirection(socket.id, 'recv');
      if (!recvTransport) return ack('No recv transport found');

      const consumer = await producerConsumerManager.consume(
        router, recvTransport, socket.id, producerId, rtpCapabilities
      );

      ack(null, {
        id: consumer.id,
        producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    } catch (err) {
      ack(String(err));
    }
  });

  // Client signals it is ready to receive — unpauses the Consumer
  socket.on('consumer-resume', async (
    { consumerId }: { consumerId: string },
    ack: Ack
  ) => {
    try {
      await producerConsumerManager.resumeConsumer(consumerId);
      ack(null);
    } catch (err) {
      ack(String(err));
    }
  });
}

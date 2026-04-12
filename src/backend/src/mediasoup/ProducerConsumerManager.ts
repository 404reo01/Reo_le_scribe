import type {
  Router,
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCapabilities,
  RtpParameters,
} from 'mediasoup/types';

export interface ProducerEntry {
  producer: Producer;
  socketId: string;
  roomId: string;
  source: 'camera' | 'screen';
}

class ProducerConsumerManager {
  private producers = new Map<string, ProducerEntry>(); // producerId → entry
  private consumers = new Map<string, Consumer>();      // consumerId → consumer
  private peerProducers = new Map<string, Set<string>>(); // socketId → Set<producerId>
  private peerConsumers = new Map<string, Set<string>>(); // socketId → Set<consumerId>

  async produce(
    transport: WebRtcTransport,
    socketId: string,
    roomId: string,
    kind: 'audio' | 'video',
    rtpParameters: RtpParameters,
    source: 'camera' | 'screen' = 'camera'
  ): Promise<Producer> {
    const producer = await transport.produce({ kind, rtpParameters });

    this.producers.set(producer.id, { producer, socketId, roomId, source });
    if (!this.peerProducers.has(socketId)) this.peerProducers.set(socketId, new Set());
    this.peerProducers.get(socketId)!.add(producer.id);

    return producer;
  }

  // Close a single producer mid-session (e.g. stop screen share)
  closeProducer(producerId: string, socketId: string): void {
    const entry = this.producers.get(producerId);
    if (!entry || entry.socketId !== socketId) return;
    entry.producer.close();
    this.producers.delete(producerId);
    this.peerProducers.get(socketId)?.delete(producerId);
  }

  async consume(
    router: Router,
    recvTransport: WebRtcTransport,
    consumerSocketId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities
  ): Promise<Consumer> {
    if (!router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error(`Peer cannot consume producer ${producerId}`);
    }

    // paused:true — client must explicitly resume after track is ready
    const consumer = await recvTransport.consume({ producerId, rtpCapabilities, paused: true });

    this.consumers.set(consumer.id, consumer);
    if (!this.peerConsumers.has(consumerSocketId)) this.peerConsumers.set(consumerSocketId, new Set());
    this.peerConsumers.get(consumerSocketId)!.add(consumer.id);

    return consumer;
  }

  async resumeConsumer(consumerId: string): Promise<void> {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) throw new Error(`Consumer ${consumerId} not found`);
    await consumer.resume();
  }

  getProducersInRoom(roomId: string): ProducerEntry[] {
    return Array.from(this.producers.values()).filter((e) => e.roomId === roomId);
  }

  // Closes all producers/consumers for a peer — returns closed producer IDs
  cleanupPeer(socketId: string): string[] {
    const closedIds: string[] = [];

    const producerIds = this.peerProducers.get(socketId);
    if (producerIds) {
      for (const id of producerIds) {
        this.producers.get(id)?.producer.close();
        this.producers.delete(id);
        closedIds.push(id);
      }
      this.peerProducers.delete(socketId);
    }

    const consumerIds = this.peerConsumers.get(socketId);
    if (consumerIds) {
      for (const id of consumerIds) {
        this.consumers.get(id)?.close();
        this.consumers.delete(id);
      }
      this.peerConsumers.delete(socketId);
    }

    return closedIds;
  }
}

export const producerConsumerManager = new ProducerConsumerManager();

import type { Router, WebRtcTransport, DtlsParameters } from 'mediasoup/types';
import { config } from '../config.js';

interface PeerTransports {
  send?: WebRtcTransport;
  recv?: WebRtcTransport;
}

class TransportManager {
  private transports = new Map<string, WebRtcTransport>(); // transportId → transport
  private peerTransports = new Map<string, PeerTransports>(); // socketId → { send, recv }

  async create(
    router: Router,
    socketId: string,
    direction: 'send' | 'recv'
  ): Promise<WebRtcTransport> {
    const transport = await router.createWebRtcTransport({
      listenIps: [
        { ip: config.mediasoup.listenIp, announcedIp: config.mediasoup.announcedIp },
      ],
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
    });

    this.transports.set(transport.id, transport);

    const peer = this.peerTransports.get(socketId) ?? {};
    peer[direction] = transport;
    this.peerTransports.set(socketId, peer);

    return transport;
  }

  async connect(transportId: string, dtlsParameters: DtlsParameters): Promise<void> {
    const transport = this.transports.get(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);
    await transport.connect({ dtlsParameters });
  }

  getByDirection(socketId: string, direction: 'send' | 'recv'): WebRtcTransport | undefined {
    return this.peerTransports.get(socketId)?.[direction];
  }

  cleanup(socketId: string): void {
    const peer = this.peerTransports.get(socketId);
    if (!peer) return;

    if (peer.send) {
      peer.send.close();
      this.transports.delete(peer.send.id);
    }
    if (peer.recv) {
      peer.recv.close();
      this.transports.delete(peer.recv.id);
    }
    this.peerTransports.delete(socketId);
  }
}

export const transportManager = new TransportManager();

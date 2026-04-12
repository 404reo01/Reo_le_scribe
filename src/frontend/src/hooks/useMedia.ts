import { useEffect, useRef, useState, useCallback } from 'react';
import { Device } from 'mediasoup-client';
import type { types as MediasoupTypes } from 'mediasoup-client';
type Transport = MediasoupTypes.Transport;
type Producer = MediasoupTypes.Producer;
import { getSocket, useSocket } from './useSocket';
import { useRoom } from '../context/RoomContext';

export interface RemoteStream {
  stream: MediaStream;
  socketId: string;
  kind: 'audio' | 'video';
  producerId: string;
  source: 'camera' | 'screen';
}

// Promisified socket ack helper
function socketRequest<T>(event: string, data: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${event}`)), 10_000);
    getSocket().emit(event, data, (err: string | null, result: T) => {
      clearTimeout(timer);
      if (err) reject(new Error(err));
      else resolve(result);
    });
  });
}

export function useMedia() {
  const { state } = useRoom();
  const deviceRef = useRef<Device | null>(null);
  const sendTransportRef = useRef<Transport | null>(null);
  const recvTransportRef = useRef<Transport | null>(null);
  const producersRef = useRef<Map<string, Producer>>(new Map());
  const screenProducerRef = useRef<Producer | null>(null);
  // Producers that arrive via new-producer while init() hasn't finished yet
  const pendingProducersRef = useRef<{ producerId: string; socketId: string; kind: 'audio' | 'video'; source: 'camera' | 'screen' }[]>([]);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, RemoteStream>>(new Map());
  const [isReady, setIsReady] = useState(false);

  // Consume a single producer and add its stream to remoteStreams
  const consumeProducer = useCallback(async (
    producerId: string,
    socketId: string,
    kind: 'audio' | 'video',
    source: 'camera' | 'screen' = 'camera'
  ) => {
    const device = deviceRef.current;
    const recvTransport = recvTransportRef.current;
    if (!device || !recvTransport) return;

    const params = await socketRequest<{
      id: string;
      producerId: string;
      kind: 'audio' | 'video';
      rtpParameters: object;
    }>('consume', { producerId, rtpCapabilities: device.rtpCapabilities });

    // Stale check: transport was replaced/closed while awaiting
    if (recvTransportRef.current !== recvTransport) return;

    const consumer = await recvTransport.consume(params as never);

    if (recvTransportRef.current !== recvTransport) return;

    const stream = new MediaStream([consumer.track]);

    setRemoteStreams((prev) => {
      if (recvTransportRef.current !== recvTransport) return prev;
      const next = new Map(prev);
      next.set(consumer.id, { stream, socketId, kind, producerId, source });
      return next;
    });

    if (recvTransportRef.current !== recvTransport) return;
    await socketRequest('consumer-resume', { consumerId: consumer.id });
  }, []);

  // Init device + transports when entering a room
  useEffect(() => {
    if (!state.room) return;

    const device = new Device();
    deviceRef.current = device;
    let cancelled = false;

    async function init() {
      const { rtpCapabilities, existingProducers } = await socketRequest<{
        rtpCapabilities: object;
        existingProducers: { producerId: string; socketId: string; kind: 'audio' | 'video'; source: 'camera' | 'screen' }[];
      }>('get-capabilities', {});

      await device.load({ routerRtpCapabilities: rtpCapabilities as never });

      const sendParams = await socketRequest<object>('create-transport', { direction: 'send' });
      const sendTransport = device.createSendTransport(sendParams as never);
      sendTransportRef.current = sendTransport;

      sendTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socketRequest('connect-transport', { transportId: sendTransport.id, dtlsParameters })
          .then(() => callback())
          .catch(errback);
      });

      sendTransport.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
        socketRequest<{ producerId: string }>('produce', { kind, rtpParameters, appData })
          .then(({ producerId }) => callback({ id: producerId }))
          .catch(errback);
      });

      const recvParams = await socketRequest<object>('create-transport', { direction: 'recv' });
      const recvTransport = device.createRecvTransport(recvParams as never);
      recvTransportRef.current = recvTransport;

      recvTransport.on('connect', ({ dtlsParameters }, callback, errback) => {
        socketRequest('connect-transport', { transportId: recvTransport.id, dtlsParameters })
          .then(() => callback())
          .catch(errback);
      });

      if (cancelled) return;
      setIsReady(true);

      // Merge producers that existed when we joined + any that fired new-producer during setup
      const toConsume = [...existingProducers, ...pendingProducersRef.current];
      pendingProducersRef.current = [];
      for (const p of toConsume) {
        await consumeProducer(p.producerId, p.socketId, p.kind, p.source).catch(console.error);
      }
    }

    init().catch(console.error);

    return () => {
      cancelled = true;
      sendTransportRef.current?.close();
      recvTransportRef.current?.close();
      sendTransportRef.current = null;
      recvTransportRef.current = null;
      deviceRef.current = null;
      pendingProducersRef.current = [];
      setIsReady(false);
      setRemoteStreams(new Map());
    };
  }, [state.room?.id, consumeProducer]);

  // A peer in the room just started publishing
  useSocket('new-producer', (data: unknown) => {
    const { producerId, socketId, kind, source = 'camera' } = data as {
      producerId: string;
      socketId: string;
      kind: 'audio' | 'video';
      source?: 'camera' | 'screen';
    };
    if (!recvTransportRef.current) {
      // Recv transport not ready yet — queue for after init() completes
      pendingProducersRef.current.push({ producerId, socketId, kind, source: source ?? 'camera' });
      return;
    }
    consumeProducer(producerId, socketId, kind, source).catch(console.error);
  });

  // A peer stopped publishing (left room or stopped track)
  useSocket('producer-closed', (data: unknown) => {
    const { producerId } = data as { producerId: string };
    setRemoteStreams((prev) => {
      const next = new Map(prev);
      for (const [consumerId, entry] of next) {
        if (entry.producerId === producerId) next.delete(consumerId);
      }
      return next;
    });
  });

  const startPublishing = useCallback(async () => {
    const sendTransport = sendTransportRef.current;
    if (!sendTransport) return;

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    setLocalStream(stream);

    for (const track of stream.getTracks()) {
      const producer = await sendTransport.produce({ track, appData: { source: 'camera' } });
      producersRef.current.set(track.kind, producer);
    }
  }, []);

  const stopPublishing = useCallback(async () => {
    for (const producer of producersRef.current.values()) {
      await socketRequest('close-producer', { producerId: producer.id }).catch(() => {});
      producer.close();
    }
    producersRef.current.clear();
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
  }, [localStream]);

  const startScreenShare = useCallback(async () => {
    const sendTransport = sendTransportRef.current;
    if (!sendTransport) return;

    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    setScreenStream(stream);

    const track = stream.getVideoTracks()[0];
    const producer = await sendTransport.produce({ track, appData: { source: 'screen' } });
    screenProducerRef.current = producer;

    // Auto-stop when the user clicks the browser "Stop sharing" button
    track.addEventListener('ended', () => {
      stopScreenShareInternal(producer, stream);
    }, { once: true });
  }, []);

  // Internal helper — doesn't depend on state, safe to call from event listener
  function stopScreenShareInternal(producer: Producer, stream: MediaStream) {
    socketRequest('close-producer', { producerId: producer.id }).catch(() => {});
    producer.close();
    stream.getTracks().forEach((t) => t.stop());
    screenProducerRef.current = null;
    setScreenStream(null);
  }

  const stopScreenShare = useCallback(() => {
    const producer = screenProducerRef.current;
    const stream = screenStream;
    if (!producer || !stream) return;
    stopScreenShareInternal(producer, stream);
  }, [screenStream]);

  return {
    localStream,
    screenStream,
    remoteStreams,
    isReady,
    startPublishing,
    stopPublishing,
    startScreenShare,
    stopScreenShare,
  };
}

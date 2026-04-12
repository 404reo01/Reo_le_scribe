import * as mediasoup from 'mediasoup';
import type { Worker, Router, RtpCodecCapability } from 'mediasoup/types';
import { config } from '../config.js';

export const mediaCodecs = [
  { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
  { kind: 'video', mimeType: 'video/VP8',  clockRate: 90000 },
] as RtpCodecCapability[];

export async function createWorker(): Promise<Worker> {
  const worker = await mediasoup.createWorker({
    logLevel: 'warn',
    rtcMinPort: config.mediasoup.rtpMinPort,
    rtcMaxPort: config.mediasoup.rtpMaxPort,
  });

  worker.on('died', () => {
    console.error('mediasoup worker died — exiting');
    process.exit(1);
  });

  return worker;
}

export async function createRouter(worker: Worker): Promise<Router> {
  return worker.createRouter({ mediaCodecs });
}

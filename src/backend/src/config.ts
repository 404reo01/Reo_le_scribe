import dotenv from 'dotenv';
import { resolve } from 'path';

// .env is at project root, two levels above src/backend/src
dotenv.config({ path: resolve(process.cwd(), '../../.env') });


export const config = {
  port: Number(process.env.PORT ?? 3000),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  mediasoup: {
    numWorkers: Number(process.env.MEDIASOUP_NUM_WORKERS ?? 1),
    rtpMinPort: Number(process.env.MEDIASOUP_RTP_MIN_PORT ?? 40000),
    rtpMaxPort: Number(process.env.MEDIASOUP_RTP_MAX_PORT ?? 40099),
    listenIp: process.env.MEDIASOUP_LISTEN_IP ?? '0.0.0.0',
    announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP ?? '127.0.0.1',
  },
  db: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: Number(process.env.POSTGRES_PORT ?? 5432),
    user: process.env.POSTGRES_USER ?? 'reo_user',
    password: process.env.POSTGRES_PASSWORD ?? 'reo_pass',
    database: process.env.POSTGRES_DB ?? 'reo_db',
  },
};

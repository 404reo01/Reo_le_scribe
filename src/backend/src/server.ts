import express from 'express';
import { createServer as createHttpServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { Worker } from 'mediasoup/types';
import { config } from './config.js';
import { registerHandlers } from './socket/handlers.js';
import { registerMediaHandlers } from './socket/mediaHandlers.js';
import { roomRouterManager } from './mediasoup/RoomRouter.js';
import { bookmarkRouter } from './routes/bookmark.js';

export async function createServer(worker: Worker) {
  roomRouterManager.init(worker);
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new Server(httpServer, {
    cors: { origin: config.frontendUrl },
  });

  app.use(cors({ origin: config.frontendUrl }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/bookmark', bookmarkRouter(io));

  io.on('connection', (socket) => {
    console.log('client connected:', socket.id);
    registerHandlers(io, socket);
    registerMediaHandlers(io, socket);
  });

  return { app, httpServer, io };
}

import type { Worker, Router } from 'mediasoup/types';
import { mediaCodecs } from './worker.js';

class RoomRouterManager {
  private routers = new Map<string, Router>(); // roomId → Router
  private worker: Worker | null = null;

  init(worker: Worker): void {
    this.worker = worker;
  }

  async getOrCreate(roomId: string): Promise<Router> {
    const existing = this.routers.get(roomId);
    if (existing) return existing;

    if (!this.worker) throw new Error('RoomRouterManager not initialized with a worker');

    const router = await this.worker.createRouter({ mediaCodecs });
    this.routers.set(roomId, router);
    return router;
  }

  // Called when the last peer leaves a room
  delete(roomId: string): void {
    const router = this.routers.get(roomId);
    if (!router) return;
    router.close();
    this.routers.delete(roomId);
  }
}

export const roomRouterManager = new RoomRouterManager();

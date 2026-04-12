import { pool } from './client.js';
import type { Peer, Room } from '../../../../shared/types/index.js';

// Upsert room then insert user — called async after join, not on the critical path
export async function persistRoomAndUser(room: Room, peer: Peer): Promise<void> {
  await pool.query(
    `INSERT INTO rooms (id, name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
    [room.id, room.name]
  );

  await pool.query(
    `INSERT INTO users (id, pseudo, room_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [peer.id, peer.pseudo, room.id]
  );
}

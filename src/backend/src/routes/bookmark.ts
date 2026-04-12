import type { Router } from 'express';
import { Router as createRouter } from 'express';
import multer from 'multer';
import type { Server } from 'socket.io';
import { transcribeAudio } from '../ai/transcribe.js';
import { summarizeTranscript } from '../ai/summarize.js';
import { pool } from '../db/client.js';
import type { BookmarkResult } from '../../../../shared/types/index.js';

const upload = multer({ storage: multer.memoryStorage() });

export function bookmarkRouter(io: Server): Router {
  const router = createRouter();

  router.post('/', upload.single('audio'), async (req, res) => {
    const { roomId, triggeredBy } = req.body as { roomId: string; triggeredBy: string };
    const file = req.file;

    if (!file || !roomId || !triggeredBy) {
      res.status(400).json({ error: 'Missing audio, roomId, or triggeredBy' });
      return;
    }

    try {
      // 1. Transcribe
      const transcript = await transcribeAudio(file.buffer, file.mimetype);

      // 2. Summarize
      const { summary, decisions, actions } = await summarizeTranscript(transcript);

      // Format summary with decisions + actions if present
      let fullSummary = summary;
      if (decisions.length > 0) fullSummary += '\n\n**Decisions:** ' + decisions.join(' · ');
      if (actions.length > 0) fullSummary += '\n\n**Actions:** ' + actions.join(' · ');

      const result: BookmarkResult = {
        id: crypto.randomUUID(),
        triggeredBy,
        transcript,
        summary: fullSummary,
        createdAt: new Date().toISOString(),
      };

      // 3. Persist (non-blocking)
      pool.query(
        `INSERT INTO bookmarks (id, room_id, transcript, summary)
         VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
        [result.id, roomId, transcript, fullSummary]
      ).catch((err) => console.error('Bookmark DB persist error:', err));

      // 4. Broadcast to all peers in the room
      io.to(roomId).emit('bookmark-result', result);

      res.json({ ok: true });
    } catch (err) {
      console.error('Bookmark processing error:', err);
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}

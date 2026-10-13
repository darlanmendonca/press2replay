import express, { Request, Response } from 'express';
import { config } from '../config';
import { getSegments, getLastSegmentEnd } from '../utils/chunkStore';
import { Segmenter } from '../ingest/segmenter';

export function buildStatusRouter(segmenter: Segmenter): express.Router {
  const router = express.Router();

  router.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

  router.get('/status', (_req: Request, res: Response) => {
    const segments = getSegments();
    const oldest = segments[0];
    const lastEnd = getLastSegmentEnd(segments);
    const staleForSeconds = lastEnd ? (Date.now() - lastEnd.getTime()) / 1000 : null;

    res.json({
      ingest: segmenter.getStatus(),
      chunks: {
        count: segments.length,
        oldestAt: oldest?.programDateTime ?? null,
        newestEndsAt: lastEnd,
        staleForSeconds,
        live: staleForSeconds !== null && staleForSeconds <= config.staleAfterSeconds,
      },
      config: {
        inputUrl: config.inputUrl,
        chunkDurationSeconds: config.chunkDurationSeconds,
        chunkWindowSeconds: config.chunkWindowSeconds,
        replayPreRollSeconds: config.replayPreRollSeconds,
        replayPostRollSeconds: config.replayPostRollSeconds,
        staleAfterSeconds: config.staleAfterSeconds,
      },
    });
  });

  return router;
}

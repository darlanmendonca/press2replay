import express, { Request, Response } from 'express';
import { Camera, cameraKey, config, getCameras } from '../config';
import { getSegments, getLastSegmentEnd } from '../utils/chunkStore';
import { Segmenter } from '../ingest/segmenter';

function cameraStatus(camera: Camera, segmenter: Segmenter | undefined) {
  const segments = getSegments(camera);
  const oldest = segments[0];
  const lastEnd = getLastSegmentEnd(segments);
  const staleForSeconds = lastEnd ? (Date.now() - lastEnd.getTime()) / 1000 : null;

  return {
    courtId: camera.courtId,
    cameraId: camera.cameraId,
    sport: camera.sport || null,
    ingest: segmenter?.getStatus() ?? null,
    chunks: {
      count: segments.length,
      oldestAt: oldest?.programDateTime ?? null,
      newestEndsAt: lastEnd,
      staleForSeconds,
      live: staleForSeconds !== null && staleForSeconds <= config.staleAfterSeconds,
    },
    replay: {
      preRollSeconds: camera.replayPreRollSeconds,
      postRollSeconds: camera.replayPostRollSeconds,
    },
  };
}

export function buildStatusRouter(segmenters: Map<string, Segmenter>): express.Router {
  const router = express.Router();

  router.get('/health', (_req: Request, res: Response) => res.json({ ok: true }));

  // Uma entrada por camera. `live` e por camera: uma camera fora do ar nao
  // derruba o edge, so o angulo dela (ou, se forem todas da quadra, 503 no botao).
  router.get('/status', (_req: Request, res: Response) => {
    res.json({
      cameras: config.cameras.map((camera) => cameraStatus(camera, segmenters.get(cameraKey(camera)))),
      config: {
        chunkDurationSeconds: config.chunkDurationSeconds,
        chunkWindowSeconds: config.chunkWindowSeconds,
        staleAfterSeconds: config.staleAfterSeconds,
      },
    });
  });

  router.get('/status/:courtId', (req: Request, res: Response) => {
    const courtId = req.params.courtId as string;
    const cameras = getCameras(courtId);
    if (cameras.length === 0) {
      res.status(404).json({ ok: false, error: 'quadra sem camera neste edge', code: 'UNKNOWN_COURT' });
      return;
    }
    res.json({
      courtId,
      cameras: cameras.map((camera) => cameraStatus(camera, segmenters.get(cameraKey(camera)))),
    });
  });

  return router;
}

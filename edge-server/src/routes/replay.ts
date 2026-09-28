import fs from 'node:fs';
import express, { Request, Response } from 'express';
import { buildReplay, StreamError } from '../services/replayBuilder';
import { uploadToCloud } from '../services/uploader';
import { enforceOutputRetention } from '../utils/outputRetention';

export const replayRouter = express.Router();

replayRouter.post('/replay', async (_req: Request, res: Response) => {
  try {
    const replay = await buildReplay();
    const upload = await uploadToCloud(replay.outputPath);

    if (upload.uploaded) {
      // Upload confirmado: o .mp4 local nao serve mais pra nada, e e
      // exatamente esse arquivo que, sem isso, cresce sem limite em disco.
      fs.rmSync(replay.outputPath, { force: true });
    } else {
      // Upload falhou (ou o cloud nem existe ainda) - mantem pra retry
      // manual, mas com um teto pra nao acumular sem limite.
      enforceOutputRetention();
    }

    res.json({
      ok: true,
      file: replay.outputName,
      chunkCount: replay.chunkCount,
      approxDurationSeconds: replay.approxDurationSeconds,
      ...upload,
    });
  } catch (err) {
    const streamErr = err as StreamError;
    console.error(`[replay] erro ao gerar replay: ${streamErr.message}`);
    const status = streamErr.code === 'STREAM_STALE' ? 503 : 500;
    res.status(status).json({ ok: false, error: streamErr.message, code: streamErr.code });
  }
});

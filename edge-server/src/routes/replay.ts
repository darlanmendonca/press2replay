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
    }
    // Falha de upload mantem o mp4 pra retry manual, e o spritesheet fica
    // sempre; o teto evita acumular sem limite.
    enforceOutputRetention();

    res.json({
      ok: true,
      file: replay.outputName,
      chunkCount: replay.chunkCount,
      approxDurationSeconds: replay.approxDurationSeconds,
      sprite: replay.spriteName ?? null,
      ...upload,
    });
  } catch (err) {
    const streamErr = err as StreamError;
    console.error(`[replay] erro ao gerar replay: ${streamErr.message}`);
    const status = streamErr.code === 'STREAM_STALE' ? 503 : 500;
    res.status(status).json({ ok: false, error: streamErr.message, code: streamErr.code });
  }
});

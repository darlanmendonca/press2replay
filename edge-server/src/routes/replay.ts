import fs from 'node:fs';
import express, { Request, Response } from 'express';
import { buildReplay, StreamError } from '../services/replayBuilder';
import { uploadToCloud } from '../services/uploader';
import { enforceOutputRetention } from '../utils/outputRetention';

export const replayRouter = express.Router();

replayRouter.post('/replay', async (_req: Request, res: Response) => {
  try {
    const replay = await buildReplay();
    const upload = await uploadToCloud(replay);

    if (upload.uploaded) {
      // Upload confirmado: o mp4 e o spritesheet locais nao servem mais pra
      // nada, e sao exatamente eles que, sem isso, crescem sem limite em disco.
      fs.rmSync(replay.outputPath, { force: true });
      if (replay.spritePath) fs.rmSync(replay.spritePath, { force: true });
    }
    // Falha de upload mantem os arquivos pra retry manual; o teto evita
    // acumular sem limite.
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

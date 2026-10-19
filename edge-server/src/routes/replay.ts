import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import express, { Response } from 'express';
import { Camera, cameraKey, getCameras, getCourtIds } from '../config';
import { buildReplay, StreamError } from '../services/replayBuilder';
import { uploadToCloud } from '../services/uploader';
import { enforceOutputRetention } from '../utils/outputRetention';

export const replayRouter = express.Router();

interface CameraResult {
  cameraId: string;
  ok: boolean;
  file?: string;
  chunkCount?: number;
  approxDurationSeconds?: number;
  sprite?: string | null;
  uploaded?: boolean;
  reason?: string;
  replayId?: string;
  error?: string;
  code?: string;
}

// Gera, sobe e limpa o replay de UMA camera. Nunca lanca: o resultado (ok ou
// erro) volta pro momento, que junta o de todas as cameras da quadra.
async function runCamera(camera: Camera, pressTimestamp: Date, momentId: string): Promise<CameraResult> {
  try {
    const replay = await buildReplay(camera, pressTimestamp);
    const upload = await uploadToCloud(replay, camera, momentId);

    if (upload.uploaded) {
      // Upload confirmado: o mp4 e o spritesheet locais nao servem mais pra
      // nada, e sao exatamente esses arquivos, nao os chunks, que crescem sem
      // limite em disco se ficarem.
      fs.rmSync(replay.outputPath, { force: true });
      if (replay.spritePath) fs.rmSync(replay.spritePath, { force: true });
    }
    // Falha de upload mantem os arquivos pra retry manual; o teto (por
    // camera) evita acumular sem limite.
    enforceOutputRetention(camera.outputDir);

    return {
      cameraId: camera.cameraId,
      ok: true,
      file: replay.outputName,
      chunkCount: replay.chunkCount,
      approxDurationSeconds: replay.approxDurationSeconds,
      sprite: replay.spriteName ?? null,
      ...upload,
    };
  } catch (err) {
    const streamErr = err as StreamError;
    console.error(`[replay:${cameraKey(camera)}] erro ao gerar replay: ${streamErr.message}`);
    return { cameraId: camera.cameraId, ok: false, error: streamErr.message, code: streamErr.code };
  }
}

// Um aperto do botao = um MOMENTO: todas as cameras da quadra cortam a mesma
// janela (mesmo instante de clique) em paralelo, e cada uma sobe e registra o
// seu replay por conta propria, ligados pelo mesmo momentId. Se algumas cameras
// falham, o momento sai com os angulos que existirem. So e erro se TODAS falham
// (503 se todas estavam paradas, 500 nos outros casos). Cada camera decodifica
// um vídeo pro spritesheet: quadras com muitas cameras disputam CPU no Pi.
async function respondWithMoment(courtId: string, cameras: Camera[], res: Response): Promise<void> {
  const pressTimestamp = new Date();
  const momentId = randomUUID();
  const results = await Promise.all(cameras.map((camera) => runCamera(camera, pressTimestamp, momentId)));
  const succeeded = results.filter((result) => result.ok).length;

  let status = 200;
  if (succeeded === 0) status = results.every((result) => result.code === 'STREAM_STALE') ? 503 : 500;

  res.status(status).json({ ok: succeeded > 0, courtId, momentId, cameras: results });
}

// O botao de cada quadra chama a rota da propria quadra.
replayRouter.post('/replay/:courtId', async (req, res) => {
  const cameras = getCameras(req.params.courtId);
  if (cameras.length === 0) {
    res.status(404).json({
      ok: false,
      error: `a quadra "${req.params.courtId}" nao tem camera neste edge`,
      code: 'UNKNOWN_COURT',
      courts: getCourtIds(),
    });
    return;
  }
  await respondWithMoment(req.params.courtId, cameras, res);
});

// Atalho do edge de uma quadra so (como sempre funcionou, mesmo com varias
// cameras nela). Com varias quadras nao ha como adivinhar: recusa.
replayRouter.post('/replay', async (_req, res) => {
  const courts = getCourtIds();
  const [only] = courts;
  if (only === undefined || courts.length !== 1) {
    res.status(400).json({
      ok: false,
      error: `este edge tem ${courts.length} quadras: use POST /replay/:courtId`,
      code: 'COURT_REQUIRED',
      courts,
    });
    return;
  }
  await respondWithMoment(only, getCameras(only), res);
});

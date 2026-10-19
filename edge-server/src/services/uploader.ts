import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import { upload } from '@vercel/blob/client';
import { config, Camera, ID_PATTERN } from '../config';
import type { ReplayResult } from './replayBuilder';

export interface UploadResult {
  uploaded: boolean;
  reason?: string;
  replayId?: string;
}

// Envia o replay pro web-server em dois passos:
//   1. mp4 (e spritesheet) vao DIRETO pro Vercel Blob, com um token emitido por
//      POST {WEB_SERVER_URL}/api/edge/upload. O video nao passa pela funcao do
//      web-server (limite de body ~4.5MB na Vercel) e o edge nao guarda o token
//      do Blob - so a chave do local (EDGE_API_KEY).
//   2. POST {WEB_SERVER_URL}/api/edge/replays registra o replay (quadra, esporte) depois dos arquivos estarem la; so entao ele aparece na pagina.
// O replayId e gerado aqui e faz parte do caminho no storage, entao um retry do
// passo 2 e idempotente. Falha em qualquer ponto -> uploaded=false e os
// arquivos ficam em OUTPUT_DIR (ver outputRetention).
export async function uploadToCloud(replay: ReplayResult, camera: Camera, momentId: string): Promise<UploadResult> {
  const { webServerUrl, edgeApiKey, venueId } = config;
  const { courtId, cameraId, sport } = camera;
  if (!webServerUrl || !edgeApiKey || !venueId || !courtId || !sport) {
    console.log(`[uploader] WEB_SERVER_URL/EDGE_API_KEY/VENUE_ID e courtId/esporte da camera nao configurados (quadra "${courtId}"), mantendo replay so local`);
    return { uploaded: false, reason: 'cloud_not_configured' };
  }
  if (!ID_PATTERN.test(venueId) || !ID_PATTERN.test(courtId)) {
    return { uploaded: false, reason: 'VENUE_ID/COURT_ID invalido (use letras, numeros, - e _, ate 64)' };
  }

  const replayId = randomUUID();
  const auth = { Authorization: `Bearer ${edgeApiKey}` };
  const putOptions = {
    access: 'private' as const,
    handleUploadUrl: `${webServerUrl}/api/edge/upload`,
    headers: auth,
  };

  try {
    const base = `replays/${venueId}/${courtId}/${cameraId}/${replayId}`;
    await upload(`${base}.mp4`, await fs.openAsBlob(replay.outputPath), {
      ...putOptions,
      contentType: 'video/mp4',
      multipart: true,
    });

    // O spritesheet e um extra: se o upload dele falhar, o replay segue sem preview.
    let sprite: { frames: number; columns: number } | undefined;
    if (replay.spritePath) {
      try {
        await upload(`${base}.jpg`, await fs.openAsBlob(replay.spritePath), {
          ...putOptions,
          contentType: 'image/jpeg',
        });
        sprite = { frames: config.spriteFrames, columns: Math.min(config.spriteColumns, config.spriteFrames) };
      } catch (err) {
        console.error(`[uploader] falha ao subir spritesheet (seguindo sem): ${err instanceof Error ? err.message : err}`);
      }
    }

    const response = await fetch(`${webServerUrl}/api/edge/replays`, {
      method: 'POST',
      headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        replayId,
        momentId,
        venueId,
        courtId,
        cameraId,
        sport,
        durationSeconds: Math.round(replay.approxDurationSeconds),
        sprite,
      }),
    });
    if (!response.ok) {
      throw new Error(`registro do replay falhou com status ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }
    return { uploaded: true, replayId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[uploader] falha ao subir replay pro cloud: ${message}`);
    return { uploaded: false, reason: message };
  }
}

import fs from 'node:fs';
import { config } from '../config';

export interface UploadResult {
  uploaded: boolean;
  reason?: string;
}

// Stub: o servidor cloud ainda nao existe (ver AGENT.md, subprojeto 3).
// Quando existir, aqui entra o POST/PUT do arquivo de replay pra la
// (multipart upload ou presigned URL, dependendo do que o cloud server
// expuser). Por enquanto so loga e devolve uploaded=false pra deixar
// claro no retorno da API que o replay ficou salvo so localmente.
export async function uploadToCloud(filePath: string): Promise<UploadResult> {
  if (!config.cloudUploadUrl) {
    console.log(`[uploader] CLOUD_UPLOAD_URL nao configurada, mantendo replay so local: ${filePath}`);
    return { uploaded: false, reason: 'cloud_not_configured' };
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const response = await fetch(config.cloudUploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'video/mp4' },
      body: fileBuffer,
    });
    if (!response.ok) {
      throw new Error(`upload falhou com status ${response.status}`);
    }
    return { uploaded: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[uploader] falha ao subir replay pro cloud: ${message}`);
    return { uploaded: false, reason: message };
  }
}

import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const chunksDir = path.resolve(process.cwd(), process.env.CHUNKS_DIR || './chunks');
const outputDir = path.resolve(process.cwd(), process.env.OUTPUT_DIR || './output');

export type IngestMode = 'rtmp' | 'external';

export const config = {
  port: int(process.env.PORT, 3000),

  ingestMode: (process.env.INGEST_MODE as IngestMode) || 'rtmp', // 'rtmp' (POC via celular) | 'external' (camera RTSP real)
  rtmpPort: int(process.env.RTMP_PORT, 1935),
  inputUrl: process.env.INPUT_URL || 'rtmp://127.0.0.1:1935/live/stream',

  // Duracao "alvo" de cada chunk. O corte real so acontece em keyframes, entao
  // isto so vira realidade se a fonte (camera/app) tiver um I-frame interval
  // igual ou menor que este valor - ver README (secao "GOP / I-frame interval").
  chunkDurationSeconds: int(process.env.CHUNK_DURATION_SECONDS, 1),
  // Janela de retencao dos chunks em disco. So precisa dar folga sobre o
  // REPLAY_SECONDS (concat com -c copy leva bem menos de 1s) - nao afeta
  // bytes escritos por segundo, so quanto fica acumulado (ver README,
  // secao de desgaste de SD/SSD).
  chunkWindowSeconds: int(process.env.CHUNK_WINDOW_SECONDS, 90),

  // Quantos segundos de video o /replay corta (selecionado por duracao real
  // dos chunks na playlist, nao por quantidade de arquivos).
  replaySeconds: int(process.env.REPLAY_SECONDS, 60),

  // Se o ultimo chunk da playlist for mais antigo que isto, consideramos o
  // stream parado e recusamos o replay em vez de devolver video velho.
  staleAfterSeconds: int(process.env.STALE_AFTER_SECONDS, 5),

  // Quanto tempo o /replay espera um chunk que cubra o instante exato do
  // clique antes de seguir com o que tiver disponivel.
  pressWaitTimeoutMs: int(process.env.PRESS_WAIT_TIMEOUT_MS, 3000),

  // Se nenhum chunk novo aparecer nesse intervalo, o segmenter mata e
  // reinicia o ffmpeg (cobre o caso de uma leitura RTSP travada, que nao
  // gera um "exit" sozinha).
  stallTimeoutMs: int(process.env.STALL_TIMEOUT_MS, 8000),

  chunksDir,
  outputDir,

  cloudUploadUrl: process.env.CLOUD_UPLOAD_URL || '',

  // Quantos replays com upload falho ficam guardados em OUTPUT_DIR pra
  // retry manual. O upload bem-sucedido apaga o arquivo local na hora -
  // isso aqui e so um limite pro que fica acumulado quando o upload falha.
  outputRetentionCount: int(process.env.OUTPUT_RETENTION_COUNT, 20),
};

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

  // O /replay corta uma janela fixa em torno do instante do clique: X
  // segundos de "antes" + Y segundos de "depois". Total = 60s por padrao
  // (50+10). Selecionado por duracao real dos chunks na playlist, nao por
  // quantidade de arquivos.
  replayPreRollSeconds: int(process.env.REPLAY_PRE_ROLL_SECONDS, 30),
  replayPostRollSeconds: int(process.env.REPLAY_POST_ROLL_SECONDS, 5),

  // Se o ultimo chunk da playlist for mais antigo que isto (em relacao ao
  // instante do clique), consideramos o stream parado e recusamos o
  // replay em vez de devolver video velho.
  staleAfterSeconds: int(process.env.STALE_AFTER_SECONDS, 5),

  // Quanto tempo (alem do REPLAY_POST_ROLL_SECONDS) o /replay espera os
  // chunks do pos-roll serem gravados antes de desistir e responder com o
  // que tiver disponivel (ou erro, se nem o clique em si foi coberto).
  postRollWaitMarginMs: int(process.env.POST_ROLL_WAIT_MARGIN_MS, 5000),

  // Se nenhum chunk novo aparecer nesse intervalo, o segmenter mata e
  // reinicia o ffmpeg (cobre o caso de uma leitura RTSP travada, que nao
  // gera um "exit" sozinha).
  stallTimeoutMs: int(process.env.STALL_TIMEOUT_MS, 8000),

  // Spritesheet do replay: SPRITE_FRAMES frames igualmente espacados entre o
  // inicio e o fim do video, num grid de SPRITE_COLUMNS colunas, cada frame
  // com SPRITE_FRAME_WIDTH px de largura (altura proporcional). 0 desliga.
  spriteFrames: int(process.env.SPRITE_FRAMES, 12),
  spriteColumns: int(process.env.SPRITE_COLUMNS, 4),
  spriteFrameWidth: int(process.env.SPRITE_FRAME_WIDTH, 320),

  chunksDir,
  outputDir,

  cloudUploadUrl: process.env.CLOUD_UPLOAD_URL || '',

  // Quantos replays com upload falho ficam guardados em OUTPUT_DIR pra
  // retry manual. O upload bem-sucedido apaga o arquivo local na hora -
  // isso aqui e so um limite pro que fica acumulado quando o upload falha.
  outputRetentionCount: int(process.env.OUTPUT_RETENTION_COUNT, 20),
};

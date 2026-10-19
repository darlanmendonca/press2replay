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

// Duracao TOTAL do replay por esporte, em segundos. So estes esportes sao
// aceitos (o web-server valida a mesma lista em src/lib/sports.ts - manter as
// duas em sincronia).
export const SPORT_REPLAY_SECONDS = {
  futsal: 60,
  futebol: 60,
  padel: 30,
  basket: 45,
} as const;
export type Sport = keyof typeof SPORT_REPLAY_SECONDS;

// SPORT vazio = sem esporte (replay so local, janela do REPLAY_*_ROLL_SECONDS).
// Valor fora da lista derruba o boot com mensagem clara, em vez de gravar
// replays com a duracao errada.
function parseSport(raw: string | undefined): Sport | '' {
  const value = (raw ?? '').trim().toLowerCase();
  if (!value) return '';
  if (value in SPORT_REPLAY_SECONDS) return value as Sport;
  throw new Error(`SPORT invalido: "${raw}". Use um de: ${Object.keys(SPORT_REPLAY_SECONDS).join(', ')}`);
}

const sport = parseSport(process.env.SPORT);
const postRollSeconds = int(process.env.REPLAY_POST_ROLL_SECONDS, 5);

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
  // segundos de "antes" + Y segundos de "depois". Com SPORT definido, o total
  // vem da tabela SPORT_REPLAY_SECONDS (futsal/futebol 60s, basket 45s, padel
  // 30s): o pos-roll fica em REPLAY_POST_ROLL_SECONDS (5s) e o resto e
  // pre-roll - REPLAY_PRE_ROLL_SECONDS so vale sem SPORT. Selecionado por
  // duracao real dos chunks na playlist, nao por quantidade de arquivos.
  replayPreRollSeconds: sport
    ? SPORT_REPLAY_SECONDS[sport] - postRollSeconds
    : int(process.env.REPLAY_PRE_ROLL_SECONDS, 30),
  replayPostRollSeconds: postRollSeconds,

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

  // Upload pro web-server (cloud). Sem WEB_SERVER_URL/EDGE_API_KEY/VENUE_ID/
  // COURT_ID/SPORT o replay fica so local (ver services/uploader.ts).
  // EDGE_API_KEY e a chave do LOCAL (gerada no admin): o edge e um so por local.
  // VENUE_ID e COURT_ID entram no caminho do storage e na URL do QR da quadra
  // (/replays/{VENUE_ID}/{COURT_ID}) e tem de existir no admin: so letras,
  // numeros, '-' e '_'. O COURT_ID so e unico dentro do local.
  webServerUrl: (process.env.WEB_SERVER_URL || '').replace(/\/+$/, ''),
  edgeApiKey: process.env.EDGE_API_KEY || '',
  venueId: process.env.VENUE_ID || '',
  courtId: process.env.COURT_ID || '',
  sport,

  // Quantos replays com upload falho ficam guardados em OUTPUT_DIR pra
  // retry manual. O upload bem-sucedido apaga o mp4 e o spritesheet locais na
  // hora - isso aqui e so um limite pro que fica acumulado quando o upload falha.
  outputRetentionCount: int(process.env.OUTPUT_RETENTION_COUNT, 20),
};

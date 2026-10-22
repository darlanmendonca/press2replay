import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

function int(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const chunksBaseDir = path.resolve(process.cwd(), process.env.CHUNKS_DIR || './chunks');
const outputBaseDir = path.resolve(process.cwd(), process.env.OUTPUT_DIR || './output');

export type IngestMode = 'rtmp' | 'external';

const ingestMode: IngestMode = (process.env.INGEST_MODE as IngestMode) || 'rtmp'; // 'rtmp' (POC via celular) | 'external' (camera RTSP real)
const rtmpPort = int(process.env.RTMP_PORT, 1935);

// Duracao TOTAL do replay, em segundos: 1 min por padrao, com excecoes por esporte
// (o padel tem trocas de bola mais longas: 1 min 30 s). So estes esportes sao
// aceitos (o web-server valida a mesma lista em src/lib/sports.ts - manter as
// duas em sincronia). A landing page tambem diz isto (journey.tsx, hero-demo.tsx).
export const DEFAULT_REPLAY_SECONDS = 60;
const REPLAY_SECONDS_EXCEPTIONS = { padel: 90 } as const;
const SPORTS = ['futsal', 'futebol', 'basket', 'padel'] as const;
export type Sport = (typeof SPORTS)[number];
export const SPORT_REPLAY_SECONDS: Record<Sport, number> = Object.fromEntries(
  SPORTS.map((sport) => [
    sport,
    (REPLAY_SECONDS_EXCEPTIONS as Partial<Record<Sport, number>>)[sport] ?? DEFAULT_REPLAY_SECONDS,
  ]),
) as Record<Sport, number>;

// Mesmo formato que o web-server exige pro id do local e da quadra (entra no
// caminho do storage e na URL do QR) - e aqui tambem vira nome de pasta.
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// Uma quadra tem UMA OU MAIS cameras (angulos). O `courtId` e a quadra no
// web-server e na rota do botao (POST /replay/:courtId, que dispara todas as
// cameras dela); o `cameraId` identifica a camera dentro da quadra (livre e
// imutavel: entra no caminho do storage). Sem cameraId na config, vale
// DEFAULT_CAMERA_ID - so permitido em quadra de uma camera so.
export const DEFAULT_CAMERA_ID = 'main';

export interface Camera {
  courtId: string;
  cameraId: string;
  sport: Sport | ''; // '' so no modo legado sem SPORT (replay fica so local)
  inputUrl: string;
  chunksDir: string;
  outputDir: string;
  replayPreRollSeconds: number;
  replayPostRollSeconds: number;
}

function parseSport(raw: unknown, where: string): Sport | '' {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!value) return '';
  if (value in SPORT_REPLAY_SECONDS) return value as Sport;
  throw new Error(`${where}: sport invalido "${String(raw)}". Use um de: ${Object.keys(SPORT_REPLAY_SECONDS).join(', ')}`);
}

// O /replay corta uma janela fixa em torno do instante do clique: X segundos
// de "antes" + Y segundos de "depois". Com esporte, o total vem da tabela
// SPORT_REPLAY_SECONDS (60s por padrao, padel 90s): o pos-roll
// fica em REPLAY_POST_ROLL_SECONDS (5s) e o resto e pre-roll -
// REPLAY_PRE_ROLL_SECONDS so vale sem esporte. Selecionado por duracao real dos
// chunks na playlist, nao por quantidade de arquivos.
function replayWindow(sport: Sport | ''): { pre: number; post: number } {
  const post = int(process.env.REPLAY_POST_ROLL_SECONDS, 5);
  return { pre: sport ? SPORT_REPLAY_SECONDS[sport] - post : int(process.env.REPLAY_PRE_ROLL_SECONDS, 30), post };
}

// Chave unica da camera no edge (mapas, logs).
export function cameraKey(camera: Pick<Camera, 'courtId' | 'cameraId'>): string {
  return `${camera.courtId || 'default'}/${camera.cameraId}`;
}

function buildCamera(courtId: string, cameraId: string, sport: Sport | '', inputUrl: string): Camera {
  const folder = courtId || 'default';
  const { pre, post } = replayWindow(sport);
  return {
    courtId,
    cameraId,
    sport,
    inputUrl,
    chunksDir: path.join(chunksBaseDir, folder, cameraId),
    outputDir: path.join(outputBaseDir, folder, cameraId),
    replayPreRollSeconds: pre,
    replayPostRollSeconds: post,
  };
}

// cameras.json (CAMERAS_FILE, default ./cameras.json): lista de
//   { "courtId": "1", "cameraId": "fundo", "sport": "padel", "inputUrl": "rtsp://user:senha@ip/stream1" }
// - `cameraId` e opcional so em quadra de UMA camera (vira DEFAULT_CAMERA_ID);
//   com mais de uma camera na quadra, todas precisam dele. O esporte e da quadra:
//   as cameras da mesma quadra tem de concordar.
// - `inputUrl` e opcional no modo rtmp: sem cameraId a chave do stream e o
//   courtId (rtmp://127.0.0.1:RTMP_PORT/live/{courtId}); com cameraId e
//   {courtId}.{cameraId} (o "." nao e permitido nos ids, entao nao colide) -
//   e obrigatoria no modo external.
// Fica no edge (nao na nuvem): as URLs RTSP carregam a senha da camera e o edge
// tem de subir sem rede.
function loadCameraFile(file: string): Camera[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`nao consegui ler ${file}: ${err instanceof Error ? err.message : err}`);
  }
  const entries = Array.isArray(parsed) ? parsed : (parsed as { cameras?: unknown })?.cameras;
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(`${file}: esperava uma lista nao vazia de cameras`);
  }

  const rawCameras = entries.map((entry, i) => {
    const where = `${path.basename(file)}[${i}]`;
    const { courtId, cameraId, sport, inputUrl } = (entry ?? {}) as Record<string, unknown>;
    if (typeof courtId !== 'string' || !ID_PATTERN.test(courtId)) {
      throw new Error(`${where}: courtId invalido (use letras, numeros, - e _, ate 64)`);
    }
    if (cameraId !== undefined && (typeof cameraId !== 'string' || !ID_PATTERN.test(cameraId))) {
      throw new Error(`${where} (quadra ${courtId}): cameraId invalido (use letras, numeros, - e _, ate 64)`);
    }
    const parsedSport = parseSport(sport, `${where} (quadra ${courtId})`);
    if (!parsedSport) throw new Error(`${where} (quadra ${courtId}): sport e obrigatorio`);
    return {
      where,
      courtId,
      cameraId: cameraId as string | undefined,
      sport: parsedSport,
      inputUrl: typeof inputUrl === 'string' ? inputUrl.trim() : '',
    };
  });

  // Regras por quadra: com mais de uma camera todas precisam de cameraId, e o
  // esporte (que define a duracao do replay) e um so.
  const byCourt = new Map<string, typeof rawCameras>();
  for (const entry of rawCameras) byCourt.set(entry.courtId, [...(byCourt.get(entry.courtId) ?? []), entry]);
  for (const [courtId, group] of byCourt) {
    if (group.length > 1 && group.some((entry) => entry.cameraId === undefined)) {
      throw new Error(`quadra "${courtId}" tem ${group.length} cameras: todas precisam de cameraId`);
    }
    if (new Set(group.map((entry) => entry.sport)).size > 1) {
      throw new Error(`quadra "${courtId}": as cameras da mesma quadra precisam do mesmo sport`);
    }
  }

  return rawCameras.map(({ where, courtId, cameraId, sport, inputUrl }) => {
    let url = inputUrl;
    if (!url) {
      if (ingestMode === 'external') {
        throw new Error(`${where} (quadra ${courtId}): inputUrl e obrigatorio com INGEST_MODE=external`);
      }
      url = `rtmp://127.0.0.1:${rtmpPort}/live/${courtId}${cameraId ? `.${cameraId}` : ''}`;
    }
    return buildCamera(courtId, cameraId ?? DEFAULT_CAMERA_ID, sport, url);
  });
}

// Sem cameras.json: monta UMA camera a partir de COURT_ID/SPORT/INPUT_URL, como
// o edge sempre funcionou (o .env, o docker compose e os sim:* seguem valendo).
function loadLegacyCamera(): Camera {
  const courtId = process.env.COURT_ID || '';
  if (courtId && !ID_PATTERN.test(courtId)) {
    throw new Error(`COURT_ID invalido: "${courtId}" (use letras, numeros, - e _, ate 64)`);
  }
  const sport = parseSport(process.env.SPORT, 'SPORT');
  return buildCamera(courtId, DEFAULT_CAMERA_ID, sport, process.env.INPUT_URL || 'rtmp://127.0.0.1:1935/live/stream');
}

function loadCameras(): Camera[] {
  const explicit = process.env.CAMERAS_FILE;
  const file = path.resolve(process.cwd(), explicit || './cameras.json');
  let cameras: Camera[];
  if (fs.existsSync(file)) {
    cameras = loadCameraFile(file);
  } else if (explicit) {
    throw new Error(`CAMERAS_FILE aponta para ${file}, que nao existe`);
  } else {
    cameras = [loadLegacyCamera()];
  }

  const seen = new Set<string>();
  for (const camera of cameras) {
    if (seen.has(cameraKey(camera))) {
      throw new Error(`camera repetida: quadra "${camera.courtId}", cameraId "${camera.cameraId}"`);
    }
    seen.add(cameraKey(camera));
    console.log(
      `[config] camera "${camera.cameraId}" da quadra "${camera.courtId || '(sem id)'}" (${camera.sport || 'sem esporte'}): ` +
      `${camera.replayPreRollSeconds}s antes + ${camera.replayPostRollSeconds}s depois, entrada ${camera.inputUrl.replace(/\/\/[^@/]*@/, '//***@')}`,
    );
  }
  return cameras;
}

const cameras = loadCameras();

// A janela de chunks em disco tem de caber o maior replay das cameras deste edge (+ folga),
// senao o corte sairia mais curto que o prometido ao jogador.
{
  const chunkWindow = int(process.env.CHUNK_WINDOW_SECONDS, 120);
  const longest = Math.max(0, ...cameras.map((camera) => (camera.sport ? SPORT_REPLAY_SECONDS[camera.sport] : 0)));
  if (chunkWindow < longest + 10) {
    throw new Error(
      `CHUNK_WINDOW_SECONDS=${chunkWindow} e curto: o maior replay deste edge tem ${longest}s e a janela precisa de pelo menos ${longest + 10}s (use ${Math.max(120, longest + 30)})`,
    );
  }
}

// Todas as cameras de uma quadra (vazio se a quadra nao tem camera aqui).
export function getCameras(courtId: string): Camera[] {
  return cameras.filter((camera) => camera.courtId === courtId);
}

// As quadras que este edge atende (sem repeticao).
export function getCourtIds(): string[] {
  return [...new Set(cameras.map((camera) => camera.courtId))];
}

export const config = {
  port: int(process.env.PORT, 3000),

  ingestMode,
  rtmpPort,

  // Cameras (uma ou mais por quadra) deste edge - ver loadCameras.
  cameras,

  // Duracao "alvo" de cada chunk. O corte real so acontece em keyframes, entao
  // isto so vira realidade se a fonte (camera/app) tiver um I-frame interval
  // igual ou menor que este valor - ver README (secao "GOP / I-frame interval").
  chunkDurationSeconds: int(process.env.CHUNK_DURATION_SECONDS, 1),
  // Janela de retencao dos chunks em disco, POR CAMERA. So precisa dar folga
  // sobre o maior replay (90s no padel; concat com -c copy leva bem menos de 1s)
  // - nao afeta bytes escritos por segundo, so quanto fica acumulado (ver README,
  // secao de desgaste de SD/SSD). Se for menor que o maior replay, o boot falha
  // (ver validacao abaixo): senao o video sairia mais curto que o prometido.
  chunkWindowSeconds: int(process.env.CHUNK_WINDOW_SECONDS, 120),

  // Se o ultimo chunk da playlist for mais antigo que isto (em relacao ao
  // instante do clique), consideramos o stream parado e recusamos o
  // replay em vez de devolver video velho.
  staleAfterSeconds: int(process.env.STALE_AFTER_SECONDS, 5),

  // Quanto tempo (alem do pos-roll) o /replay espera os chunks do pos-roll
  // serem gravados antes de desistir e responder com o que tiver disponivel
  // (ou erro, se nem o clique em si foi coberto).
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

  // Upload pro web-server (cloud). Sem WEB_SERVER_URL/EDGE_API_KEY/VENUE_ID o
  // replay fica so local (ver services/uploader.ts), e idem pra camera sem
  // courtId ou sem esporte. EDGE_API_KEY e a chave do LOCAL (gerada no admin):
  // o edge e um so por local e sobe replays de qualquer quadra dele. VENUE_ID e
  // o courtId de cada camera entram no caminho do storage e na URL do QR da
  // quadra (/replays/{VENUE_ID}/{courtId}) e tem de existir no admin.
  webServerUrl: (process.env.WEB_SERVER_URL || '').replace(/\/+$/, ''),
  edgeApiKey: process.env.EDGE_API_KEY || '',
  venueId: process.env.VENUE_ID || '',

  // Quantos replays com upload falho ficam guardados por camera (em
  // output/{courtId}) pra retry manual. O upload bem-sucedido apaga o mp4 e o
  // spritesheet locais na hora - isso aqui e so um limite pro que fica
  // acumulado quando o upload falha.
  outputRetentionCount: int(process.env.OUTPUT_RETENTION_COUNT, 20),
};

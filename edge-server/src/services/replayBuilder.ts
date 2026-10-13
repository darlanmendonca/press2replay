import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { config } from '../config';
import { getSegments, getLastSegmentEnd, getSegmentsBetween } from '../utils/chunkStore';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface StreamError extends Error {
  code?: string;
}

export interface ReplayResult {
  outputPath: string;
  outputName: string;
  chunkCount: number;
  approxDurationSeconds: number;
  spritePath?: string;
  spriteName?: string;
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg saiu com code ${code}: ${stderr.slice(-2000)}`));
    });
    proc.on('error', reject);
  });
}

// Espera a playlist ter chunks cobrindo ate targetCoverage (o instante do
// clique + o pos-roll pedido) - essas segundos ainda nem tinham acontecido
// no momento do clique, entao o /replay so pode responder depois deles
// serem de fato gravados. Depois do timeout, segue com o que tiver
// disponivel (best effort).
async function waitForPostRoll(targetCoverage: Date) {
  const deadline = Date.now() + config.replayPostRollSeconds * 1000 + config.postRollWaitMarginMs;
  while (Date.now() < deadline) {
    const segments = getSegments();
    const lastEnd = getLastSegmentEnd(segments);
    if (lastEnd && lastEnd.getTime() >= targetCoverage.getTime()) {
      return segments;
    }
    await sleep(250);
  }
  return getSegments();
}

// Corta uma janela fixa em torno do instante do clique: REPLAY_PRE_ROLL_SECONDS
// antes + REPLAY_POST_ROLL_SECONDS depois (50+10 = 60s por padrao). Concatena
// sem reencodar (-c copy, demuxer concat) e usa -t na saida pra travar a
// duracao total exatamente no alvo, independente de sobra nas bordas dos
// chunks selecionados.
export async function buildReplay(): Promise<ReplayResult> {
  const pressTimestamp = new Date();
  const totalSeconds = config.replayPreRollSeconds + config.replayPostRollSeconds;
  const windowStartMs = pressTimestamp.getTime() - config.replayPreRollSeconds * 1000;
  const targetCoverage = new Date(pressTimestamp.getTime() + config.replayPostRollSeconds * 1000);

  const segments = await waitForPostRoll(targetCoverage);

  if (segments.length === 0) {
    const err: StreamError = new Error('Nenhum chunk disponivel ainda - stream nao esta chegando (ou acabou de reiniciar)');
    err.code = 'STREAM_STALE';
    throw err;
  }

  const lastEnd = getLastSegmentEnd(segments);
  const staleForMs = lastEnd ? pressTimestamp.getTime() - lastEnd.getTime() : Infinity;
  if (staleForMs > config.staleAfterSeconds * 1000) {
    const err: StreamError = new Error(
      `stream parece parado (ultimo chunk ha ${(staleForMs / 1000).toFixed(1)}s, na hora do clique) - ` +
      'recusando gerar replay com video antigo',
    );
    err.code = 'STREAM_STALE';
    throw err;
  }

  const window = getSegmentsBetween(windowStartMs, targetCoverage.getTime(), segments)
    .filter((s) => fs.existsSync(s.fullPath));

  if (window.length === 0) {
    throw new Error('Nenhum chunk cobre a janela de pre-roll/pos-roll pedida (stream comecou ha pouco?)');
  }

  fs.mkdirSync(config.outputDir, { recursive: true });

  const listPath = path.join(os.tmpdir(), `replay-list-${Date.now()}.txt`);
  const listContent = window
    .map((s) => `file '${s.fullPath.replace(/'/g, "'\\''")}'`)
    .join('\n');
  fs.writeFileSync(listPath, listContent);

  const timestamp = pressTimestamp.toISOString().replace(/[:.]/g, '-');
  const outputName = `replay_${timestamp}.mp4`;
  const outputPath = path.join(config.outputDir, outputName);

  try {
    await runFfmpeg([
      '-nostdin',
      '-loglevel', 'warning',
      '-f', 'concat',
      '-safe', '0',
      '-i', listPath,
      '-c', 'copy',
      '-t', String(totalSeconds),
      '-movflags', '+faststart',
      outputPath,
    ]);
  } finally {
    fs.rmSync(listPath, { force: true });
  }

  const approxDurationSeconds = Math.min(totalSeconds, window.reduce((total, s) => total + s.duration, 0));

  // O spritesheet e um extra: se falhar, o replay (mp4) continua valendo.
  let spritePath: string | undefined;
  let spriteName: string | undefined;
  if (config.spriteFrames > 0) {
    try {
      spriteName = `replay_${timestamp}.jpg`;
      spritePath = path.join(config.outputDir, spriteName);
      await buildSpritesheet(outputPath, spritePath, approxDurationSeconds);
    } catch (err) {
      console.error(`[replay] falha ao gerar spritesheet: ${err instanceof Error ? err.message : err}`);
      spritePath = undefined;
      spriteName = undefined;
    }
  }

  return { outputPath, outputName, chunkCount: window.length, approxDurationSeconds, spritePath, spriteName };
}

// Extrai SPRITE_FRAMES frames igualmente espacados (fps = frames / duracao,
// entao o 1o frame e o do inicio e o ultimo fica perto do fim) e junta num
// grid unico com o filtro `tile`.
async function buildSpritesheet(videoPath: string, spritePath: string, durationSeconds: number): Promise<void> {
  const frames = config.spriteFrames;
  const columns = Math.min(config.spriteColumns, frames);
  const rows = Math.ceil(frames / columns);
  const fps = frames / Math.max(durationSeconds, 1);

  await runFfmpeg([
    '-nostdin',
    '-loglevel', 'warning',
    '-y',
    '-i', videoPath,
    '-vf', `fps=${fps},scale=${config.spriteFrameWidth}:-2,tile=${columns}x${rows}`,
    '-frames:v', '1',
    '-update', '1',
    '-q:v', '4',
    spritePath,
  ]);
}

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { config } from '../config';
import { getSegments, getLastSegmentEnd, getWindowSeconds, Segment } from '../utils/chunkStore';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface StreamError extends Error {
  code?: string;
}

export interface ReplayResult {
  outputPath: string;
  outputName: string;
  chunkCount: number;
  approxDurationSeconds: number;
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

// Espera ate a playlist ter um chunk que cubra o instante exato do clique
// (o chunk que estava sendo escrito na hora do POST ainda nao fecha na hora).
// Depois de PRESS_WAIT_TIMEOUT_MS, segue com o que tiver disponivel.
async function waitForPressMoment(pressTimestamp: Date): Promise<Segment[]> {
  const deadline = Date.now() + config.pressWaitTimeoutMs;
  while (Date.now() < deadline) {
    const segments = getSegments();
    const lastEnd = getLastSegmentEnd(segments);
    if (lastEnd && lastEnd.getTime() >= pressTimestamp.getTime()) {
      return segments;
    }
    await sleep(250);
  }
  return getSegments();
}

// Concatena os ultimos REPLAY_SECONDS segundos (por duracao real, nao por
// quantidade de arquivos) num unico arquivo, sem reencodar (-c copy). Usa o
// demuxer "concat" do ffmpeg via lista de arquivos - o jeito recomendado pra
// juntar segmentos mpegts que compartilham codec/timebase.
export async function buildReplay(): Promise<ReplayResult> {
  const pressTimestamp = new Date();
  const segments = await waitForPressMoment(pressTimestamp);

  if (segments.length === 0) {
    const err: StreamError = new Error('Nenhum chunk disponivel ainda - stream nao esta chegando (ou acabou de reiniciar)');
    err.code = 'STREAM_STALE';
    throw err;
  }

  const lastEnd = getLastSegmentEnd(segments);
  const staleForMs = lastEnd ? pressTimestamp.getTime() - lastEnd.getTime() : Infinity;
  if (staleForMs > config.staleAfterSeconds * 1000) {
    const err: StreamError = new Error(
      `stream parece parado (ultimo chunk ha ${(staleForMs / 1000).toFixed(1)}s) - ` +
      'recusando gerar replay com video antigo',
    );
    err.code = 'STREAM_STALE';
    throw err;
  }

  const window = getWindowSeconds(config.replaySeconds, segments)
    .filter((s) => fs.existsSync(s.fullPath));

  if (window.length === 0) {
    throw new Error('Chunks listados na playlist nao existem mais em disco (janela pequena demais?)');
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
      '-movflags', '+faststart',
      outputPath,
    ]);
  } finally {
    fs.rmSync(listPath, { force: true });
  }

  return {
    outputPath,
    outputName,
    chunkCount: window.length,
    approxDurationSeconds: window.reduce((total, s) => total + s.duration, 0),
  };
}

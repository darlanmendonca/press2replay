import { spawn, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config';
import { getPlaylistPath } from '../utils/chunkStore';

const RESTART_DELAY_MS = 3000;
const WATCHDOG_INTERVAL_MS = 2000;

export interface SegmenterStatus {
  running: boolean;
  inputUrl: string;
  startedAt: string | null;
  restartCount: number;
  lastError: string | null;
}

// Le o INPUT_URL (RTMP local na fase POC, ou RTSP de uma camera real mais
// pra frente) e grava chunks curtos em mpegts via o muxer HLS do ffmpeg,
// sem reencodar (-c copy). Usamos HLS (em vez do muxer "segment" cru) porque
// a playlist (live.m3u8) traz, pra cada chunk, a duracao real e o horario de
// parede - sem isso nao da pra cortar por tempo de forma confiavel (o corte
// real so acontece em keyframes, entao a duracao "alvo" abaixo e so um
// pedido, nao uma garantia - ver README). `delete_segments` cuida de apagar
// os chunks que saem da janela, entao nao precisamos de faxina manual.
export class Segmenter {
  private process: ChildProcess | null = null;
  private stopped = false;
  private startedAt: string | null = null;
  private lastSpawnAt: number | null = null;
  private restartCount = 0;
  private lastError: string | null = null;
  private restartScheduled = false;
  private watchdogTimer: NodeJS.Timeout | null = null;

  start(): void {
    this.stopped = false;
    fs.mkdirSync(config.chunksDir, { recursive: true });
    this.spawnFfmpeg();
    this.startWatchdog();
  }

  stop(): void {
    this.stopped = true;
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    if (this.process) this.process.kill('SIGTERM');
  }

  getStatus(): SegmenterStatus {
    return {
      running: Boolean(this.process),
      inputUrl: config.inputUrl,
      startedAt: this.startedAt,
      restartCount: this.restartCount,
      lastError: this.lastError,
    };
  }

  private resetChunksDir(): void {
    // Cada (re)inicio do ffmpeg comeca uma "sessao" nova: limpamos os chunks
    // e a playlist anteriores pra nunca deixar o /replay costurar video de
    // antes e depois de uma queda de stream.
    for (const name of fs.readdirSync(config.chunksDir)) {
      if (name.endsWith('.ts') || name.endsWith('.m3u8')) {
        fs.rmSync(path.join(config.chunksDir, name), { force: true });
      }
    }
  }

  private spawnFfmpeg(): void {
    this.resetChunksDir();

    const hlsListSize = Math.max(
      1,
      Math.ceil(config.chunkWindowSeconds / config.chunkDurationSeconds),
    );
    const segmentPattern = path.join(config.chunksDir, 'chunk_%d.ts');

    const globalArgs = ['-nostdin', '-loglevel', 'warning', '-fflags', '+genpts'];

    const inputArgs: string[] = [];
    if (config.inputUrl.startsWith('rtsp://')) {
      // UDP em wifi perde pacote e gera artefato; timeout evita que uma
      // camera que caiu deixe o ffmpeg pendurado pra sempre num read().
      inputArgs.push('-rtsp_transport', 'tcp', '-timeout', '5000000');
    }
    inputArgs.push('-i', config.inputUrl);

    const outputArgs = [
      '-c', 'copy',
      '-f', 'hls',
      '-hls_time', String(config.chunkDurationSeconds),
      '-hls_list_size', String(hlsListSize),
      '-hls_flags', 'delete_segments+program_date_time+independent_segments',
      '-hls_segment_filename', segmentPattern,
      getPlaylistPath(),
    ];

    const args = [...globalArgs, ...inputArgs, ...outputArgs];

    console.log(`[segmenter] iniciando ffmpeg: ffmpeg ${args.join(' ')}`);
    this.process = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    this.startedAt = new Date().toISOString();
    this.lastSpawnAt = Date.now();

    this.process.stderr?.on('data', (data: Buffer) => {
      const line = data.toString().trim();
      if (line) console.log(`[ffmpeg] ${line}`);
    });

    this.process.on('error', (err) => {
      // ex: ffmpeg nao encontrado no PATH. Quando o spawn falha assim, o
      // 'exit' abaixo nao dispara (o processo nunca chegou a existir), entao
      // o retry precisa ser agendado por aqui tambem.
      this.lastError = `falha ao iniciar ffmpeg: ${err.message}`;
      console.error(`[segmenter] ${this.lastError}`);
      this.scheduleRestart();
    });

    this.process.on('exit', (code, signal) => {
      if (this.stopped) {
        this.process = null;
        console.log('[segmenter] ffmpeg finalizado (stop solicitado)');
        return;
      }
      this.lastError = `ffmpeg saiu (code=${code}, signal=${signal})`;
      console.warn(`[segmenter] ${this.lastError}`);
      this.scheduleRestart();
    });
  }

  private scheduleRestart(): void {
    if (this.stopped || this.restartScheduled) return;
    this.restartScheduled = true;
    this.process = null;
    this.restartCount += 1;
    console.warn(`[segmenter] tentando de novo em ${RESTART_DELAY_MS}ms`);
    setTimeout(() => {
      this.restartScheduled = false;
      this.spawnFfmpeg();
    }, RESTART_DELAY_MS);
  }

  private startWatchdog(): void {
    this.watchdogTimer = setInterval(() => {
      if (!this.process || this.stopped) return;

      let referenceMs: number;
      try {
        referenceMs = fs.statSync(getPlaylistPath()).mtimeMs;
      } catch {
        referenceMs = this.lastSpawnAt ?? Date.now();
      }

      const staleForMs = Date.now() - referenceMs;
      if (staleForMs > config.stallTimeoutMs) {
        console.warn(
          `[segmenter] nenhum chunk novo ha ${Math.round(staleForMs / 1000)}s, ` +
          'reiniciando ffmpeg (provavel stream travado)',
        );
        this.process.kill('SIGKILL');
      }
    }, WATCHDOG_INTERVAL_MS);
  }
}

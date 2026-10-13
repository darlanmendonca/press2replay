import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config';

export interface Segment {
  filename: string;
  fullPath: string;
  duration: number;
  programDateTime: Date | null;
}

export function getPlaylistPath(): string {
  return path.join(config.chunksDir, 'live.m3u8');
}

// O ffmpeg (rodando com -f hls) reescreve live.m3u8 a cada chunk fechado,
// listando so os segmentos completos (nunca o que esta sendo escrito agora)
// com a duracao real (#EXTINF) e o horario de parede (#EXT-X-PROGRAM-DATE-TIME)
// de cada um. Isso e o que nos deixa cortar por tempo real em vez de contar
// arquivos ou confiar no nome/mtime deles.
export function getSegments(): Segment[] {
  let text: string;
  try {
    text = fs.readFileSync(getPlaylistPath(), 'utf8');
  } catch {
    return [];
  }

  const segments: Segment[] = [];
  let pendingDuration: number | null = null;
  let pendingPdt: Date | null = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith('#EXT-X-PROGRAM-DATE-TIME:')) {
      pendingPdt = new Date(line.slice('#EXT-X-PROGRAM-DATE-TIME:'.length));
    } else if (line.startsWith('#EXTINF:')) {
      const parsed = Number.parseFloat(line.slice('#EXTINF:'.length));
      pendingDuration = Number.isFinite(parsed) ? parsed : null;
    } else if (!line.startsWith('#')) {
      const fullPath = path.join(config.chunksDir, line);
      segments.push({
        filename: line,
        fullPath,
        duration: pendingDuration ?? config.chunkDurationSeconds,
        programDateTime: pendingPdt,
      });
      pendingDuration = null;
      pendingPdt = null;
    }
  }

  return segments;
}

// Instante (wall clock) em que o ultimo chunk fechado termina. Usado tanto
// pra decidir se o stream esta "vivo" quanto pra saber se ja existe cobertura
// do instante em que o botao de replay foi apertado.
export function getLastSegmentEnd(segments: Segment[] = getSegments()): Date | null {
  const last = segments[segments.length - 1];
  if (!last || !last.programDateTime || Number.isNaN(last.programDateTime.getTime())) {
    return null;
  }
  return new Date(last.programDateTime.getTime() + last.duration * 1000);
}

// Segmentos cujo intervalo [inicio, fim) se sobrepoe a janela de tempo
// [startMs, endMs) pedida (ambos epoch ms). Usado pro corte por pre-roll +
// pos-roll em torno do instante do clique - ve-se o horario de parede real
// de cada chunk (#EXT-X-PROGRAM-DATE-TIME), nao quantidade de arquivos.
export function getSegmentsBetween(
  startMs: number,
  endMs: number,
  segments: Segment[] = getSegments(),
): Segment[] {
  return segments.filter((segment) => {
    if (!segment.programDateTime) return false;
    const segStart = segment.programDateTime.getTime();
    const segEnd = segStart + segment.duration * 1000;
    return segEnd > startMs && segStart < endMs;
  });
}

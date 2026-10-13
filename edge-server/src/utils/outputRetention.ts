import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config';

// So sobra arquivo em OUTPUT_DIR quando o upload pro cloud falha (upload OK
// apaga o .mp4 local na hora, ver routes/replay.ts). Isso aqui e so um teto
// pra esse acumulo de falhas nao crescer sem limite.
export function enforceOutputRetention(): void {
  let files: string[];
  try {
    files = fs.readdirSync(config.outputDir);
  } catch {
    return;
  }

  // .mp4 (replay) e .jpg (spritesheet) tem tetos independentes: o sprite nao
  // e apagado no upload OK (o uploader ainda so envia o mp4).
  for (const ext of ['.mp4', '.jpg']) {
    const sorted = files
      .filter((name) => name.endsWith(ext))
      .map((name) => {
        const fullPath = path.join(config.outputDir, name);
        return { fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs); // mais novo primeiro

    for (const file of sorted.slice(config.outputRetentionCount)) {
      fs.rmSync(file.fullPath, { force: true });
      console.warn(`[output] descartando arquivo antigo: ${path.basename(file.fullPath)}`);
    }
  }
}

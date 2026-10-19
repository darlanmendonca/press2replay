import express from 'express';
import { cameraKey, config } from './config';
import { Segmenter } from './ingest/segmenter';
import { startRtmpIngest } from './ingest/rtmpServer';
import { replayRouter } from './routes/replay';
import { buildStatusRouter } from './routes/status';

if (config.ingestMode === 'rtmp') {
  startRtmpIngest();
}

// Um Segmenter (e um ffmpeg) por camera, indexados por quadra/camera.
const segmenters = new Map<string, Segmenter>();
for (const camera of config.cameras) {
  const segmenter = new Segmenter(camera);
  segmenters.set(cameraKey(camera), segmenter);
  segmenter.start();
}

const app = express();
app.use(buildStatusRouter(segmenters));
app.use(replayRouter);

app.listen(config.port, () => {
  console.log(`[edge-server] API ouvindo na porta ${config.port}`);
  console.log(
    `[edge-server] modo de ingestao: ${config.ingestMode}, ${config.cameras.length} camera(s): ` +
    config.cameras.map((camera) => cameraKey(camera)).join(', '),
  );
});

function shutdown(): void {
  console.log('[edge-server] encerrando...');
  for (const segmenter of segmenters.values()) segmenter.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

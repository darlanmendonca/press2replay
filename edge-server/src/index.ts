import express from 'express';
import { config } from './config';
import { Segmenter } from './ingest/segmenter';
import { startRtmpIngest } from './ingest/rtmpServer';
import { replayRouter } from './routes/replay';
import { buildStatusRouter } from './routes/status';

if (config.ingestMode === 'rtmp') {
  startRtmpIngest();
}

const segmenter = new Segmenter();
segmenter.start();

const app = express();
app.use(buildStatusRouter(segmenter));
app.use(replayRouter);

app.listen(config.port, () => {
  console.log(`[edge-server] API ouvindo na porta ${config.port}`);
  console.log(`[edge-server] modo de ingestao: ${config.ingestMode}, input: ${config.inputUrl}`);
});

function shutdown(): void {
  console.log('[edge-server] encerrando...');
  segmenter.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

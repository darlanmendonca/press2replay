import NodeMediaServer from 'node-media-server';
import { config } from '../config';

// Servidor RTMP local, usado so na fase da POC: o celular (com um app tipo
// Larix Broadcaster) da push do stream pra ca, no lugar de uma camera IP
// real. Quando a camera com RTSP nativo chegar, isso nem precisa subir
// (ver INGEST_MODE=external em config.ts) - o ffmpeg do segmenter passa a
// consumir a URL RTSP da camera diretamente. Com varias cameras, cada uma publica
// na sua chave: rtmp://IP:1935/live/{courtId} (ver cameras.json).
export function startRtmpIngest(): NodeMediaServer {
  const nms = new NodeMediaServer({
    rtmp: {
      port: config.rtmpPort,
      chunk_size: 60000,
      gop_cache: true,
      ping: 30,
      ping_timeout: 60,
    },
    // Sem secao "http": nao precisamos que o node-media-server sirva
    // HLS/FLV, o ffmpeg do segmenter consome direto do RTMP interno.
  });

  nms.on('prePublish', (id, streamPath) => {
    console.log(`[rtmp] stream entrando: ${streamPath} (session ${id})`);
  });

  nms.on('donePublish', (id, streamPath) => {
    console.log(`[rtmp] stream encerrado: ${streamPath} (session ${id})`);
  });

  nms.run();
  console.log(`[rtmp] servidor RTMP ouvindo na porta ${config.rtmpPort}`);
  return nms;
}

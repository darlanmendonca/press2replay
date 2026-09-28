declare module 'node-media-server' {
  interface NodeMediaServerConfig {
    rtmp?: {
      port?: number;
      chunk_size?: number;
      gop_cache?: boolean;
      ping?: number;
      ping_timeout?: number;
    };
    http?: Record<string, unknown>;
  }

  // So cobre a fatia da API que este projeto usa (config + run + eventos de
  // publish). O pacote nao tem types oficiais compativeis com a versao
  // instalada.
  class NodeMediaServer {
    constructor(config: NodeMediaServerConfig);
    run(): void;
    on(event: 'prePublish' | 'donePublish', listener: (id: string, streamPath: string) => void): void;
  }

  export = NodeMediaServer;
}

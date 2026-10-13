<p align="center">
  <img src="Press2Replay.png" alt="Press2Replay" width="280">
</p>

# Press2Replay

Replay instantâneo para esportes amadores (futsal, padel etc.): uma câmera
filma a quadra o tempo todo, e quando alguém aperta o botão de replay o
sistema entrega o vídeo do lance, sem operador de câmera nem edição.

Apresentação do projeto: [`Press2replay_Apresentacao.pdf`](Press2replay_Apresentacao.pdf).

> Estado: POC em andamento. O `edge-server` está implementado; o `web-server`
> acabou de ser criado (ainda no template do Next.js).

## Como funciona

```
[Câmera] --stream--> [edge-server (Raspberry Pi)] --upload--> [web-server (cloud)]
                         |                                         |
                grava chunks de ~1s                      usuário entra e baixa
                POST /replay corta o lance               seus vídeos
```

1. A câmera envia vídeo continuamente pro **edge-server** (RTSP numa câmera IP;
   RTMP na fase de testes com celular).
2. O edge grava chunks de ~1s numa janela circular em disco.
3. `POST /replay` junta os chunks de 30s antes + 5s depois do clique em um mp4
   (ffmpeg, sem reencode) e gera um spritesheet com frames do vídeo.
4. O mp4 sobe pro **web-server**, onde o usuário o acessa e baixa.

## Estrutura

Monorepo simples: cada projeto tem seu próprio `package.json` e
`node_modules` (sem workspaces, para o `edge-server` poder ser copiado
sozinho pro Raspberry Pi).

| Pasta | O que é | Stack |
| --- | --- | --- |
| [`edge-server/`](edge-server/README.md) | Ingest, chunks e geração do replay. Roda no Raspberry Pi. | Node.js, Express, ffmpeg |
| `web-server/` | Hotsite, área do usuário e API que recebe os uploads. | Next.js 16 (App Router), React 19, TypeScript |
| [`AGENT.md`](AGENT.md) | Contexto e decisões do projeto (para sessões de IA). | — |

## Requisitos

- Node.js 25+ (`engines` do `edge-server`) e npm
- `ffmpeg` e `ffprobe` no `PATH` (`brew install ffmpeg` no Mac,
  `sudo apt install ffmpeg` no Raspberry Pi)

## Subindo tudo com Docker (dev)

Somente para desenvolvimento (em prod o `web-server` vai pra Vercel e o edge
roda direto no Raspberry Pi). Com o Docker instalado, da raiz:

```bash
docker compose up --build
```

| Serviço | URL no host |
| --- | --- |
| `edge-server` | http://localhost:3000 (RTMP em `:1935`) |
| `web-server` | http://localhost:3001 |

O código vem por bind mount, então há hot reload nos dois. Um `.env` em cada
pasta é opcional e, se existir, é carregado. Se mudar o `package.json`, suba
com `docker compose up --build -V` para renovar o `node_modules` do container.
Sem publisher RTMP, o edge fica reiniciando o ffmpeg e logando "nenhum chunk
novo": é o comportamento esperado até algo começar a transmitir.

## Rodando o edge-server

```bash
cd edge-server
cp .env.example .env
npm install
npm run dev
```

Endpoints (porta `3000` por padrão):

| Rota | O que faz |
| --- | --- |
| `GET /health` | Liveness: `{"ok": true}`. |
| `GET /status` | Estado do ingest, chunks em disco e se o stream está ao vivo. |
| `POST /replay` | Corta a janela do lance e gera `replay_<timestamp>.mp4` e `.jpg` em `output/`. |

Principais variáveis (`.env`, defaults em `edge-server/src/config.ts`):

| Variável | Default | |
| --- | --- | --- |
| `INGEST_MODE` | `rtmp` | `rtmp` (POC) ou `external` (câmera RTSP) |
| `INPUT_URL` | `rtmp://127.0.0.1:1935/live/stream` | Fonte do stream |
| `REPLAY_PRE_ROLL_SECONDS` / `REPLAY_POST_ROLL_SECONDS` | `30` / `5` | Janela do replay |
| `CHUNK_WINDOW_SECONDS` | `90` | Quanto de vídeo fica em disco |
| `SPRITE_FRAMES` | `12` | Frames do spritesheet (`0` desliga) |
| `CLOUD_UPLOAD_URL` | vazio | Destino do upload (hoje um stub) |

A câmera (ou o app de teste) precisa ter **keyframe a cada 1–2s**, senão os
chunks saem maiores que o esperado. Detalhes, troubleshooting e recomendação de
deploy (chunks em tmpfs para poupar o cartão SD) em
[`edge-server/README.md`](edge-server/README.md).

## Rodando o web-server

```bash
cd web-server
npm install
npm run dev     # http://localhost:3000 (use PORT=3100 se o edge já ocupar a 3000)
```

O `web-server/AGENTS.md` pede para ler `node_modules/next/dist/docs/` antes de
escrever código: esta versão do Next tem mudanças em relação ao que é comum.

## Deploy do edge no Raspberry Pi

Alvo: Raspberry Pi 4 Model B, Raspberry Pi OS Lite 64-bit em microSD de 32GB.

1. Gravar o SO com o Raspberry Pi Imager (hostname, usuário, SSH e Wi-Fi nas
   configurações avançadas).
2. `sudo apt update && sudo apt full-upgrade -y && sudo apt install -y ffmpeg git`
   e instalar o Node LTS.
3. Copiar o `edge-server/` (sem `node_modules`, `chunks` e `output`), `npm ci`
   e configurar o `.env`.
4. IP fixo: preferir reserva DHCP no roteador pelo MAC do Pi.
5. Rodar como serviço systemd e, se possível, `CHUNKS_DIR` em `/dev/shm`.

Passos 4 e 5 ainda por fazer.

## Próximos passos

- Preparar o Raspberry Pi (serviço systemd, IP fixo, tmpfs).
- Implementar no `web-server` o recebimento de upload, storage e download.
- Trocar o celular de teste pela câmera RTSP real.

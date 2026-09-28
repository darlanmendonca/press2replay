# Edge server

API em Node.js que roda no Raspberry Pi (ou, por enquanto, na sua máquina
para dev), ingere o vídeo, mantém uma janela circular de chunks em disco e,
quando chamada, corta os últimos ~60s e gera o arquivo de replay.

## Por que RTSP (e não WebRTC)

Câmeras IP de baixo custo (Reolink, TP-Link Tapo, Hikvision, Dahua etc.),
tanto em 1080p quanto 4K, praticamente sempre expõem um servidor **RTSP**
nativo com o vídeo já codificado em hardware. O edge só precisa **puxar**
esse stream e gravar sem reencodar (`-c copy`) — leve o suficiente pra
rodar num Raspberry Pi. WebRTC exigiria SFU, STUN/TURN e normalmente
reencode: complexidade desnecessária já que aqui não há necessidade de
latência interativa, só gravação contínua.

Na fase de POC (celular no lugar da câmera), a ponte mais simples é o
celular dar **push via RTMP** para um servidor RTMP leve rodando aqui
(`node-media-server`, embutido nesta API). O `ffmpeg` que gera os chunks
consome esse RTMP local exatamente da mesma forma que vai consumir o RTSP
da câmera real depois — só a `INPUT_URL` muda.

## GOP / I-frame interval (importante)

O corte em chunks só pode acontecer em **keyframes** — não existe reencode
aqui (`-c copy`), então o `ffmpeg` não pode cortar no meio de um GOP. Isso
quer dizer que o tamanho real de cada chunk é `max(CHUNK_DURATION_SECONDS,
intervalo de keyframe da fonte)`, não o valor "alvo" configurado.

Na prática: a câmera (ou o app do celular, na fase POC) **precisa** ser
configurada com um I-frame interval de 1–2s (GOP = fps ou 2×fps). A maioria
das câmeras de vigilância já vem assim por padrão (pensado pra permitir seek
suave em NVRs), mas vale sempre conferir/configurar explicitamente. Não faz
sentido perseguir precisão de frame aqui — 1–2s de precisão no início do
corte é mais que suficiente pra um replay esportivo.

## Como funciona

1. `INGEST_MODE=rtmp` (padrão na POC): sobe um servidor RTMP local na porta
   `RTMP_PORT` (default 1935). O celular publica o stream nele.
2. O `Segmenter` roda um processo `ffmpeg` com o muxer **HLS** (`-f hls`)
   lendo `INPUT_URL`, sem reencodar. A cada chunk fechado o ffmpeg reescreve
   `chunks/live.m3u8`, listando cada segmento com sua **duração real**
   (`#EXTINF`) e **horário de parede** (`#EXT-X-PROGRAM-DATE-TIME`) — é isso
   que permite cortar por tempo de verdade em vez de contar arquivos ou
   confiar em nome/mtime (nomes de arquivo são reciclados e não servem como
   fonte de ordem cronológica).
3. `delete_segments` cuida de apagar os chunks que saem da janela de
   `CHUNK_WINDOW_SECONDS` **continuamente, a cada segundo** — não é algo que
   só acontece quando o processo reinicia, e não tem faxina manual por cima
   disso (uma segunda rotina de limpeza por idade só correria contra o
   próprio ffmpeg, sem ganho nenhum). O que faz sentido ajustar é o *valor*
   de `CHUNK_WINDOW_SECONDS`: só precisa de folga sobre `REPLAY_SECONDS`
   (com `-c copy` o concat leva bem menos de 1s), então 90s já é confortável
   para um corte de 60s — não precisa ser um valor grande "por segurança".
4. A cada (re)início do `ffmpeg` (queda de stream, restart do processo), a
   pasta de chunks é limpa: cada sessão de stream começa "do zero", pra
   nunca costurar vídeo de antes e depois de uma queda.
5. Um watchdog verifica a cada poucos segundos se a playlist está recebendo
   chunks novos; se travar (ex: leitura RTSP pendurada, que não gera erro
   nem "exit" sozinha) o ffmpeg é morto e reiniciado.
6. `POST /replay`:
   - Espera (até `PRESS_WAIT_TIMEOUT_MS`) um chunk que cubra o instante
     exato do clique — o chunk sendo escrito na hora do POST ainda não
     fechou.
   - Se o último chunk da playlist estiver mais velho que
     `STALE_AFTER_SECONDS`, recusa com `503` em vez de devolver vídeo
     antigo (stream caiu).
   - Junta os últimos `REPLAY_SECONDS` segundos (por duração real, não por
     quantidade de arquivos) com `ffmpeg -f concat -c copy -movflags
     +faststart` num `.mp4` em `OUTPUT_DIR`.
   - Tenta subir pro servidor cloud (ainda não existe — fica como stub em
     `src/services/uploader.ts`, controlado por `CLOUD_UPLOAD_URL`).
   - Se o upload for confirmado, o `.mp4` local é apagado na hora — é
     exatamente esse arquivo, não os chunks, que cresceria sem limite em
     disco se ficasse. Se falhar (ou o cloud nem existir ainda), o arquivo
     fica pra retry manual, mas com um teto (`OUTPUT_RETENTION_COUNT`) que
     descarta os mais antigos além desse limite.

## Requisitos

- Node.js 18+ (testado com 24)
- `ffmpeg` disponível no `PATH` (no Raspberry Pi: `sudo apt install ffmpeg`;
  no Mac para dev: `brew install ffmpeg`)

Projeto em **TypeScript** (`src/**/*.ts`). Compilação via `tsc` pra
`dist/`; em dev roda direto com `tsx` (sem passo de build).

## Setup

```bash
cp .env.example .env
npm install

# dev: roda direto do .ts, reinicia sozinho quando um arquivo muda
npm run dev

# producao: compila pra dist/ e roda o JS compilado
npm run build
npm start

# so checar tipos, sem gerar nada em dist/
npm run typecheck
```

## Endpoints

- `GET /health` — liveness simples.
- `GET /status` — estado do processo de ingestão (rodando? quantos
  restarts? qual `INPUT_URL`?), quantos chunks existem na playlist agora, e
  se o stream está "ao vivo" (`live: true/false`, com base em
  `STALE_AFTER_SECONDS`).
- `POST /replay` — gera o corte dos últimos `REPLAY_SECONDS` (~60s) e
  retorna o nome do arquivo gerado (e se o upload pro cloud rolou ou não).
  Responde `503` se o stream estiver parado.

## Testando sem celular nem câmera

Pra validar o pipeline de segmentação/corte sem depender do app mobile
ainda, dá pra simular uma câmera fazendo o ffmpeg da sua máquina publicar
um vídeo (ou a webcam) via RTMP pro edge — **lembrando de forçar o GOP de
1s** (`-g`/`-keyint_min`/`-sc_threshold 0`), senão os chunks saem bem mais
longos que o esperado (foi o que aconteceu no primeiro teste aqui, sem
esses parâmetros o keyframe só vinha a cada ~8s):

```bash
# usando um arquivo de vídeo em loop como se fosse a câmera
ffmpeg -re -stream_loop -1 -i algum_video.mp4 \
  -c:v libx264 -g 30 -keyint_min 30 -sc_threshold 0 \
  -c:a aac -f flv rtmp://127.0.0.1:1935/live/stream

# ou usando a webcam do notebook (Mac), a 30fps
ffmpeg -f avfoundation -framerate 30 -i "0" \
  -c:v libx264 -preset ultrafast -pix_fmt yuv420p \
  -g 30 -keyint_min 30 -sc_threshold 0 \
  -f flv rtmp://127.0.0.1:1935/live/stream
```

Com isso publicando, `GET /status` já deve mostrar chunks aparecendo (~1s
cada) e `live: true`, e `POST /replay` deve gerar um `.mp4` em `output/`.
Vale também testar: matar o publisher e chamar `/replay` de novo — deve
responder `503` em vez de devolver o vídeo antigo.

## Checklist pra compra da câmera (verificar na ficha técnica, não de memória)

- **fps na resolução máxima**: muitas câmeras 4K baratas caem pra menos de
  25fps em 4K — ruim pra lance esportivo. Confirmar fps real em 1080p *e*
  em 4K antes de comprar achando que "4K" já garante fluidez.
- **I-frame interval configurável** (ver seção GOP acima).
- **Opção de H.264 no stream principal** — reprodução de HEVC em navegador
  é mais frágil; H.264 é o caminho de menor atrito pro POC.
- **Bitrate** — dimensiona tanto o espaço quanto a RAM necessária pra
  janela de retenção (ver seção de desgaste de disco/tmpfs abaixo).

## Desgaste de disco e por que usar tmpfs (RAM) em vez de SD/SSD

Importante: **reduzir `CHUNK_WINDOW_SECONDS` não reduz o desgaste** — ele só
limita quanto fica acumulado em disco, não quantos bytes são escritos por
segundo. Quem determina isso é o bitrate da câmera, não a janela de
retenção.

Regra de bolso: `bitrate (Mbps) × 10.8 ≈ GB/dia`. Exemplos:
- 1080p a ~8 Mbps ≈ **86 GB/dia**
- 4K a ~25 Mbps ≈ **270 GB/dia**

Isso escrito continuamente, 24h em operação, é pesado pra qualquer cartão
SD (e a maioria não informa TBW — confira a ficha técnica de qualquer SSD
ou SD antes de decidir, não confie nesses números de cabeça).

A solução recomendada é simplesmente **nunca escrever os chunks em disco
persistente**: montar `CHUNKS_DIR` (e `OUTPUT_DIR`, já que o `.mp4` é
apagado logo após o upload) num `tmpfs` — sistema de arquivos que vive na
RAM. Isso zera o desgaste de flash pros chunks, e como já é apagado
continuamente pelo `delete_segments`/pelo teto de retenção, o consumo de
RAM fica previsível:

```
tamanho ≈ CHUNK_WINDOW_SECONDS × bitrate + replays em transito
```

Exemplos com `CHUNK_WINDOW_SECONDS=90`:
- 1080p a 8 Mbps: ≈ **90 MB**
- 4K a 25 Mbps: ≈ **280 MB**, mais ~190MB por replay 4K em processamento

Ou seja, a RAM (não o SSD) passa a ser o recurso a dimensionar — o que
inclusive abre a possibilidade de **tirar o SSD da lista de compras** e usar
só o cartão SD do próprio Raspberry Pi (que aí serve só pro sistema
operacional, com pouquíssima escrita).

Exemplo de `/etc/fstab` no Raspberry Pi (tamanho fixo, pra um pico não
consumir toda a RAM do sistema):
```
tmpfs /home/pi/replay/edge-server/chunks tmpfs rw,size=256M,nodev,nosuid 0 0
tmpfs /home/pi/replay/edge-server/output tmpfs rw,size=256M,nodev,nosuid 0 0
```

`CHUNKS_DIR`/`OUTPUT_DIR` no `.env` continuam apontando pra esses caminhos
normalmente — o código não sabe (nem precisa saber) que é tmpfs. No Mac de
dev isso não existe (tmpfs não é padrão no macOS), então localmente os
caminhos relativos do `.env.example` continuam gravando em disco normal —
sem problema, é só ambiente de teste.

Com os chunks em RAM, não tem motivo pra abrir mão da precisão de 1s por
segundo trocando pra chunks maiores — a escrita em RAM não desgasta nada.

Se a fonte vier em HEVC/H.265 em algum momento, adicionar `-tag:v hvc1`
no concat pra compatibilidade de playback.

Se o serviço rodar sob `systemd`, vale configurar o `journald` como
volátil (ou com um teto de tamanho) — sem isso, os logs do ffmpeg a cada
segundo acabam indo pro disco de qualquer jeito por outro caminho.

CPU não é o gargalo aqui — `-c copy` já é o mínimo de processamento
possível (sem reencode). Vale medir de fato no Raspberry Pi quando ele
chegar, em vez de estimar.

## Próximos passos / pontos em aberto

- Trocar `INGEST_MODE=rtmp` por `external` + `INPUT_URL=rtsp://...` quando a
  câmera real chegar (o resto do pipeline não muda).
- Autenticação no `POST /replay` (hoje está aberto).
- Implementar de fato o upload em `src/services/uploader.ts` quando o
  servidor cloud existir.
- Confirmar se o Raspberry Pi usado tem encoder de hardware H.264 (só
  relevante se algum dia precisarmos reencodar; hoje o pipeline inteiro
  evita isso de propósito).

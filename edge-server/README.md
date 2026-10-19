# Edge server — Press2Replay

API em Node.js que roda no Raspberry Pi (ou, por enquanto, na sua máquina
para dev), ingere o vídeo de **uma ou mais câmeras (uma por quadra)**, mantém
uma janela circular de chunks em disco por câmera e, quando chamada, corta uma
janela de tempo em torno do instante do clique na quadra pedida (duração por
esporte; sem esporte, 30s antes + 5s depois) e gera o arquivo de replay.
Um edge atende um lugar inteiro: ver "Várias câmeras" abaixo.

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

## Várias câmeras (uma ou mais por quadra)

Um edge atende o lugar todo: **uma ou mais câmeras por quadra** (ângulos). O
`courtId` é a quadra (o mesmo id do admin e da URL do QR) e o `cameraId`
identifica a câmera dentro da quadra. Um aperto do botão é um **momento**: todas
as câmeras da quadra cortam a mesma janela ao mesmo tempo, cada uma sobe o seu
replay e o web-server os mostra juntos, com um seletor de ângulo.

**Configuração** — `cameras.json` (`CAMERAS_FILE`, default `./cameras.json`;
modelo em `cameras.example.json`), uma entrada por câmera:

```json
[
  { "courtId": "1", "cameraId": "fundo",   "sport": "padel",  "inputUrl": "rtsp://usuario:senha@192.168.1.101:554/stream1" },
  { "courtId": "1", "cameraId": "lateral", "sport": "padel",  "inputUrl": "rtsp://usuario:senha@192.168.1.102:554/stream1" },
  { "courtId": "2", "sport": "futsal" }
]
```

- `sport` é obrigatório e é **da quadra**: as câmeras da mesma quadra têm de
  concordar (define a duração do replay).
- `cameraId` (letras, números, `-` e `_`, até 64) é livre, **único dentro da
  quadra** e vai no caminho do storage, então não o mude depois de haver
  replays. É opcional só em quadra de **uma** câmera (vira `main`); com mais de
  uma, todas precisam dele.
- `inputUrl` é opcional com `INGEST_MODE=rtmp`: sem `cameraId` a chave do stream
  é o `courtId` (`rtmp://IP_DO_PI:1935/live/{courtId}`); com `cameraId` é
  `{courtId}.{cameraId}` (o `.` não é permitido nos ids, então `a-b`+`c` não
  colide com `a`+`b-c`). Com `external` é obrigatório (RTSP).
- O arquivo fica **só no edge** (tem a senha das câmeras; está no `.gitignore`)
  e o edge sobe sem rede. A senha nunca vai pro log nem pro `/status`.
- Erros (câmera repetida, quadra com várias câmeras sem `cameraId`, esportes
  diferentes na mesma quadra, id mal formado, lista vazia, `inputUrl` faltando)
  derrubam o boot com a mensagem do problema.
- **Sem `cameras.json`** o edge monta uma câmera só a partir de `COURT_ID`,
  `SPORT` e `INPUT_URL` do `.env`, como sempre funcionou.
- A quadra tem de existir no admin do web-server (ver `VENUE_ID`/
  `EDGE_API_KEY`). **Não há cadastro de câmeras no admin**: o `cameraId` só tem o
  formato conferido, então um erro de digitação aqui cria um ângulo "fantasma"
  na página. O esporte do `cameras.json` é o que vai no replay; o "esporte
  padrão" da quadra no admin é só informativo.

**Uso** — cada botão chama a rota da própria quadra: `POST /replay/{courtId}`
dispara **todas** as câmeras dela e responde com o `momentId` e o resultado de
cada câmera. É `200` se pelo menos uma câmera gerou o replay (as que falharam
vêm listadas e o momento sai só com os ângulos que existem); só é erro se
**todas** falharem (`503` se estavam todas paradas, `500` nos outros casos).
`404` se a quadra não tem câmera neste edge. `POST /replay` sem quadra só
funciona com **uma** quadra (mesmo com várias câmeras nela); com várias quadras
responde `400` em vez de adivinhar. Cada câmera é independente: uma parada não
afeta as outras, e botões apertados ao mesmo tempo geram replays separados.

**Pastas**: `chunks/{courtId}/{cameraId}` e `output/{courtId}/{cameraId}`, com o
teto de retenção por câmera.

**Recursos** (Raspberry Pi 4): cada câmera adiciona um processo `ffmpeg` (com
`-c copy`, quase só I/O) e a sua própria janela de chunks — some a RAM do
`tmpfs` por câmera (ver "Desgaste de disco") —, e **cada replay pedido decodifica
um vídeo pra gerar o spritesheet**: um aperto numa quadra de 3 câmeras decodifica
3 ao mesmo tempo, e vários botões juntos disputam CPU. Não há fila: meça no
hardware real antes de fixar quantas câmeras cabem num Pi.

**Segurança**: `POST /replay/:courtId`, `/status` e a publicação RTMP não têm
autenticação — mantenha o edge na rede local do lugar.

## Como funciona

1. `INGEST_MODE=rtmp` (padrão na POC): sobe um servidor RTMP local na porta
   `RTMP_PORT` (default 1935). O celular publica o stream nele.
2. Cada câmera tem o seu `Segmenter`: um processo `ffmpeg` com o muxer
   **HLS** (`-f hls`) lendo o `inputUrl` dela, sem reencodar. A cada chunk
   fechado o ffmpeg reescreve `chunks/{courtId}/{cameraId}/live.m3u8`, listando cada segmento com sua **duração real**
   (`#EXTINF`) e **horário de parede** (`#EXT-X-PROGRAM-DATE-TIME`) — é isso
   que permite cortar por tempo de verdade em vez de contar arquivos ou
   confiar em nome/mtime (nomes de arquivo são reciclados e não servem como
   fonte de ordem cronológica).
3. `delete_segments` cuida de apagar os chunks que saem da janela de
   `CHUNK_WINDOW_SECONDS` **continuamente, a cada segundo** — não é algo que
   só acontece quando o processo reinicia, e não tem faxina manual por cima
   disso (uma segunda rotina de limpeza por idade só correria contra o
   próprio ffmpeg, sem ganho nenhum). O que faz sentido ajustar é o *valor*
   de `CHUNK_WINDOW_SECONDS`: só precisa de folga sobre
   `REPLAY_PRE_ROLL_SECONDS` (com `-c copy` o concat leva bem menos de 1s),
   então 90s já é confortável para um pre-roll de 30s — não precisa ser um
   valor grande "por segurança".
4. A cada (re)início do `ffmpeg` (queda de stream, restart do processo), a
   pasta de chunks é limpa: cada sessão de stream começa "do zero", pra
   nunca costurar vídeo de antes e depois de uma queda.
5. Um watchdog verifica a cada poucos segundos se a playlist está recebendo
   chunks novos; se travar (ex: leitura RTSP pendurada, que não gera erro
   nem "exit" sozinha) o ffmpeg é morto e reiniciado.
6. `POST /replay` corta uma janela **fixa** em torno do instante do clique:
   `REPLAY_PRE_ROLL_SECONDS` antes + `REPLAY_POST_ROLL_SECONDS` depois
   (total por esporte, definido por `SPORT`: futsal/futebol 60s, basket 45s,
   padel 30s, sempre com 5s de pós-roll; sem esporte, 30+5=35s) — não é "os últimos N segundos até agora", é uma janela
   ancorada no clique, com pedaço de antes e de depois do lance.
   - O pós-roll ainda nem aconteceu no instante do clique, então o endpoint
     **espera de verdade** (até `REPLAY_POST_ROLL_SECONDS` +
     `POST_ROLL_WAIT_MARGIN_MS` de folga) até os chunks desses segundos
     serem gravados antes de responder — o `/replay` fica “pendurado” por
     alguns segundos de propósito, isso é esperado, não é lentidão.
   - Se o último chunk da playlist (na hora do clique) estiver mais velho
     que `STALE_AFTER_SECONDS`, recusa com `503` em vez de devolver vídeo
     antigo (stream caiu).
   - Junta os chunks que caem dentro dessa janela (por horário real de
     parede de cada um, não por quantidade de arquivos) com
     `ffmpeg -f concat -c copy -t <pre+post> -movflags +faststart` num
     `.mp4` em `OUTPUT_DIR` — o `-t` na saída trava a duração total
     exatamente no alvo (`REPLAY_PRE_ROLL_SECONDS + REPLAY_POST_ROLL_SECONDS`),
     independente de sobra nas bordas dos chunks selecionados.
   - Sobe pro web-server (`src/services/uploader.ts`), em dois passos: o
     `.mp4` e o spritesheet vão **direto pro Vercel Blob** (token emitido por
     `POST /api/edge/upload`; o vídeo não passa pela função do web-server) e
     depois `POST /api/edge/replays` registra o replay com `VENUE_ID`,
     `COURT_ID` e `SPORT`. O edge só conhece a `EDGE_API_KEY` (a chave do
     **place**, gerada em `/admin/places/{id}` no web-server; um edge por
     place), nunca o token do Blob. O place e a quadra têm de existir no admin.
     Sem `WEB_SERVER_URL`/`EDGE_API_KEY`/`VENUE_ID`/`COURT_ID`/`SPORT`, o
     replay fica só local. O QR do botão
     aponta pra `{WEB_SERVER_URL}/replays/{VENUE_ID}/{COURT_ID}`.
   - Se o upload for confirmado, o `.mp4` e o `.jpg` locais são apagados na
     hora — são exatamente esses arquivos, não os chunks, que cresceriam sem
     limite em disco se ficassem. Se falhar, os arquivos ficam pra retry
     manual, mas com um teto (`OUTPUT_RETENTION_COUNT`) que descarta os mais
     antigos além desse limite.

## Requisitos

- Node.js 20+ (testado com 24; o upload usa `fs.openAsBlob`; o `engines` do `package.json` pede 25+)
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
- `GET /status` — `{ cameras: [...] }`, uma entrada por câmera:
  `courtId`, `cameraId`, `sport`, estado da ingestão (rodando? quantos restarts? qual
  entrada, sem senha?), quantos chunks existem na playlist agora, se o stream
  está "ao vivo" (`live: true/false`, com base em `STALE_AFTER_SECONDS`) e o
  pré/pós-roll. `GET /status/:courtId` devolve `{ courtId, cameras }` só da
  quadra (404 se não existe).
- `POST /replay/:courtId` — gera o momento da quadra: cada câmera corta pré-roll
  antes + `REPLAY_POST_ROLL_SECONDS` depois do clique (60/45/30s conforme o
  esporte) e sobe o seu replay. Retorna o `momentId` e, por câmera, o arquivo e
  se o upload pro cloud rolou ou não. Demora pelo menos o pós-roll pra
  responder, de propósito (ver seção "Como funciona"). `503` se **todas** as
  câmeras da quadra estiverem paradas (uma só parada não impede o momento),
  `404` se a quadra não tem câmera aqui.
- `POST /replay` — atalho do edge de uma quadra só; com várias quadras
  responde `400`.

## Testando sem celular nem câmera

Pra validar o pipeline de segmentação/corte sem depender do app mobile
ainda, dá pra simular uma câmera fazendo o ffmpeg da sua máquina publicar
um vídeo (ou a webcam) via RTMP pro edge — **lembrando de forçar o GOP de
1s** (`-g`/`-keyint_min`/`-sc_threshold 0`), senão os chunks saem bem mais
longos que o esperado (foi o que aconteceu no primeiro teste aqui, sem
esses parâmetros o keyframe só vinha a cada ~8s), **e de sempre incluir
áudio no teste**, mesmo sintético — todo teste feito aqui inicialmente era
só vídeo, e isso escondeu um bug real (ver nota de E-RTMP logo abaixo) que
só aparece com áudio+vídeo juntos:

```bash
# gerando video+audio sinteticos (nao depende de arquivo nem webcam)
ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30" -f lavfi -i "sine=frequency=1000" \
  -c:v libx264 -preset ultrafast -pix_fmt yuv420p -g 30 -keyint_min 30 -sc_threshold 0 \
  -c:a aac -f flv rtmp://127.0.0.1:1935/live/stream

# usando um arquivo de vídeo em loop como se fosse a câmera
ffmpeg -re -stream_loop -1 -i algum_video.mp4 \
  -c:v libx264 -g 30 -keyint_min 30 -sc_threshold 0 \
  -c:a aac -f flv rtmp://127.0.0.1:1935/live/stream

# ou usando a webcam do notebook (Mac), a 30fps
ffmpeg -f avfoundation -framerate 30 -i "0:0" \
  -c:v libx264 -preset ultrafast -pix_fmt yuv420p \
  -g 30 -keyint_min 30 -sc_threshold 0 \
  -c:a aac \
  -f flv rtmp://127.0.0.1:1935/live/stream
```

Atalhos (rodando no host, com o edge de pé): `npm run sim:camera` publica a
câmera sintética acima e `npm run sim:button` faz o `POST /replay` — é o
"botão virtual" enquanto o botão físico não existe (nada no repo chama o
`/replay` ainda). Com várias câmeras, defina a quadra e o ângulo:
`COURT=1 CAMERA=fundo npm run sim:camera` publica na chave `1.fundo` (sem
`CAMERA`, na chave `1`) e `COURT=1 npm run sim:button` chama `/replay/1`, que
dispara todos os ângulos da quadra; `PATTERN=testsrc2 TONE=440` muda a imagem e o
som pra distinguir câmeras (todas com o seu `courtId`/`cameraId` no
`cameras.json`). Deixe a câmera rodando o tempo do esporte (60s no futsal, 30s no padel) antes de apertar.

Com isso publicando, `GET /status` já deve mostrar chunks aparecendo (~1s
cada) e `live: true`, e `POST /replay` deve gerar um `.mp4` em `output/`.
Vale também testar: matar o publisher e chamar `/replay` de novo — deve
responder `503` em vez de devolver o vídeo antigo.

## "Só chega áudio, sem vídeo" — troubleshooting

Sintoma: RTMP conecta e publica normalmente (aparece nos logs do
`node-media-server`), mas o `.mp4` final só tem 1 stream (áudio) — `ffprobe`
não mostra vídeo nenhum. Várias hipóteses já foram investigadas aqui; as
duas primeiras foram **descartadas** (ficam registradas pra não serem
re-testadas à toa), a terceira é a que está sendo validada agora.

1. **Enhanced RTMP** (descartado) — suspeita inicial de que o
   `node-media-server` (RTMP "clássico") não entendia a extensão
   [Enhanced RTMP](https://github.com/veovera/enhanced-rtmp) que o
   HaishinKit anuncia por padrão. Descartado capturando o RTMP bruto direto
   com `ffmpeg -listen 1 -i rtmp://0.0.0.0:1935/live/stream` (sem nenhum
   servidor no meio) — o vídeo já não chegava nem aí. Mantido desligado no
   código mesmo assim (não faz mal, e o `node-media-server` de fato não
   suporta E-RTMP): `RTMPConnection(fourCcList: nil, videoFourCcInfoMap: nil,
   audioFourCcInfoMap: nil, capsEx: 0)`.
2. **Reconectar a mesma instância de RTMPStream/RTMPConnection**
   (descartado) — existe um bug real e conhecido no HaishinKit 2.2.5 nesse
   cenário ([PR #1944](https://github.com/HaishinKit/HaishinKit.swift/pull/1944),
   ainda sem fix mergeado), e o `StreamController` recria
   `MediaMixer`/`RTMPConnection`/`RTMPStream` do zero a cada `start()` por
   causa disso (mudança mantida, é uma correção legítima de qualquer forma).
   Mas isso **não era a causa do problema aqui** — o sintoma persistiu mesmo
   com instâncias novas a cada tentativa.
3. **Perfil H.264 incompatível com 1080p** (suspeita atual, validação em
   andamento) — o app configura `videoSize: 1920x1080` mas usava o
   `profileLevel` default da lib (`Baseline_3_1`), que pelo spec H.264 tem
   teto de 3600 macroblocks (equivalente a 1280x720). 1080p são 8160
   macroblocks, bem acima do teto — nesse cenário o VideoToolbox pode
   rejeitar/descartar os frames silenciosamente (sem erro visível pro app),
   e como o áudio não passa por essa restrição, só ele sai pelo RTMP.
   Correção aplicada: `profileLevel: kVTProfileLevel_H264_High_AutoLevel`
   explícito no `VideoCodecSettings`. **Ainda não confirmado em device
   real** — atualizar esta seção assim que for validado (ou descartado).

Se esse sintoma voltar a aparecer com outro publisher/servidor no futuro, o
jeito mais rápido de isolar de novo é o mesmo usado aqui: capturar o RTMP
bruto com `ffmpeg -listen` direto na porta, sem nenhum servidor no meio —
se o vídeo já não estiver lá, o problema é no publisher, não no relay.

Isso também é um lembrete pra quando a câmera IP real entrar: o caminho
RTSP não passa pelo `node-media-server` (o ffmpeg lê a câmera direto), mas
se algum dia trocarmos de servidor de ingest RTMP, vale confirmar que ele
suporta o que o publisher realmente manda.

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
tamanho ≈ nº de câmeras × CHUNK_WINDOW_SECONDS × bitrate + replays em transito
```

(Com várias câmeras, cada uma tem a sua janela em `chunks/{courtId}` e o seu
`output/{courtId}`: multiplique pelo número de câmeras. Os exemplos abaixo são
**por câmera**.)

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

- Trocar `INGEST_MODE=rtmp` por `external` + `inputUrl` RTSP (no
  `cameras.json`, ou `INPUT_URL` no modo de uma câmera) quando a câmera real
  chegar (o resto do pipeline não muda).
- Ler do admin a lista de quadras e os esportes (hoje o `cameras.json` repete o
  esporte que também está cadastrado lá; o `inputUrl` continua local).
- Cadastro de câmeras no admin (hoje o `cameraId` só tem o formato conferido; um
  erro de digitação cria um ângulo "fantasma").
- Autenticação no `POST /replay` (hoje está aberto).
- Retry automático de replays que ficaram em `OUTPUT_DIR` por falha de
  upload (hoje o retry é manual).
- Confirmar se o Raspberry Pi usado tem encoder de hardware H.264 (só
  relevante se algum dia precisarmos reencodar; hoje o pipeline inteiro
  evita isso de propósito).

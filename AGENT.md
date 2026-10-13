# Press2Replay — POC de replay instantâneo para esportes amadores

## Visão geral

POC para a startup **Press2Replay** (logo em `Press2Replay.png`, apresentação em
`Presentation.pdf`, ambos na raiz): jogadores de partidas de futebol de salão, padel, etc.
apertam um botão e recebem a gravação do **momento do lance** (~35s por
padrão), sem precisar de operador de câmera ou edição manual.

Ideia central: uma câmera fica sempre filmando e fazendo *stream* para um
servidor **edge** local (rodando num Raspberry Pi, na própria quadra). O edge
mantém uma janela deslizante dos últimos segmentos de vídeo. Quando alguém
aperta o botão de "replay", o edge junta a janela em torno do clique (30s
antes + 5s depois, configurável) num único vídeo (com ffmpeg) e sobe esse arquivo para um servidor na **nuvem**, onde fica
disponível para o jogador acessar depois (link, app, etc).

Este arquivo existe para fixar o contexto entre sessões e é atualizado
conforme o projeto avança. A iteração é gradual, um componente por vez.

## Estrutura do repositório (monorepo)

Monorepo simples, **sem npm workspaces**: cada projeto tem seu próprio
`package.json` e `node_modules`. Isso mantém o `edge-server/` instalável e
copiável sozinho pro Raspberry Pi. Se um dia for preciso compartilhar tipos
entre os projetos, migra-se para workspaces.

```
replay/          # pasta local do repo; o produto se chama Press2Replay
├── edge-server/   # API Node/Express no Raspberry Pi (ingest + corte + replay)
├── web-server/    # Next.js: hotsite + área do usuário + API (cloud)
├── AGENT.md       # este arquivo (contexto pra sessões de IA)
└── README.md      # visão geral e como rodar
```

## Os subprojetos

### 1. Edge server (`edge-server/`, Raspberry Pi)

Responsabilidades:
- Receber o stream de vídeo da câmera. Na POC a fonte é um celular dando push
  via RTMP (app de teste, **fora deste repo**); a câmera real (RTSP) deve
  passar a ser usada nos próximos dias — só muda `INGEST_MODE`/`INPUT_URL`.
- Gravar o stream em **chunks curtos** (~1 segundo) em disco, mantendo uma
  janela circular e descartando os mais antigos.
- Expor `POST /replay`, que:
  - corta uma janela fixa em torno do clique (30s antes + 5s depois, por
    padrão) concatenando os chunks com **ffmpeg** (`-c copy`, sem reencode);
  - salva o vídeo final localmente (`replay_<timestamp>.mp4`);
  - gera um **spritesheet** (`replay_<timestamp>.jpg`) com frames
    igualmente espaçados do início ao fim do vídeo;
  - faz upload pro cloud (hoje um stub).
- Rodar num Raspberry Pi 4 Model B — restrição de CPU/IO, por isso nada de
  reencode pesado no corte.

### 2. Web server (`web-server/`, cloud)

Projeto em **Next.js** (App Router, TypeScript, `src/`, sem Tailwind), criado
via `create-next-app` e ainda no template inicial. Vai ser ao mesmo tempo:
- **hotsite** do produto;
- **área dos usuários**, onde entram e baixam os próprios vídeos;
- **API** que recebe o upload dos replays vindos do edge (é o destino do
  `CLOUD_UPLOAD_URL`) e serve os vídeos.

Pontos em aberto:
- Storage dos vídeos (S3-like, disco, etc.).
- Autenticação de usuário e como um replay é associado a um usuário/quadra.
- Autenticação do upload vindo do edge.
- O Next desta versão tem mudanças em relação ao que costuma estar nos
  modelos — `web-server/AGENTS.md` manda ler `node_modules/next/dist/docs/`
  antes de escrever código; seguir isso.

## Fluxo de dados (end-to-end)

```
[Câmera] --stream contínuo--> [Edge - Raspberry Pi]
                                      |
                            grava em chunks de ~1s
                            (janela circular, descarta os antigos)
                                      |
 [botão/cliente] --POST /replay-----> [Edge]
                                      |
                            ffmpeg concatena a janela pré+pós-roll
                            gera mp4 + spritesheet
                                      |
                            upload ----------> [web-server (Next.js)]
                                                      |
                                              armazena e disponibiliza
                                              pro usuário baixar
```

## Ordem de implementação

1. **Edge server** — feito (ver abaixo).
2. **Preparar o Raspberry Pi 4** — SD de 32GB, Raspberry Pi OS Lite 64-bit,
   Node + ffmpeg, edge-server como serviço systemd, IP fixo (reserva DHCP no
   roteador pelo MAC), `CHUNKS_DIR` em tmpfs.
3. **Web server** — receber upload, storage, listagem/download, hotsite.
4. Trocar a fonte de teste (celular) pela câmera real RTSP.

## Estado atual

- **Edge server** (`edge-server/`): implementado e testado localmente
  (ponta a ponta, com uma câmera simulada via ffmpeg). Detalhes técnicos e
  decisões (por que RTSP, requisito de GOP/keyframe, checklist de compra de
  câmera) estão em `edge-server/README.md` — este é o documento a
  consultar antes de mexer nesse subprojeto.
  - Ingestão via RTMP local (`node-media-server`) na fase POC; troca para
    RTSP direto de uma câmera real é só configuração (`INGEST_MODE=external`
    + `INPUT_URL=rtsp://...`).
  - Segmentação via muxer HLS do ffmpeg (não o `segment` cru — a playlist
    HLS dá duração real e timestamp de cada chunk, necessário pra cortar por
    tempo de forma confiável).
  - `POST /replay` corta uma janela **fixa** em torno do clique — 30s antes
    + 5s depois por padrão (`REPLAY_PRE_ROLL_SECONDS`/
    `REPLAY_POST_ROLL_SECONDS`), total travado exatamente nessa soma (`-t`
    no ffmpeg) — não é "os últimos N segundos até agora". Como o pós-roll
    ainda nem aconteceu no instante do clique, o endpoint demora de
    propósito pelo menos o tempo do pós-roll pra responder (validado com
    50s/10s: request de ~8.5s, arquivo final com 60.03s, vídeo+áudio ok —
    mesma lógica vale pros valores atuais de 30s/5s). Recusa (503) se o
    stream estiver parado/travado.
  - Spritesheet: `SPRITE_FRAMES` (12), `SPRITE_COLUMNS` (4),
    `SPRITE_FRAME_WIDTH` (320); `0` em `SPRITE_FRAMES` desliga. Falha ao
    gerar não derruba o replay. A resposta do `/replay` traz o campo
    `sprite`. O uploader só envia o mp4, então o `.jpg` nunca é apagado no
    upload: a retenção (`OUTPUT_RETENTION_COUNT`) agora roda em todo
    `/replay` e limita `.mp4` e `.jpg` separadamente.
  - `GET /health` (liveness) e `GET /status` (ingest, chunks, `live`) já
    existem em `src/routes/status.ts`.
  - Upload pro cloud é um stub (`src/services/uploader.ts`) — aguardando o
    web-server aceitar o upload. Upload confirmado apaga o `.mp4` local na hora;
    falha de upload mantém o arquivo com um teto de retenção
    (`OUTPUT_RETENTION_COUNT`) pra não crescer sem limite.
  - Janela de retenção dos chunks (`CHUNK_WINDOW_SECONDS`) reduzida pra 90s
    (era 300s) — o `delete_segments` do ffmpeg já limpa continuamente a
    cada segundo, então só precisa de folga sobre o corte de 60s.
  - Recomendação de deploy (documentada em detalhe no README): colocar
    `CHUNKS_DIR`/`OUTPUT_DIR` em `tmpfs` (RAM) no Raspberry Pi, pra zerar o
    desgaste de escrita em SD/SSD — nesse cenário o SSD passa a ser
    dispensável no hardware, e RAM vira o recurso a dimensionar
    (~90MB pra 1080p, ~280MB pra 4K com janela de 90s).
- **Web server** (`web-server/`): Next 16.4, React 19.3, TS, App Router,
  Tailwind v4 (tema Press2Replay em `globals.css`, extraído do
  `Presentation.pdf`). Deploy na Vercel (Hobby, Root Directory `web-server`).
  - **Banco**: Postgres + Drizzle (driver `postgres`). Local: serviço
    `postgres` no `docker-compose.yml`; prod: Neon pelo Marketplace da Vercel
    (injeta `DATABASE_URL` com pooling e `DATABASE_URL_UNPOOLED`, usada nas
    migrations). Migrations em `web-server/drizzle/`; `npm run db:migrate`
    roda no start do container e no `vercel-build` (pula com aviso se não
    houver `DATABASE_URL`). A conexão (`src/db/index.ts`) é preguiçosa pra o
    `next build` não exigir banco.
  - **Tabela `venue_staff`** = funcionários da quadra e também a tabela de
    usuários do Better Auth (`firstName` é o `name` dele; `lastName`,
    `phoneNumber`, `isAdmin` são campos extras; `isAdmin` não vem do input).
  - **Auth**: Better Auth, e-mail + senha, **sem cadastro público**
    (`disableSignUp`). Primeiro admin: `npm run db:create-admin`. Rotas:
    `/login`, `/admin` (protegida), `/api/auth/*`. `proxy.ts` só faz redirect
    otimista pelo cookie; a validação real é `src/lib/session.ts`
    (`requireStaff`/`requireAdmin`), dentro de `<Suspense>` por causa do Cache
    Components. **Cada página/consulta deve checar a sessão por conta própria**
    — o conteúdo estático de uma página vai no payload mesmo sem sessão.
  - Falta: criar funcionários (admin), salas, upload/listagem de vídeos,
    storage (Vercel Blob atrás de uma camada fina; guardar só a chave no banco),
    página pública do jogador, hotsite.
- **Raspberry Pi 4 Model B**: ainda a preparar (gravar SD de 32GB, instalar
  Node/ffmpeg, serviço, IP fixo).
- Este documento deve ser atualizado conforme decisões técnicas forem tomadas.

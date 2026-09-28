# Replay — POC de replay instantâneo para esportes amadores

## Visão geral

POC para uma startup: jogadores de partidas de futebol de salão, padel, etc.
apertam um botão físico/no app e recebem a gravação do **último minuto** de
jogo, sem precisar de operador de câmera ou edição manual.

Ideia central: uma câmera fica sempre filmando e fazendo *stream* para um
servidor **edge** local (rodando num Raspberry Pi, na própria quadra). O edge
mantém uma janela deslizante dos últimos segmentos de vídeo. Quando alguém
aperta o botão de "replay", o edge junta os últimos 60 segmentos num único
vídeo (com ffmpeg) e sobe esse arquivo para um servidor na **nuvem**, onde fica
disponível para o jogador acessar depois (link, app, etc).

Este é o momento 0 do projeto: pasta vazia, nada implementado ainda. Este
arquivo existe para fixar o contexto entre sessões e será atualizado conforme
o projeto avança. A iteração será gradual, um componente por vez.

## Os 3 subprojetos

O repositório vai conter três projetos distintos, provavelmente em
subpastas próprias (`edge-server/`, `mobile-app/`, `cloud-server/` — nomes
a confirmar quando cada um for iniciado):

### 1. Servidor Edge (Raspberry Pi)

Responsabilidades:
- Receber o stream de vídeo da câmera (na POC, o stream virá do app mobile —
  ver seção 2).
- Gravar o stream em **chunks curtos** (a ideia inicial é ~1 segundo por
  chunk) para disco local, mantendo uma janela circular (ex.: os últimos N
  minutos) e descartando os chunks mais antigos.
- Expor um endpoint HTTP (POST) tipo `/replay` que, ao ser chamado:
  - Pega os **últimos 60 chunks** gravados (≈ últimos 60 segundos, dado 1
    chunk/segundo).
  - Usa **ffmpeg** para concatenar esses chunks em um único arquivo de
    vídeo.
  - Salva esse vídeo final localmente.
  - Faz upload desse vídeo para o servidor na nuvem.
- Roda num Raspberry Pi na POC — então tem restrição de CPU/IO, e a escolha
  de codec/formato de chunk precisa considerar isso (idealmente evitar
  reencode pesado no corte, usar `-c copy` no concat sempre que possível).

Pontos em aberto a decidir quando começarmos a implementar:
- Protocolo de ingestão do stream (RTMP, RTSP, WebRTC, HLS push, etc.) — impacta
  diretamente como o ffmpeg vai segmentar (`-f segment`) e como o app mobile
  vai enviar o vídeo.
- Formato de chunk (ex. `.ts` via segmentação MPEG-TS costuma ser o mais
  fácil de concatenar sem reencode).
- Onde fica o limite dos "últimos 60 chunks" — nome de arquivo com
  timestamp/índice sequencial, e uma rotina de limpeza dos chunks antigos.
- Autenticação/segurança do endpoint de replay e do upload pra nuvem (na POC
  pode ser simples, mas vale já não deixar aberto).

### 2. App Mobile

Nota importante: nesta fase da POC o celular é apenas um **substituto
temporário** de uma câmera dedicada — uma câmera de verdade (IP, USB, etc.)
será adquirida em breve. O app mobile, portanto, tem só o papel de captar e
fazer stream de vídeo (fazendo as vezes da câmera) e de disparar o replay.
Ele **não** é o lugar onde o jogador assiste ao vídeo depois — isso é
responsabilidade do servidor cloud (ver seção 3). Quando a câmera real
chegar, o papel de "streaming de vídeo" do app deixa de ser necessário,
ficando só o botão de replay (ou nem isso, se o botão físico ficar
acoplado à própria câmera/quadra).

Responsabilidades:
- Usar a câmera do celular para capturar vídeo continuamente e fazer stream
  para o servidor edge (celular atua como a "câmera" da POC, no lugar de uma
  câmera IP dedicada que será adquirida futuramente).
- Ter um botão de **"Replay"** na interface: ao ser apertado, dispara o POST
  para o endpoint do servidor edge que aciona o corte dos últimos 60s.
- Feedback visual simples de que o replay foi solicitado/está processando.

Pontos em aberto:
- Framework (React Native, Flutter, nativo) — a definir quando chegarmos
  nessa etapa.
- Como o celular está na mesma rede local do Raspberry Pi (Wi-Fi da quadra) —
  a POC assume ambos na mesma LAN.

### 3. Servidor Cloud

Responsabilidades:
- Receber o upload do vídeo de replay enviado pelo servidor edge.
- Armazenar o vídeo (storage — a definir: S3-like, disco simples, etc. já
  que é POC).
- Disponibilizar de alguma forma o vídeo para o jogador (link direto,
  listagem simples, ou futuramente integração com o app).

Pontos em aberto:
- Ainda o mais indefinido dos três — será detalhado quando chegarmos nele.
- Provavelmente começa como algo bem simples (upload + storage + listagem),
  sem autenticação de usuário final na POC.

## Fluxo de dados (end-to-end)

```
[Celular/câmera] --stream continuo--> [Edge - Raspberry Pi]
                                            |
                                  grava em chunks de ~1s
                                  (janela circular, descarta os antigos)
                                            |
      [App] --POST /replay--------------> [Edge]
                                            |
                                  ffmpeg concatena últimos 60 chunks
                                            |
                                  salva vídeo final localmente
                                            |
                                  upload -------------> [Cloud server]
                                                              |
                                                      armazena e disponibiliza
```

## Ordem de implementação sugerida

Como o próprio usuário colocou, a iteração será gradual. Ordem natural,
dado que cada peça depende de poder testar a anterior:
1. **Edge server**: lógica de segmentação + corte com ffmpeg + endpoint de
   replay, testável no início até com um stream de teste (ex. `ffmpeg` lendo
   de um arquivo ou webcam do notebook) antes mesmo do app mobile existir.
2. **App mobile**: stream da câmera do celular pro edge + botão de replay.
3. **Cloud server**: recepção do upload + storage + disponibilização do
   vídeo.

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
  - `POST /replay` corta os últimos ~60s por tempo real (não por contagem de
    arquivos), espera cobrir o instante exato do clique, e recusa (503) se o
    stream estiver parado/travado.
  - Upload pro cloud é um stub (`src/services/uploader.ts`) — aguardando o
    subprojeto 3 existir. Upload confirmado apaga o `.mp4` local na hora;
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
- **App mobile**: não iniciado.
- **Servidor cloud**: não iniciado.
- Este documento é o ponto de partida; deve ser atualizado conforme decisões
  técnicas forem tomadas e cada subprojeto for iniciado.

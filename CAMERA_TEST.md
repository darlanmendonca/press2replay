# Teste com a câmera real (VIGI C250): ponto de situação e plano

Documento para retomar o passo 3 numa nova sessão. **Para o Claude:** lê este ficheiro
primeiro, confirma comigo o que já tenho (secção "O que falta comprar/ter") e conduz-me
**um passo de cada vez**, esperando eu dizer "concluído" antes do seguinte. Nunca me peças
para colar senhas ou a `EDGE_API_KEY` na conversa.

## Onde estamos

O passo 2 (edge no Raspberry com simulador) está **concluído e validado**:

| Item | Estado |
| --- | --- |
| Pi | Raspberry Pi 4, Raspberry Pi OS Lite 64-bit, hostname `p2r-edge-test` (`ssh darlan@p2r-edge-test.local`), login por senha |
| Rede | Wi-Fi de casa (o Pi não tem cabo ligado); Tailscale instalado e ligado |
| Software | ffmpeg 7.1, Node v25.9.0, edge em `/opt/press2replay/edge-server` (clone sparse, utilizador `press2replay`, deploy key só de leitura) |
| Serviço | `press2replay.service` ativo no boot; config em `/etc/press2replay/edge.env` |
| Nuvem | `WEB_SERVER_URL=https://press2replay.com`, `VENUE_ID=test-darlan-house`, quadra `1`, esporte `padel`; upload validado de ponta a ponta |
| Atualização | `press2replay-update.timer` (a cada 10 min, git pull + rollback), testado, incluindo rollback |
| Câmera | **ainda simulada** (ffmpeg no Mac a empurrar RTMP para `rtmp://p2r-edge-test.local:1935/live/stream`) |

Guia completo de instalação em `edge-server/INSTALL.md`. Está por commitar (ver `git status`).

## A câmera: TP-Link VIGI C250

Câmera domo de **5MP, de exterior, só por cabo (sem Wi-Fi)**. Nunca foi ligada nem
configurada.

Especificações (de lojas, a confirmar no manual da TP-Link):
- Uma porta **Ethernet 10/100**; energia por **PoE** (pelo mesmo cabo) **ou 12 V DC**.
  Não confirmei o padrão PoE (provavelmente 802.3af).
- Resolução máxima 2880×1620, compressão **H.265+** por defeito, bitrate máximo 6 Mbps.
- Suporta **ONVIF**; o RTSP é provável mas **não está confirmado**: testar com `ffprobe`.

## O que falta comprar/ter

O meu router **não tem saída PoE** e **não tenho cabo de rede** à mão. Antes de ligar:

- [ ] **Cabo de rede** (Cat5e/Cat6) da câmera até ao router (ou a um switch).
- [ ] **Energia para a câmera**, uma destas:
  - **Injetor PoE** 802.3af (o mais prático, um só cabo, poucos euros). Fica entre o router
    e a câmera: router → cabo → entrada "LAN/Data" do injetor → saída "PoE" → câmera.
  - **Switch PoE** (se quiser ligar mais câmeras depois).
  - **Adaptador 12 V DC** (≥ 1 A, ficha cilíndrica 5,5×2,1 mm, positivo ao centro), se a
    câmera tiver a entrada e a caixa não o incluir.
- [ ] Um **telemóvel** para a app **VIGI Security Manager** (configuração inicial).

Ver o que vem na caixa antes de comprar: normalmente só a câmera, parafusos e guia.

## Plano (um passo de cada vez)

### 3.1 Ligar a câmera e achar o IP
1. Ligar o cabo + energia (PoE ou 12 V). Esperar 1-2 min até a câmera arrancar.
2. Descobrir o IP: painel do router (lista de dispositivos, nome tipo `VIGI...`), ou app
   VIGI Security Manager (adicionar dispositivo na mesma rede).
3. **Ativar** a câmera: na primeira vez pede para criar a senha de administrador. Usar uma
   senha forte e guardá-la num gestor de senhas.
4. No router, **reservar o IP** para a câmera (reserva DHCP), para não mudar.

### 3.2 Configurar a imagem (interface web da câmera ou app VIGI)
Entrar no IP da câmera no browser (ou na app) e, no **stream principal**:
- **Compressão de vídeo: H.264** (não H.265: o replay é um mp4 que o jogador vê no
  telemóvel, e o H.265 não toca em muitos browsers; o edge copia o vídeo sem reencodar).
- **Intervalo de I-frame (GOP): 1 a 2 segundos** (igual ao fps ou 2×fps). Sem isso o
  corte do replay só acontece de N em N segundos (ver `edge-server/README.md`).
- Resolução/bitrate: começar com **1080p ou 2K a ~4 Mbps**, para o upload não ficar pesado.
  O stream a 5MP gera mp4 de dezenas de MB por replay.
- **Áudio:** desligado, se não for necessário.
- Confirmar que **RTSP** está ativo e se o acesso RTSP/ONVIF usa uma conta própria (nalgumas
  VIGI cria-se uma "conta de dispositivo/ONVIF" à parte da do administrador).

### 3.3 Testar o RTSP a partir do Mac (antes de mexer no Pi)
URLs prováveis (**confirmar no manual**; o stream principal costuma ser `stream1`, o
secundário `stream2`):

```bash
ffprobe -rtsp_transport tcp "rtsp://UTILIZADOR:SENHA@IP_DA_CAMERA:554/stream1"
```

Deve listar `Stream #0:0: Video: h264`. Se for `hevc`, voltar ao passo 3.2. Se pedir
credenciais ou falhar, tentar `stream2` e a conta ONVIF/RTSP.

### 3.4 Apontar o edge para a câmera
No Pi (`ssh darlan@p2r-edge-test.local`), editar `/etc/press2replay/edge.env`:

```ini
INGEST_MODE=external
INPUT_URL=rtsp://UTILIZADOR:SENHA@IP_DA_CAMERA:554/stream1
```

(Manter `COURT_ID=1`, `SPORT=padel` e as linhas da nuvem.) Depois
`sudo systemctl restart press2replay`. Se a senha tiver caracteres especiais (`@`, `:`,
`/`, `#`), codificá-la em URL ou usar uma senha só com letras e números para o teste.

Confirmar: `curl -s localhost:3000/status | python3 -m json.tool` deve mostrar
`chunks.live: true`.

### 3.5 Testar ponta a ponta
- `curl -s -X POST localhost:3000/replay` (ou o botão) e abrir
  `https://press2replay.com/replays/test-darlan-house/1`.
- Ver o preview e o download no telemóvel.
- Conferir o consumo do Pi com o stream real (`top`, `vcgencmd measure_temp`) e o tamanho
  do mp4 e o tempo de upload.

### 3.6 Depois
- Prova de carga de algumas horas (temperatura, RAM em `/run`, o edge recupera se a câmera
  ou a rede cair e voltar).
- Várias câmeras na mesma quadra (`cameras.json`, ver `edge-server/README.md`).

## Segredos
A senha da câmera e a `EDGE_API_KEY` ficam só no `edge.env` do Pi. Não os colar na
conversa nem em ficheiros do repositório.

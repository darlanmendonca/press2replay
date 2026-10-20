# Instalar o edge server num Raspberry Pi (cliente)

Guia passo a passo para pôr o edge a correr num Raspberry Pi 4 com Raspberry Pi OS
Lite 64-bit. Os passos 1 a 3 podem ser feitos antes de levar o Pi ao cliente; o
passo 8 (câmeras) é o único que depende do local.

Convenções: `<local>` é o nome do cliente (ex.: `arena-central`); o Pi chama-se
`p2r-edge-<local>`.

## O que fica instalado

| O quê | Onde |
| --- | --- |
| Código (clone só da pasta `edge-server`) | `/opt/press2replay/edge-server` |
| Configuração (segredos) | `/etc/press2replay/edge.env` e `cameras.json` |
| Chunks de vídeo (em RAM, não gasta o cartão) | `/run/press2replay/chunks` |
| Replays que falharam o upload | `/var/lib/press2replay/output` |
| Serviço | `press2replay.service` (arranca sozinho e reinicia se cair) |
| Atualização automática | `press2replay-update.timer` (git pull + rollback) |

## 1. Gravar o cartão

No Raspberry Pi Imager:

- **Device:** Raspberry Pi 4 · **OS:** Raspberry Pi OS Lite (64-bit)
- **Customisation:** hostname `p2r-edge-<local>`, utilizador e senha forte, fuso
  horário, **SSH ativo com senha**
- **Wi-Fi:** a rede onde estás a preparar o Pi (a do cliente é acrescentada no passo 3)

Prefere **SSD por USB** ou, no mínimo, um cartão *high endurance* para uso real.

## 2. Primeiro acesso e sistema

```bash
ssh <utilizador>@p2r-edge-<local>.local
sudo apt update && sudo apt full-upgrade -y
sudo apt install -y git curl ffmpeg
```

Confirma o fuso (o edge usa a hora nos replays) e que o relógio está certo:

```bash
timedatectl            # "Time zone" correto e "System clock synchronized: yes"
sudo timedatectl set-timezone Europe/Lisbon    # se for preciso
```

## 3. Wi-Fi do cliente (acrescentar, sem apagar a tua)

O Raspberry Pi OS usa NetworkManager, que guarda várias redes e liga-se à que
estiver ao alcance. Acrescenta a do cliente **sem a ativar**, para não perderes o SSH:

```bash
sudo nmcli connection add type wifi con-name cliente-<local> \
  ssid "NOME_DA_REDE" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "SENHA" \
  connection.autoconnect yes
# rede oculta: acrescenta  802-11-wireless.hidden yes
sudo raspi-config nonint do_wifi_country PT     # país do Wi-Fi (PT, BR, ...)
nmcli connection show                            # confirma que aparece
```

Se o Wi-Fi do cliente tiver portal de login ou isolamento entre dispositivos, o Pi e
a câmera podem não se ver: pergunta ao cliente antes. Para gravação contínua o
**cabo é bem mais estável**; usa-o se puderes.

## 4. Acesso remoto (Tailscale)

Dá ao Pi um IP privado estável, sem abrir portas no router do cliente:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh --hostname=p2r-edge-<local>
```

Abre o link que aparecer para autorizar o dispositivo. Depois consegues
`ssh <utilizador>@p2r-edge-<local>` de qualquer lado.

## 5. Node.js

O `package.json` exige Node >= 25, que não vem no apt do Debian:

```bash
curl -fsSL https://deb.nodesource.com/setup_25.x | sudo -E bash -
sudo apt install -y nodejs
node -v      # v25.x
```

## 6. Código

O repositório é privado, por isso o Pi usa uma **deploy key só de leitura**:

```bash
sudo useradd --system --create-home --home-dir /var/lib/press2replay --shell /usr/sbin/nologin press2replay
sudo -u press2replay mkdir -p -m 700 /var/lib/press2replay/.ssh
sudo -u press2replay ssh-keygen -t ed25519 -N "" -C "p2r-edge-<local>" -f /var/lib/press2replay/.ssh/id_ed25519
sudo cat /var/lib/press2replay/.ssh/id_ed25519.pub
```

No GitHub: repositório → **Settings → Deploy keys → Add deploy key**, cola a chave
e **não** marques "Allow write access". Depois, no Pi:

```bash
sudo mkdir -p /opt/press2replay && sudo chown press2replay: /opt/press2replay
sudo -u press2replay git clone --filter=blob:none --sparse \
  -c core.sshCommand="ssh -i /var/lib/press2replay/.ssh/id_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new" \
  git@github.com:darlanmendonca/press2replay.git /opt/press2replay
sudo -u press2replay git -C /opt/press2replay sparse-checkout set edge-server

cd /opt/press2replay/edge-server
sudo -u press2replay env HOME=/var/lib/press2replay npm ci
sudo -u press2replay env HOME=/var/lib/press2replay npm run build
```

## 7. Configuração

```bash
sudo mkdir -p /etc/press2replay
sudo nano /etc/press2replay/edge.env
```

```ini
PORT=3000
INGEST_MODE=external
CHUNKS_DIR=/run/press2replay/chunks
OUTPUT_DIR=/var/lib/press2replay/output

WEB_SERVER_URL=https://press2replay.vercel.app
VENUE_ID=<id do local no admin>
EDGE_API_KEY=<chave do edge, em /admin/places/<id>>

# Várias câmeras: usa o cameras.json (passo 8) e apaga as 3 linhas abaixo.
# Uma câmera só:
COURT_ID=1
SPORT=padel
INPUT_URL=rtsp://usuario:senha@IP_DA_CAMERA:554/stream1
```

As restantes variáveis estão documentadas em `.env.example`. Protege o ficheiro,
porque tem a chave do edge e as senhas das câmeras:

```bash
sudo chown root:press2replay /etc/press2replay/edge.env && sudo chmod 640 /etc/press2replay/edge.env
```

Os chunks ficam em `/run` (RAM): não desgastam o cartão, mas **perdem-se se o
serviço reiniciar**, o que significa perder o pré-roll de uns segundos. Com 90 s de
janela a RAM necessária é pequena, mas confirma com `df -h /run` se usares câmeras 4K.

## 8. Câmeras

1. Liga a câmera ao mesmo router do Pi (cabo, de preferência) e dá-lhe um **IP fixo**
   (reserva DHCP no router).
2. Na câmera, define o **I-frame interval (GOP) a 1–2 s**; sem isso o corte só
   acontece de N em N segundos (ver README).
3. Descobre o URL RTSP no manual (Reolink: `rtsp://user:pass@IP:554/h264Preview_01_main`,
   Tapo: `rtsp://user:pass@IP:554/stream1`) e testa-o antes de configurar:

```bash
ffprobe -rtsp_transport tcp "rtsp://usuario:senha@IP_DA_CAMERA:554/stream1"
```

Para várias câmeras ou quadras, cria o `cameras.json` (modelo em
`cameras.example.json`) e aponta para ele no `edge.env`:

```bash
sudo nano /etc/press2replay/cameras.json
sudo chown root:press2replay /etc/press2replay/cameras.json && sudo chmod 640 /etc/press2replay/cameras.json
echo 'CAMERAS_FILE=/etc/press2replay/cameras.json' | sudo tee -a /etc/press2replay/edge.env
```

## 9. Serviço (arranca no boot e reinicia se cair)

```bash
sudo tee /etc/systemd/system/press2replay.service >/dev/null <<'EOF'
[Unit]
Description=Press2Replay edge server
After=network-online.target
Wants=network-online.target

[Service]
User=press2replay
WorkingDirectory=/opt/press2replay/edge-server
EnvironmentFile=/etc/press2replay/edge.env
RuntimeDirectory=press2replay
StateDirectory=press2replay
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now press2replay
```

Logs que sobrevivem a reinícios (úteis para depurar à distância):

```bash
sudo mkdir -p /var/log/journal && sudo systemctl restart systemd-journald
```

## 10. Atualização automática (git pull + rollback)

O script puxa a `main`, só reinicia se a pasta `edge-server` mudou e **volta ao
commit anterior** se o novo não arrancar. Guarda o commit mau para não o repetir.

```bash
sudo tee /usr/local/sbin/p2r-update >/dev/null <<'EOF'
#!/usr/bin/env bash
set -uo pipefail
APP_DIR=/opt/press2replay
APP=$APP_DIR/edge-server
APP_USER=press2replay
APP_HOME=/var/lib/press2replay
BAD=$APP_HOME/bad-commit
PORT=$(sed -n 's/^PORT=//p' /etc/press2replay/edge.env | tail -1); PORT=${PORT:-3000}

as_app() { runuser -u "$APP_USER" -- env HOME="$APP_HOME" "$@"; }
log() { echo "[p2r-update] $*"; }

build_and_restart() { # $1 = 1 se o package-lock mudou
  cd "$APP" || return 1
  if [[ $1 == 1 ]]; then as_app npm ci --no-audit --no-fund || return 1; fi
  as_app npm run build || return 1
  systemctl restart press2replay
  local before after
  before=$(systemctl show -p NRestarts --value press2replay)
  sleep 20
  after=$(systemctl show -p NRestarts --value press2replay)
  [[ $before == "$after" ]] && systemctl is-active --quiet press2replay \
    && curl -fsS -m 3 "http://127.0.0.1:$PORT/health" >/dev/null
}

main() {
  local branch cur new deps=0
  branch=$(as_app git -C "$APP_DIR" symbolic-ref --short HEAD) || exit 1
  as_app git -C "$APP_DIR" fetch --quiet origin "$branch" || { log "sem rede, tento depois"; exit 0; }
  cur=$(as_app git -C "$APP_DIR" rev-parse HEAD)
  new=$(as_app git -C "$APP_DIR" rev-parse "origin/$branch")
  [[ $cur == "$new" ]] && exit 0
  [[ -f $BAD && $(cat "$BAD") == "$new" ]] && { log "${new:0:7} ja falhou antes, ignoro"; exit 0; }

  as_app git -C "$APP_DIR" merge --ff-only "origin/$branch" || { log "nao e fast-forward"; exit 1; }
  if as_app git -C "$APP_DIR" diff --quiet "$cur" "$new" -- edge-server; then
    log "${cur:0:7} -> ${new:0:7}: sem mudancas no edge, nao reinicio"; exit 0
  fi
  as_app git -C "$APP_DIR" diff --quiet "$cur" "$new" -- edge-server/package-lock.json || deps=1

  log "atualizando ${cur:0:7} -> ${new:0:7}"
  if build_and_restart "$deps"; then
    rm -f "$BAD"; log "ok, a correr ${new:0:7}"
  else
    log "FALHOU, rollback para ${cur:0:7}"
    echo "$new" > "$BAD"
    as_app git -C "$APP_DIR" reset --hard "$cur"
    build_and_restart "$deps" || log "o rollback tambem falhou, intervencao manual"
    exit 1
  fi
}
main  # tudo dentro de funcoes: o bash le o ficheiro inteiro antes de executar, entao um update do proprio script nao o corrompe
exit
EOF
sudo chmod +x /usr/local/sbin/p2r-update

sudo tee /etc/systemd/system/press2replay-update.service >/dev/null <<'EOF'
[Unit]
Description=Atualiza o edge Press2Replay (git pull + rollback)
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/p2r-update
EOF

sudo tee /etc/systemd/system/press2replay-update.timer >/dev/null <<'EOF'
[Unit]
Description=Verifica atualizacoes do edge Press2Replay

[Timer]
OnBootSec=3min
OnUnitActiveSec=10min
RandomizedDelaySec=60

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now press2replay-update.timer
```

Para forçar já uma atualização: `sudo /usr/local/sbin/p2r-update`. **Espera o prompt
voltar** (até ~45 s: compila e verifica o arranque 20 s). Se o interromperes com
`Ctrl+C` a meio, o código novo já foi puxado mas o rollback não corre, e as execuções
seguintes saem em silêncio por acharem que já está atualizado. Para repor:
`sudo -u press2replay git -C /opt/press2replay reset --hard <commit bom>`, `npm run build`
e `sudo systemctl restart press2replay`.

Testado: commit bom (compila, reinicia, `ok`), commit que compila mas não arranca
(`FALHOU`, volta ao anterior, edge continua de pé), o mesmo commit mau não é repetido, e
um commit sem mudanças em `edge-server/` não reinicia o serviço.

Para controlar **quando** atualiza (o reinício apaga a janela de chunks), troca
`OnUnitActiveSec=10min` por `OnCalendar=*-*-* 04:00:00` (4 h da manhã).

Para **congelar** um Pi numa versão, para o timer: `sudo systemctl disable --now press2replay-update.timer`.

## 11. Verificar

```bash
systemctl status press2replay                     # active (running)
curl -s localhost:3000/health                     # {"ok":true}
curl -s localhost:3000/status | python3 -m json.tool   # chunks.live = true por câmera
journalctl -u press2replay -f                     # logs ao vivo
journalctl -u press2replay-update                 # histórico das atualizações
sudo -u press2replay git -C /opt/press2replay rev-parse --short HEAD   # versão que está a correr (como press2replay, senão o git recusa: "dubious ownership")
vcgencmd measure_temp                             # temperatura do Pi
```

Teste de ponta a ponta: carrega no botão (ou `curl -X POST localhost:3000/replay`) e
confirma que o replay aparece em `<WEB_SERVER_URL>/replays/<VENUE_ID>/<COURT_ID>`.

## Preparar o Pi para o local do cliente

O Pi chega ao cliente já instalado (passos 1 a 11) e só precisa de se ligar à rede de lá.
O NetworkManager guarda várias redes e liga-se à que estiver ao alcance, por isso a tua
rede de casa pode ficar guardada sem atrapalhar.

### Antes de sair: acrescentar o Wi-Fi do cliente (recomendado)

Pede ao cliente o **nome (SSID) e a senha** da rede e acrescenta-a por SSH, **sem a
ativar** (ativar derrubava o SSH). É o comando do passo 3:

```bash
sudo nmcli connection add type wifi con-name cliente-<local> \
  ssid "NOME_DA_REDE" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "SENHA" \
  connection.autoconnect yes
sudo raspi-config nonint do_wifi_country PT
nmcli connection show        # confirma que a rede nova aparece na lista
```

No local, a tua rede de casa não está ao alcance e o Pi liga-se à do cliente sozinho.

### Já no cliente, se o Pi não se ligar: hotspot com o nome da tua rede de casa

Cria no telemóvel um **hotspot com o mesmo nome e a mesma senha do Wi-Fi da tua casa**. O
Pi reconhece-o como uma rede já guardada e liga-se. Entra por SSH (pelo IP que o telemóvel
mostrar, ou `p2r-edge-<local>.local`), acrescenta a rede do cliente com o comando acima e
reinicia (`sudo reboot`).

### Outras vias

- **Por cabo:** liga o Pi ao router do cliente e entra por SSH. É também a melhor ligação
  para a gravação contínua.
- **Tailscale:** se o Pi tiver internet por qualquer via, entras de qualquer lado
  (`ssh <utilizador>@p2r-edge-<local>`).

### Perguntar ao cliente antes

- A rede tem **portal de login** (página de aceitar termos) ou **isolamento entre
  dispositivos** (rede de convidados)? Nesses casos o Pi pode ficar sem internet, ou não
  ver a câmera. Usa a rede principal.
- A **câmera** vai na mesma rede que o Pi? Tem de ser.
- Se a senha do Wi-Fi mudar, o Pi fica offline. Deixa, se possível, uma segunda rede de
  reserva guardada e o Tailscale instalado para recuperares o acesso.

### Antes de ir: confirmar que o Pi sobrevive a um reinício

```bash
sudo reboot
# espera 1 a 2 minutos, volta a entrar e confirma:
systemctl is-active press2replay press2replay-update.timer tailscaled
curl -s localhost:3000/health
```

Depois de ligar, o edge precisa de ~30 a 60 s a gravar para ter um replay completo (os
chunks estão em RAM). Desliga sempre com `sudo shutdown now` e espera o LED verde parar, em
vez de tirar a ficha.

## Problemas comuns

| Sintoma | Causa provável |
| --- | --- |
| `chunks.live = false` | URL RTSP errado, câmera inacessível, ou GOP alto. Testa com `ffprobe` (passo 8). |
| Serviço em loop a reiniciar | `edge.env` ou `cameras.json` inválido: o erro está no `journalctl -u press2replay`. |
| `uploaded: false` | `WEB_SERVER_URL`, `EDGE_API_KEY` ou `VENUE_ID` errados, ou sem internet. O replay fica em `/var/lib/press2replay/output`. |
| Pi não aparece na rede | Wi-Fi do cliente não alcançado ou com isolamento; liga por cabo e vê o IP no router. |
| Update nunca corre | `systemctl list-timers`; `journalctl -u press2replay-update`. Confirma a deploy key (`sudo -u press2replay git -C /opt/press2replay fetch`). |
| Commit mau ficou "ignorado" | Corrige no repositório e faz push de um commit novo; o antigo só é ignorado enquanto for a ponta da branch. |

## Segurança

- `edge.env` e `cameras.json` têm segredos: ficam só no Pi, nunca no repositório.
- O edge escuta nas portas 3000 (API) e 1935 (RTMP) **na rede do cliente**; o
  `POST /replay` não tem autenticação. Não faças port-forward no router: usa o Tailscale.

# Configurar e operar o Pi (cola rápida)

Comandos para quando precisares de entrar no Raspberry e mudar algo. A instalação do zero
está no `INSTALL.md`. Nos exemplos o Pi chama-se `p2r-edge-test` e o utilizador é `darlan`;
troca pelo nome do Pi em que estás (`p2r-edge-<local>`).

## Ligar por SSH

```bash
ssh darlan@p2r-edge-test.local          # mesma rede que o Pi (Wi-Fi ou cabo)
ssh darlan@p2r-edge-test                # de qualquer lado, via Tailscale (Mac com Tailscale ligado)
ssh darlan@192.168.1.50                 # pelo IP, se o nome .local não resolver
```

Se o `.local` não responder: espera 2 minutos depois de ligar, confirma que o Mac está na
mesma rede, e procura o IP na lista de dispositivos do router (nome `p2r-edge-...`).
`ping p2r-edge-test.local` diz se o Pi está na rede.

Primeira vez num Pi com outra chave de host, o SSH avisa `REMOTE HOST IDENTIFICATION HAS
CHANGED` (acontece depois de regravar o cartão): `ssh-keygen -R p2r-edge-test.local` e
volta a tentar.

Ver o IP e a rede do Pi, já dentro dele:

```bash
hostname -I                              # IPs atuais
tailscale status                         # o Pi e os teus outros dispositivos
nmcli device status                      # wlan0 e eth0, ligados ou não
```

## Wi-Fi

O NetworkManager guarda várias redes e liga-se à que estiver ao alcance.

```bash
nmcli connection show                    # redes guardadas
nmcli device wifi list                   # redes ao alcance agora
```

**Acrescentar uma rede nova** (sem a ativar: ativar derruba o SSH se estiveres por Wi-Fi):

```bash
sudo nmcli connection add type wifi con-name cliente-<local> \
  ssid "NOME_DA_REDE" wifi-sec.key-mgmt wpa-psk wifi-sec.psk "SENHA" \
  connection.autoconnect yes
# rede oculta: acrescenta   802-11-wireless.hidden yes
sudo raspi-config nonint do_wifi_country PT     # país do Wi-Fi (PT, BR, ...)
```

**Mudar a senha de uma rede guardada**, apagar, ou escolher a preferida:

```bash
sudo nmcli connection modify cliente-<local> wifi-sec.psk "NOVA_SENHA"
sudo nmcli connection delete cliente-<local>
sudo nmcli connection modify cliente-<local> connection.autoconnect-priority 20   # maior = preferida
```

**Ligar já a uma rede** (se estiveres por SSH no Wi-Fi atual, a ligação cai):

```bash
sudo nmcli connection up cliente-<local>
```

Alternativa com menus: `sudo nmtui` → *Edit a connection*.

**Se o Pi ficou sem rede** (senha mudada, rede trocada):
- Cria no telemóvel um hotspot com o **nome e a senha de uma rede que o Pi já tem guardada**
  (por exemplo a da tua casa). O Pi liga-se, entras por SSH e corriges.
- Ou liga-o por cabo ao router.

## Serviço do edge

```bash
systemctl status press2replay --no-pager          # active (running)?
journalctl -u press2replay -f                     # logs ao vivo (Ctrl+C para sair)
journalctl -u press2replay -n 100 --no-pager      # últimas 100 linhas
sudo systemctl restart press2replay               # reiniciar (apaga a janela de chunks em RAM)
curl -s localhost:3000/health                     # {"ok":true}
curl -s localhost:3000/status | python3 -m json.tool   # câmeras, chunks, live: true/false
```

Disparar um replay de teste (como se carregassem no botão):

```bash
curl -s -X POST localhost:3000/replay             # uma câmera
curl -s -X POST localhost:3000/replay/1           # quadra 1 (todas as câmeras dela)
```

## Mudar a configuração do edge

A configuração está em `/etc/press2replay/edge.env` (e `cameras.json`, se houver várias
câmeras). Tem segredos (`EDGE_API_KEY`, senhas das câmeras): não os mostres nem os colas
em conversas.

```bash
sudo nano /etc/press2replay/edge.env              # editar (Ctrl+O grava, Ctrl+X sai)
sudo systemctl restart press2replay               # aplicar
```

Variáveis do dia a dia:

| Variável | Para quê |
| --- | --- |
| `INGEST_MODE` | `rtmp` (simulador/celular) ou `external` (câmera RTSP) |
| `INPUT_URL` | `rtsp://UTILIZADOR:SENHA@IP:554/stream1` (modo `external`, uma câmera) |
| `COURT_ID`, `SPORT` | quadra e esporte (`futsal`, `futebol`, `basket`, `padel`) |
| `WEB_SERVER_URL`, `VENUE_ID`, `EDGE_API_KEY` | destino do upload, local e chave (admin → local → chave do edge) |
| `CAMERAS_FILE` | caminho do `cameras.json`, para várias câmeras |

As restantes estão em `.env.example`. Senhas com `@ : / #` têm de ir codificadas em URL no
`INPUT_URL`; para testar, usa uma senha só com letras e números.

**Chave do edge perdida ou comprometida:** no admin do web-server, no local, *Gerar nova
chave* (a antiga deixa de funcionar na hora), e cola a nova no `edge.env`.

## Atualizações do código

O Pi puxa a branch `main` sozinho a cada 10 minutos e faz rollback se a versão nova não
arrancar.

```bash
sudo -u press2replay git -C /opt/press2replay rev-parse --short HEAD   # versão a correr
journalctl -u press2replay-update --no-pager -n 30                      # o que o update fez
systemctl list-timers press2replay-update.timer --no-pager              # próxima verificação
sudo /usr/local/sbin/p2r-update                                         # forçar já (ESPERA acabar, não uses Ctrl+C)
sudo systemctl disable --now press2replay-update.timer                  # congelar esta versão
sudo systemctl enable --now press2replay-update.timer                   # voltar a atualizar
```

Os comandos de `git` têm de ir como `sudo -u press2replay`, senão o git recusa
(*dubious ownership*). Se interromperes o `p2r-update` a meio, o Pi fica na versão nova
sem rollback: ver a secção 10 do `INSTALL.md` para repor.

## Estado do Pi

```bash
vcgencmd measure_temp                    # temperatura (abaixo de ~70 °C é saudável)
vcgencmd get_throttled                   # throttled=0x0 = tudo bem; outro valor = subtensão/sobreaquecimento
df -h / /run                             # espaço no cartão e na RAM dos chunks
free -h                                  # memória
uptime                                   # há quanto tempo está ligado, carga
ls -la /var/lib/press2replay/output/*/*  # replays que falharam o upload (ficam aqui)
timedatectl                              # fuso e "System clock synchronized: yes"
```

## Desligar e reiniciar

```bash
sudo shutdown now                        # desligar: espera o LED verde parar antes de tirar a ficha
sudo reboot                              # reiniciar (volta em 1 a 2 minutos)
```

Depois de ligar, o edge precisa de ~30 a 60 s a gravar para ter um replay completo.

## Sistema e acessos

```bash
passwd                                              # mudar a senha do teu utilizador
sudo apt update && sudo apt full-upgrade -y         # atualizar o sistema (reinicia o Pi se pedir)
sudo timedatectl set-timezone Europe/Lisbon         # mudar o fuso
sudo hostnamectl set-hostname p2r-edge-<local>      # mudar o nome; acerta também a linha 127.0.1.1 em /etc/hosts
sudo tailscale up --ssh --hostname=p2r-edge-<local> # voltar a registar no Tailscale (depois de mudar o nome)
```

Passar de senha a chave SSH (no **Mac**), se um dia quiseres:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub darlan@p2r-edge-test.local
```

Depois confirma que entras sem senha, e só então desativa a senha no Pi
(`PasswordAuthentication no` num ficheiro em `/etc/ssh/sshd_config.d/` e
`sudo systemctl restart ssh`). Guarda a chave privada num sítio seguro: sem ela e sem
Tailscale, só entras com teclado e ecrã ou regravando o cartão.

## Quando algo falha

| Sintoma | O que ver |
| --- | --- |
| `/status` com `chunks.live: false` | URL RTSP errado, câmera inacessível ou sem H.264. `ffprobe -rtsp_transport tcp "<INPUT_URL>"` no Pi. |
| Serviço a reiniciar em ciclo | `journalctl -u press2replay -n 50`: normalmente `edge.env` ou `cameras.json` inválido. |
| Replay com `uploaded: false` | `WEB_SERVER_URL`, `VENUE_ID`, `EDGE_API_KEY` ou internet. O vídeo fica em `/var/lib/press2replay/output`. |
| Pi não responde na rede | Está ligado (LED vermelho)? Wi-Fi do local mudou? Hotspot com a rede conhecida, ou cabo. |
| Hora errada | `timedatectl`: sem internet no arranque o relógio pode estar desfasado até sincronizar. |

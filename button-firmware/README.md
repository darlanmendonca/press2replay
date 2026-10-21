# Botão de replay (ESP32)

Firmware do botão da quadra. Ao premir, faz `POST http://<edge>:3000/replay/<quadra>`,
que é o mesmo pedido do `sim:button` do edge. Instalar e configurar num cliente:
`CLIENT_SETUP.md`.

## Hardware

- ESP32 devkit (testado com ESP32-WROOM, micro-USB), alimentado por USB 5 V.
- Botão de mola ligado entre o **GPIO 4** e o **GND** (o pull-up é interno, não precisa de
  resistência). O contacto do botão actual é **NC** (bloco Tracon NYAE-102, parafusos `1` e `2`).
  Com um bloco **NO** (NYAE-101), trocar `PRESSED_LEVEL` para `LOW` em `src/main.cpp`.
- O LED azul da placa (GPIO 2) dá o feedback.

## Compilar e enviar

Precisa do [PlatformIO](https://platformio.org) (`brew install platformio`).

```bash
cd button-firmware
pio run                                              # compila
pio run -t upload --upload-port /dev/cu.usbserial-*  # envia (ver a porta com: ls /dev/cu.*)
```

A placa tem de estar ligada por um cabo USB **de dados**. Não há nada para configurar no código:
Wi-Fi, endereço do edge e quadra são preenchidos pelo portal e ficam na flash do ESP32.

## Como funciona

- `src/main.cpp`: leitura do botão (debounce 30 ms, ignora o ruído dos primeiros 0,5 s depois
  de ligar, intervalo mínimo de 8 s entre disparos) e o pedido ao edge.
- `src/config.*`: configuração guardada na flash (`Preferences`).
- `src/portal.*`: portal cativo (Wi-Fi próprio `P2R-Botao-XXXX`, DNS e página em `192.168.4.1`).
- O endereço do edge pode ser um IP ou um nome `.local` (resolvido por mDNS), com porta opcional.

## Ver o que a placa diz

```bash
pio device monitor --baud 115200      # Ctrl+C para sair
```

Mensagens: `PREMIDO: a pedir replay`, `replay: POST <url> -> <código>`, `wifi: ligado, IP ...`.

## Limitações conhecidas

- Só liga a Wi-Fi de **2,4 GHz**.
- O edge só responde ao fim de uns segundos (espera o pós-roll e faz o upload), e o botão
  espera pela resposta, por isso não aceita outro toque nesse tempo.
- O `POST /replay` do edge não tem autenticação; antes de ter botões em clientes convém um
  token partilhado.
- Contacto NC: um fio solto lê-se como "premido" (o intervalo mínimo limita o estrago).
  Para a versão final, usar um bloco NO.

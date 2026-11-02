# Inventário de hardware — Press2Replay

Lista dos artigos do projeto (por quadra/local), agrupada em **Câmera**, **Servidor local (edge server)** e **Botão**. Gerada a partir dos docs do repo (`README.md`, `CAMERA_TEST.md`, `edge-server/INSTALL.md`, `button-firmware/*`, `edge-server/IMPROVEMENTS.md`) e de pesquisa de preços em 2026-11-02, priorizando a [Mauser.pt](https://mauser.pt).

**Legenda do preço**
- ✅ confirmado na página da loja
- ⚠️ visto só em resultado de pesquisa (a loja bloqueou a leitura ou o preço é de outro país), confirmar antes de comprar
- ❓ não encontrei preço/link, é preciso pesquisar

Preços em € com IVA. "Obrigatório" = necessário para o sistema funcionar; "Opcional" = recomendado ou futuro.

**Seleção:** ⭐ = **escolha atual recomendada** (o que está pré-selecionado para comprar). "Alternativa" = opção considerada, não selecionada por agora.

## Lista completa de itens (opção mais barata de cada)

Por local, com 1 câmera, 1 switch, 1 Raspberry Pi e 1 botão. Cada item mostra a opção mais barata entre as listadas neste documento, que não é necessariamente a escolha atual recomendada.

| Grupo | Item | Opção mais barata | Preço |
| --- | --- | --- | --- |
| Câmera | Câmera IP domo | TP-Link VIGI C250 2.8 mm (Mauser) | 79,90 € |
| Câmera | Cabo de rede câmera → switch | Cat6 U/UTP cobre exterior, 15 m (Mauser) | 15,65 € |
| Câmera | Switch PoE | Mercusys MS105GP, 4 PoE (Mauser) | 30,70 € |
| Câmera | Suporte/fixação | — | sem preço |
| Servidor local | Computador | Raspberry Pi 4 Model B 2 GB (Mauser) | 76,24 € |
| Servidor local | Cartão de memória | SanDisk High Endurance 32 GB (Amazon.es) | 20,82 € |
| Servidor local | Fonte de alimentação | Oficial Raspberry Pi USB-C (Mauser) | 7,59 € |
| Servidor local | Caixa | Joy-it alumínio para Pi 4 (Mauser) | 9,35 € |
| Botão | Microcontrolador | Seeed XIAO ESP32-S3 (Mauser) | 9,20 € |
| Botão | Botão com caixa | Tracon NYGBC42PT (Adajusa) | 7,04 € |
| Botão | Carregador USB | Goobay 44949, 5 W (Mauser) | 4,26 € |
| Botão | Cabo USB | Raspberry Pi oficial USB-A → micro-USB, 1 m (Mauser) | 1,71 € |
| Botão | Fios/terminais | — | sem preço |
| Botão | Passa-fios | — | sem preço |
| | **Total (itens com preço)** | | **262,46 €** |

O total não inclui o suporte da câmera, os fios e o passa-fios, que ainda não têm preço. Para a escolha atual recomendada, ver o resumo no fim. Atenção: o XIAO ESP32-S3 usa USB-C, e o cabo listado é micro-USB, então esse par só combina se a placa escolhida for micro-USB.

---

## 1. Câmera

| Artigo | Modelo | Preço unit. | Link de compra | Descritivo | |
| --- | --- | --- | --- | --- | --- |
| Câmera IP domo | TP-Link **VIGI C250 (2.8 mm)** | ✅ 79,90 € <br>_(02/11/2026)_ | [**Mauser**](https://mauser.pt/013-1672/tp-link-vigi-c250-camara-de-vigilancia-ip-ethernet-c-poe-dome-5mpx-2-8mm-full-color-ik10-ip67) | Domo 5 MP de exterior, 2880×1620, só cabo (sem Wi-Fi), Ethernet 10/100, PoE (802.3af/at, máx. 8 W) ou 12 V DC, ONVIF, H.265+/H.264, bitrate máx. 6 Mbps. Usada em RTSP (`stream1`). Configurar GOP de 1–2 s. Lente grande-angular (109° horizontal), adequada para meio campo de futebol (2 por campo) ou a quadra de padel (1 ao fundo). | Obrigatório |
| Cabo de rede (câmera → switch) | Cat6 U/UTP **cobre (CU)**, exterior, preto (PE com proteção UV), AWG24 sólido | ✅ 15 m: 15,65 € · outros comprimentos: preço não lido <br>_(02/11/2026)_ | [15 m](https://mauser.pt/015-0893/cabo-de-rede-rj45-cat6-u-utp-cu-15m-de-exterior-preto) · [20 m](https://mauser.pt/015-0894/cabo-de-rede-rj45-cat6-u-utp-cu-20m-de-exterior-preto) · [30 m](https://mauser.pt/catalog/product_info.php?products_id=015-0895) (indisponível nos resultados) · [50 m](https://mauser.pt/catalog/product_info.php?products_id=015-0897) · [75 m](https://mauser.pt/015-0899/cabo-de-rede-rj45-cat6-u-utp-cu-75m-de-exterior-preto) | Liga câmera → switch PoE → router. Escolher o comprimento conforme a distância real de cada câmera. **Evitar as versões CCA** (alumínio revestido de cobre) da mesma série, que são mais baratas mas pioram o PoE. Sem blindagem (U/UTP). Alternativa blindada em cobre: [rolo 305 m Cat6 F/UTP unifilar](https://mauser.pt/015-0182/cabo-cat6-f-utp-unifilar-cu-awg23-para-exterior-rolo-305m-preto), que exige crimpar as fichas RJ45. | Obrigatório |
| Suporte/fixação | Poste, parede ou trave (conforme o local) | ❓ <br>_(02/11/2026)_ | — | A câmera traz só parafusos. Altura e ângulo dependem da quadra. | Opcional |


### Switch PoE (a quantidade depende do total de câmeras)

Alimenta as câmeras pelo mesmo cabo de rede e as liga ao router (substitui o injetor PoE). O switch também evita ocupar ou lotar as portas do router do cliente: basta **1 porta do router** para ligar o primeiro switch, e as câmeras ficam todas no switch. Se forem precisos mais switches, podem ser **encadeados** a partir do primeiro. Cada VIGI C250 consome no máximo 8 W; a voltagem PoE é fixa, o que limita é a potência total do switch e o número de portas PoE. Cada switch tem uma porta **sem PoE** para ligar ao router, então as portas PoE são todas para câmeras.

| Artigo | Modelo | Preço unit. | Link de compra | Descritivo | |
| --- | --- | --- | --- | --- | --- |
| ⭐ Switch PoE — **escolha atual recomendada** | Mercusys **MS108GP** (8 portas Gigabit, **7 com PoE+**, 65 W) | ✅ 37,15 € <br>_(02/11/2026)_ | [**Mauser**](https://mauser.pt/catalog/product_info.php?products_id=047-4880) | Cobre até 7 câmeras (7 × 8 W = 56 W, dentro dos 65 W). Serve vários campos/quadras no mesmo local e dá folga se o local crescer. Usa só 1 porta do router do cliente e permite encadear mais switches. | Obrigatório |
| Switch PoE (alternativa menor) | Mercusys MS105GP (5 portas Gigabit, 4 com PoE, 65 W) | ✅ 30,70 € <br>_(02/11/2026)_ | [Mauser](https://mauser.pt/047-4102/mercusys-ms105gp-switch-5p-4poe-gigabit-10-100-1000mbps-65w) | Até 4 câmeras (32 W). Mais barato, mas sem folga: com 5 câmeras já não serve. | Alternativa |

**Quantos switches comprar (com o MS108GP, 7 câmeras por switch)**

| Câmeras no local | Exemplo | Switches |
| --- | --- | --- |
| 1 a 7 | 1 quadra de padel; 1 a 3 campos de futebol (2 a 6 câmeras) | **1 × MS108GP** |
| 8 a 14 | 4 a 7 campos de futebol | 2 × MS108GP |
| 15 a 21 | 8 a 10 campos | 3 × MS108GP |

- Regra: **nº de switches = câmeras ÷ 7, arredondado para cima**.
- Cada switch extra liga ao router por uma porta sem PoE. Se o router não tiver portas livres, liga-se em cascata ao primeiro switch, gastando uma das portas dele, e o limite do conjunto cai uma câmera por switch extra.
- Se as câmeras de um campo estiverem longe do restante, um switch junto a elas encurta os cabos (cada switch precisa de tomada elétrica).
- Alternativa sem switch: adaptador 12 V DC ≥ 1 A por câmera (ficha 5,5×2,1 mm, positivo ao centro).
- O router de teste não tem PoE.

---

## 2. Servidor local (edge server)

Alvo documentado: **Raspberry Pi 4 Model B**, Raspberry Pi OS Lite 64-bit, chunks em RAM (tmpfs).

| Artigo | Modelo | Preço unit. | Link de compra | Descritivo | |
| --- | --- | --- | --- | --- | --- |
| Computador | **Raspberry Pi 4 Model B 4 GB** | ✅ **110,92 €** (4 GB) · ✅ 76,24 € (2 GB) <br>_(02/11/2026)_ | [**Mauser 4 GB**](https://mauser.pt/096-7402/raspberry-pi-sc0194-9-microcomputador-raspberry-pi-4-model-b-4gb) · [Mauser 2 GB](https://mauser.pt/catalog/product_info.php?products_id=096-7401) | Corre o `edge-server` (Node + ffmpeg): recebe RTSP, grava chunks de ~1 s, corta o replay e faz upload. Os docs não fixam a RAM; a janela em tmpfs usa ~120 MB (1080p) a ~375 MB (4K), então 2 GB deve bastar, 4 GB dá folga. | Obrigatório |
| Cartão de memória | SanDisk **High Endurance** microSDHC 32 GB, ref. SDSQQNR-032G-GN6IA (Class 10, U3, V30, leitura 100 MB/s, escrita 40 MB/s) | ✅ 41,75 € (Mauser) <br>✅ 20,82 € (Amazon.es) <br>_(02/11/2026)_ | [**Mauser**](https://mauser.pt/047-4347/sandisk-sdsqqnr-032g-gn6ia-cartao-de-memoria-microsdhc-32gb-classe-10-uhs-i-v30-high-endurance) <br>[Amazon.es](https://www.amazon.es/dp/B07P14QHB7) | Sistema operativo. Linha *High Endurance*, feita para gravação contínua e que aguenta melhor escritas e cortes de energia; vem com adaptador SD. 32 GB bastam para o sistema (os chunks ficam em RAM). | Obrigatório |
| Fonte de alimentação | Oficial Raspberry Pi USB-C 5,1 V / 3 A (15,3 W, preta) | ✅ 7,59 € <br>_(02/11/2026)_ | [Mauser 035-3401](https://mauser.pt/catalog/product_info.php?products_id=035-3401) | Fonte fraca causa instabilidade e quedas de tensão. | Obrigatório |
| Caixa (case) | Joy-it, caixa para Raspberry Pi 4 em alumínio, preta | ✅ 9,35 € <br>_(02/11/2026)_ | [**Mauser 096-7581**](https://mauser.pt/096-7581/joy-it-caixa-para-raspberry-pi-4-em-aluminio-preto) | Protege o Pi e ajuda na temperatura (o decode de vídeo a 5 MP é pesado). | Recomendado |

---

## 3. Botão

Botão da quadra: ESP32 numa caixa, dispara `POST http://<edge>:3000/replay/<quadra>`.

| Artigo | Modelo | Preço unit. | Link de compra | Descritivo | |
| --- | --- | --- | --- | --- | --- |
| Microcontrolador (a escolher um) | **A.** Joy-it **NodeMCU ESP32** (SBC-NodeMCU-ESP32-C, USB-C) <br>**B.** Seeed Studio **XIAO ESP32-S3** (ref. 113991114, USB-C) <br>**C.** **ESP32-S3 SuperMini** | A: ✅ 11,55 € <br>B: ✅ 9,20 € <br>C: ✅ 9,90 € <br>_(02/11/2026)_ | [**A. Mauser 095-4900**](https://mauser.pt/095-4900/joy-it-sbc-nodemcu-esp32-c-modulo-nodemcu-esp32-wifi-bluetooth-sram-usb-c) <br>[**B. Mauser 095-3430**](https://mauser.pt/095-3430/seeed-113991114-microcontrolador-seeed-studio-xiao-esp32-s3-c-wi-fi-e-bt-arduino-e-micropython) <br>[**C. Mauser 095-8560**](https://mauser.pt/095-8560/esp32-s3-supermini-placa-de-desenvolvimento-com-esp32) | Todas têm Wi-Fi **só 2,4 GHz** (serve o portal cativo `P2R-Botao-XXXX`) e USB-C. **A (maior):** ESP32 clássico (LX6, dual-core 240 MHz, 4 MB flash, 21 GPIO, 54×29×13 mm), o mesmo tipo de chip do DevKit para o qual o firmware foi escrito, por isso é a que menos exige mudar (confirmar o LED e o GPIO 4 no pinout). Muito stock na Mauser (~109 un. online). **B (pequena):** ESP32-S3, cabe numa caixa compacta. **Stock na Mauser: apenas 1 unidade.** **C (pequena):** ESP32-S3 com 4 MB flash e 13 GPIO, vem com 2 réguas de pinos **por soldar**; antena cerâmica pior com metal por baixo (cuidado com a caixa) e só USB nativo, sem ponte UART. Stock em várias lojas (26 em Freixeira). **B e C (ESP32-S3) exigem ajustar o firmware:** placa do PlatformIO (`esp32dev` → `seeed_xiao_esp32s3` ou equivalente), `BUTTON_PIN` (hoje GPIO 4) e `LED_PIN` (hoje GPIO 2, o LED azul do devkit) conforme o pinout, e a rotulagem dos fios no `CLIENT_SETUP.md` (D4/GND). Os pinos são pequenos, então os fios do botão provavelmente precisam de soldadura ou terminais. | Obrigatório |
| Botão com caixa (completo) | Tracon **NYGBC42PT**, caixa com botão cogumelo vermelho Ø40, série NYG (EAN 8445340221746) | ✅ 7,04 € <br>_(02/11/2026)_ | [**Adajusa**](https://adajusa.pt/pt/caixas-de-botao-com-controles-ja-instalados/22174-caixa-com-botao-de-parada-cogumelo-completo-o40-serie-nyg-8445340221746.html) | Já traz o botão e a caixa montados: botão de metal vermelho tipo cogumelo, sem encravamento, com 1 contacto **NC** (o mesmo tipo do NYAE-102 em uso), em caixa de plástico cinza. **Proteção IP44**, menos que o IP65 previsto para exterior: protege de salpicos, não de chuva direta nem de jatos, por isso instalar abrigado ou rever a caixa. Substitui as linhas separadas de botão de 22 mm e caixa estanque. | Obrigatório |
| Carregador USB | Goobay 44949, 1 porta USB-A, 5 W (5 V), preto | ✅ 4,26 € <br>_(02/11/2026)_ | [**Mauser 035-5149**](https://mauser.pt/035-5149/goobay-44949-carregador-1-usb-a-5w-preto) | Alimentação junto ao botão. 5 W bastam para o microcontrolador. Não ligar o ESP32 a mais de 5 V. | Obrigatório |
| Cabo USB | Raspberry Pi oficial SC0732, USB-A → **micro-USB**, preto, **1 m de comprimento** | ✅ 1,71 € <br>_(02/11/2026)_ | [**Mauser 047-4875**](https://mauser.pt/047-4875/raspberry-pi-sc0732-cabo-raspberry-pi-oficial-usb-a-micro-usb-preto-1m) | **Comprimento: 1 m.** Liga o carregador ao microcontrolador (alimentação e programação). **Atenção:** as três placas listadas acima usam USB-C, então este cabo só serve se a placa escolhida for micro-USB (por exemplo, o ESP32 DevKit clássico ou o Joy-it NodeMCU ESP32 de micro-USB). | Obrigatório |
| Passa-fios | Prensa-cabos (cable gland) | ❓ <br>_(02/11/2026)_ | — | Entrada do cabo USB na caixa. | Obrigatório (exterior) |
| Fios/terminais | Dois fios do botão ao ESP32 | ❓ <br>_(02/11/2026)_ | — | Ligação aos dois parafusos do contacto do botão. | Obrigatório |

---

## Resumo (preços da Mauser, todos ⚠️ a confirmar na página)

| Item | Preço (02/11/2026) |
| --- | --- |
| Raspberry Pi 4 Model B 4 GB ✅ | 110,92 € |
| SanDisk High Endurance 32 GB ✅ | 41,75 € |
| Fonte oficial Raspberry Pi USB-C ✅ | 7,59 € |
| Caixa Joy-it para Raspberry Pi 4 ✅ | 9,35 € |
| VIGI C250 2.8 mm ✅ | 79,90 € |
| ⭐ Switch PoE Mercusys MS108GP (7 PoE) ✅ | 37,15 € |
| Microcontrolador do botão ✅ (um dos 3) | 9,20–11,55 € |
| Botão com caixa Tracon NYGBC42PT ✅ | 7,04 € |
| Carregador USB Goobay 5 W ✅ | 4,26 € |
| Cabo USB-A → micro-USB 1 m ✅ | 1,71 € |
| **Subtotal parcial (por local: 1 câmera, 1 switch, 1 botão)** | **~309–311 €** |

Os preços da Mauser variam entre páginas da própria loja (listagem vs. ficha do produto), por isso confirma o valor no carrinho. O subtotal não inclui os itens ❓ (cabos, passa-fios).

## Pendências

1. Confirmar a RAM do Pi (2 GB por 76,24 € ou 4 GB por 110,92 € na Mauser).
2. Pesquisar os itens ❓ (cabos, suporte da câmera).
3. Fechar o total de câmeras por local para decidir quantos switches comprar (ver tabela do switch).

# Logo do clube nos replays: análise e opções

Estado: **em exploração, nada decidido nem implementado.** Escrito a 2026-11-02, depois de uma
conversa de análise. Serve para retomar o assunto mais tarde.

**Objetivo:** os replays descarregados e partilhados levarem o logo (ou o nome) do clube, para
cumprir a promessa do hotsite de "marketing em cada vídeo".

## 1. Restrições do sistema (confirmadas no código)

- O corte é `-c copy`: junta os chunks sem reencodar, quase sem CPU (`edge-server/src/services/replayBuilder.ts`).
  Pôr um logo no vídeo obriga a **reencodar**, o que quebra isto.
- Um aperto do botão gera um replay **por câmara da quadra**, em paralelo, com os segmenters
  ao vivo no mesmo Raspberry Pi 4. O spritesheet já decodifica cada vídeo.
- O `/replay` **espera pelo corte e pelo upload** antes de responder (`edge-server/src/routes/replay.ts`).
- O botão tem `HTTP_TIMEOUT_MS = 25000` (`button-firmware/src/main.cpp`), contando com 5 s de pós-roll.
  Um reencode feito dentro do pedido arrisca timeout e replays duplicados por retry.
  **Qualquer solução tem de aplicar o logo depois de responder ao botão.**
- O upload vai direto para o Vercel Blob (store privado). O web-server corre na **Vercel Hobby**,
  onde correr ffmpeg em 60–90 s de 1080p não é viável (confirmar os limites atuais na documentação).
- O README do edge ainda deixa em aberto se o Pi tem encoder H.264 por hardware (`edge-server/README.md`, ~linha 391).
- Um edge por place e uma chave por place: **um logo por edge**.

## 2. Opções

### Descartada: overlay no leitor (CSS)
Não sobrevive ao descarregar nem ao partilhar nas redes, que é o objetivo. Fora.

### A. Reencode no edge, em segundo plano
Depois do corte `-c copy`, um segundo passo com o filtro `overlay` do ffmpeg.

- **A favor:** sem infraestrutura nova; falha segura (se falhar ou demorar, sobe o vídeo sem logo,
  como já acontece com o spritesheet); um logo por edge encaixa no modelo atual.
- **Contra:** CPU do Pi 4, sobretudo com várias câmaras e botões em simultâneo; depende do encoder
  por hardware (`h264_v4l2m2m`), que pelo que sei só vai até 1080p e **não existe no Pi 5** (a confirmar).
  Com câmaras 4K ou um Pi 5, cai em x264 por software, que muito provavelmente não aguenta.
- **Ideia a explorar:** um único ffmpeg com `split` que produza o MP4 com logo e o spritesheet,
  evitando decodificar duas vezes. Correr com `nice` para não prejudicar os segmenters.
- Comando de partida (a medir no Pi, não validado):
  ```bash
  ffmpeg -i replay.mp4 -i logo.png \
    -filter_complex "[1:v]scale=-1:ih*0.08[l];[0:v][l]overlay=W-w-24:24" \
    -c:v libx264 -preset veryfast -crf 23 -c:a copy -movflags +faststart saida.mp4
  ```
  Nota: para o logo acompanhar a resolução real do vídeo é preciso `scale2ref` (ou calcular o tamanho antes);
  o exemplo está simplificado.

### B. Worker na cloud
O edge sobe o original e um worker (contentor próprio, ou serviço gerido como Mux, Cloudflare Stream
ou MediaConvert) aplica o logo.

- **A favor:** não gasta CPU no Pi; funciona com 4K e Pi 5; mudar o logo é central e fácil.
- **Contra:** a opção com mais infraestrutura nova: worker, fila, custo por replay, egress do Blob,
  e um estado "a processar" (ou registar o replay só depois de existir o ficheiro com logo, o que
  muda o fluxo de `/api/edge/replays`).

### C. Logo/texto no OSD da própria câmara
Não custa CPU nem código; o overlay entra antes do encoder e aparece no vivo e nos replays.

- **VIGI C250 (a câmara de teste):** o OSD só tem **texto**: data, dia da semana, nome do canal e
  dois campos livres (Custom 1 e 2), mais efeito, tamanho e cor de fonte. Os separadores de Display são
  Image, OSD e Privacy Mask. **Não há overlay de imagem/logo.**
- **Uso prático já hoje:** pôr o nome do clube num campo Custom, desligar a data e o nome do canal.
  Falta confirmar se os acentos saem bem no vídeo.
- **Limites:** é texto, não o símbolo; configuração manual por câmara e por local; aparece também
  no vivo e em todos os fluxos, sem versão sem ele.

### D. Trocar de câmara por uma com overlay de imagem
Pesquisa feita (fóruns, a tomar como pista, não como garantia; depende do modelo e do firmware):

| Marca | O que encontrei | Limites |
|---|---|---|
| Dahua | "Picture overlay" na interface web | BMP de 256 cores, até 16 KiB e 128×128 px: logos pequenos e simples |
| Axis | O mais flexível: BMP de 24 bits, API (VAPIX) para automatizar | Gama profissional, preço bem acima da VIGI (não verifiquei) |
| Hikvision | Dados contraditórios (alguns só veem texto) | Depende do modelo exato |
| Uniview, modelos baratos | Nada encontrado | Ver o manual de cada modelo |

Para referência, a VIGI C250 (5MP) custa cerca de **60–86 €** com IVA em retalhistas europeus (preços
recolhidos a 2026-11-02, a confirmar em Portugal). Trocar de marca obrigaria a rever RTSP, GOP/keyframe
e o resto da checklist de compra do `edge-server/README.md`.

## 3. Comparação

| | A. Edge | B. Cloud | C. OSD da câmara | D. Câmara com overlay |
|---|---|---|---|---|
| CPU no Pi | Alto | Nenhum | Nenhum | Nenhum |
| Infraestrutura nova | Pouca | Muita | Nenhuma | Nenhuma |
| Latência até ao jogador | Sobe (assíncrono) | Sobe (fila) | Zero | Zero |
| 4K / Pi 5 | Arriscado | Sem problema | Sem problema | Sem problema |
| Qualidade do logo | Total (PNG) | Total | Só texto (VIGI C250) | Baixa (Dahua) a alta (Axis) |
| Mudar o logo | Por edge, via admin | Central | Manual, por câmara | Manual, por câmara |
| Se falhar | Sobe sem logo | Fica "a processar" | n/a | n/a |

## 4. Direção sugerida (a validar, não decidida)

1. **C já**, se o nome do clube em texto chegar: zero custo e zero código.
2. **A** se o benchmark no Pi real passar.
3. **B** só se o benchmark falhar, ou se o hardware passar a 4K ou Pi 5.
4. **D** só se se quiser mesmo o logo gráfico na câmara e se aceitar trocar de marca.

## 5. Benchmark a fazer no Pi 4 real

Não vale testar no Mac ou em Docker: não diz nada sobre o Pi. Com chunks de 1080p a ~8 Mbps:

1. `ffmpeg -encoders | grep v4l2m2m` para ver se o encoder por hardware existe.
2. Medir o tempo de parede do `overlay` mais encoder por hardware em clipes de **60 s** e **90 s**,
   e comparar com `libx264 ultrafast`.
3. Repetir com **2–3 overlays em simultâneo** e os segmenters ao vivo; procurar falhas nas playlists
   HLS e no `/status`.
4. Critério de decisão: a **latência extra que se aceita** entre o aperto do botão e o replay
   disponível. Esse número tem de vir de quem decide.

## 6. O que A e B partilham

- Upload do logo por place no admin: Blob mais uma coluna `logoPathname` em `venue`, com migração.
- Em A, o edge obtém o logo por um endpoint autenticado com a chave do edge e guarda-o em cache (ETag).
- Posição e tamanho relativos à altura do vídeo, para serem consistentes entre 1080p e 4K.

## 7. Contexto da câmara de teste

- Câmara: **VIGI C250** (TP-Link), na rede de casa a `192.168.1.199` no teste (o IP deve ficar fixo por
  reserva DHCP no router). Interface web em HTTPS (certificado autoassinado); RTSP na porta 554.
- Para configurar à distância: o Pi já tem Tailscale (`edge-server/INSTALL.md`, secção 4). Opções:
  túnel SSH (`ssh -L 8443:IP_DA_CAMARA:443 pi@p2r-edge-<local>`) ou rota de sub-rede só para a câmara
  (`--advertise-routes=IP_DA_CAMARA/32`, aprovada na consola do Tailscale). Não abrir portas no router.
- A associação a uma conta TP-Link (app VIGI / VIGI Cloud VMS) também dá acesso remoto, mas passa a
  gestão por um terceiro; convém ponderar isso face à promessa de privacidade do hotsite.

## 8. Perguntas em aberto

1. Só o logo do clube, ou também uma marca Press2Replay?
2. Que latência extra é aceitável entre o botão e o replay?
3. Que resolução terão as câmaras reais (1080p ou 4K)?
4. O nome do clube em texto chega, ou o símbolo é mesmo obrigatório?
5. O logo muda por place ou por quadra?

## 9. Próximos passos possíveis

- [ ] Configurar o texto do clube no OSD da VIGI C250 e confirmar acentos, tamanho e posição.
- [ ] Preparar e correr o benchmark no Pi (secção 5).
- [ ] Protótipo do passo de overlay no `replayBuilder.ts`, com falha segura (subir sem logo).
- [ ] Decidir onde guardar o logo (coluna `logoPathname` em `venue` e página no admin).
- [ ] Acrescentar à checklist de compra de câmara: "overlay de imagem/logo no OSD" e "texto livre no OSD".

## Fontes

- [VIGI Security Manager User Guide](https://www.tp-link.com/us/user-guides/vigi-security-manager/chapter-7-configure-your-cameras-and-nvrs.html)
- [VIGI Cloud VMS FAQ](https://www.tp-link.com/ph/support/faq/4176/)
- [Dahua Camera Picture Overlay](https://ipcamtalk.com/threads/dahua-camera-picture-overlay.51498/)
- [Dahua add big watermark logo to camera](https://ipcamtalk.com/threads/dahua-add-big-watermark-logo-to-camera.59998/)
- [Add Watermark to Axis Camera](https://support.ipconfigure.com/hc/en-us/articles/205696965-Add-Watermark-to-Axis-Camera)
- [Axis Overlay API](https://developer.axis.com/vapix/network-video/overlay-api/)
- [Hikvision PTZ cameras offer Image overlay?](https://ipcamtalk.com/threads/hikvision-ptz-cameras-offer-image-overlay.78330/)
- [VIGI C250 na Alza](https://www.alza.de/tp-link-vigi-c2504mm-levne-d12346438.htm)

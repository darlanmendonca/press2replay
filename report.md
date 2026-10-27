# Relatório: tempo entre o clique e o replay na página

Primeiro teste de ponta a ponta com a câmera real (TP-Link VIGI C250), em 2026-10-27.
Este documento regista o que foi **medido**, o que é **hipótese** e as melhorias
planeadas (ainda **não implementadas**).

## Cenário do teste

| Item | Valor |
| --- | --- |
| Edge | Raspberry Pi 4, ligado por **Wi-Fi** (rede `NOS-E664`, 5 GHz), hostname `p2r-edge-test` |
| Câmera | VIGI C250 por PoE, `INGEST_MODE=external`, RTSP `stream1` |
| Vídeo | H.264, **2880×1620** (5 MP), 25 fps, VBR, bitrate máximo 6144 kbps, sem áudio (`-an` no segmenter) |
| Janela do replay | 85 s antes do clique + 5 s depois = **~90 s** |
| Chunks | 1 s cada, janela de 120 s em RAM |
| Botão | ESP32, `POST http://p2r-edge-test.local:3000/replay/1` |
| Cena | quadra parada (sem jogo), por isso o bitrate real ficou baixo |

## O que foi medido

Valores observados à mão (cronómetro de cabeça, não instrumentados):

| Medida | Resultado |
| --- | --- |
| LED azul aceso depois do clique | ~19 s |
| Tempo adicional até o replay aparecer na página (com refresh manual) | ~26 s |
| **Total aproximado clique → replay visível** | **~45 s** |
| Tamanho do mp4 | **16 MB** para 1:30 (~1,4 Mbps de média; o teto é 6 Mbps) |
| Duração do replay | 1:30 (como esperado) |

Em jogo real o bitrate VBR deve subir. Estimativa, **não medida**: 35 a 55 MB por replay.

## Como o envio funciona (lido no código)

1. `POST /replay/:courtId` no edge. O edge espera o pós-roll (5 s).
2. `replayBuilder.ts` junta os chunks num mp4 (`-c copy`, rápido).
3. `replayBuilder.ts` gera o **spritesheet** (12 frames): o ffmpeg decodifica o vídeo
   inteiro (~2250 frames a 5 MP, em software no Pi 4).
4. `uploader.ts` envia o mp4 **direto para o Vercel Blob** com um token emitido por
   `POST /api/edge/upload`. O vídeo **não** passa pela função da Vercel (limite de body ~4,5 MB).
5. O mesmo faz para o sprite (em série, depois do mp4).
6. `POST /api/edge/replays` confirma que os ficheiros existem no storage e grava a linha na BD.
   **Só aqui o replay passa a aparecer na página.**
7. O edge responde ao botão (200 se pelo menos uma câmera gerou o replay).

Tudo é feito em série, e o edge só responde ao botão no fim.

## Hipótese principal: o botão desiste antes do fim

`button-firmware/src/main.cpp:26` define `HTTP_TIMEOUT_MS = 25000`.

- O registo na BD (passo 6) acontece antes da resposta ao botão, por isso a página **não deveria**
  demorar mais depois de o ciclo acabar.
- Os ~26 s "extra" são compatíveis com o botão ter **desistido aos 25 s** (LED apaga, devia dar
  as 6 piscadas de falha) enquanto o edge continuava a trabalhar até aos ~45 s.
- **Não confirmado.** Falta ver se houve 6 piscadas rápidas e medir o ciclo real (abaixo).

## Onde provavelmente se gasta o tempo (hipótese, não medido)

| Etapa | Peso esperado |
| --- | --- |
| Pós-roll | 5 s fixos |
| Juntar chunks (`-c copy`) | ~1 s |
| **Spritesheet** (decode de 90 s a 5 MP no Pi 4) | provavelmente o maior |
| Upload do mp4 (16 MB) | depende do upload da rede (a confirmar em cada local) |
| Upload do sprite + registo na BD | pequeno |

## Como medir

No Pi, mede o ciclo completo (cria um replay a sério):

```bash
time curl -s -X POST localhost:3000/replay/1 | head -c 300
```

- ~40 a 50 s: confirma a hipótese do timeout do botão (25 s < ciclo).
- Para separar as etapas, ver os tempos no `journalctl -u press2replay` ou acrescentar logs
  de duração em cada passo (ainda não existem).

Medir também no local do cliente: o upload de rede muda tudo. Anotar o tamanho do mp4 e o
tempo total.

## Melhorias planeadas (por implementar)

| Melhoria | O quê | Impacto esperado (estimativa) |
| --- | --- | --- |
| **Sprite só com keyframes** | `-skip_frame nokey` no ffmpeg do spritesheet (`buildSpritesheet`). Com GOP de 1 a 2 s decodifica ~45 a 90 frames em vez de ~2250 | Maior ganho, talvez 10 a 20 s |
| **Uploads em paralelo** | Subir mp4 e sprite ao mesmo tempo, em vez de em série | Poupa o tempo do sprite |
| **Resolução 1080p** | Menos decode e menos upload (a testar depois de ter os números a 5 MP) | Menos MB e menos CPU |
| **Timeout do botão** | Subir `HTTP_TIMEOUT_MS` (ex.: 60 s) para o LED refletir o ciclo todo | Feedback correto, não acelera o replay |

Meta sugerida: ciclo abaixo de 20 a 30 s. Depois de cada melhoria, repetir a medição com
`time curl` no mesmo cenário para comparar.

## Fora do âmbito (ideia descartada por agora)

Atualizar a lista de replays sem refresh. WebSocket não é viável na Vercel (serverless).
Alternativa leve: polling de ~5 s com `router.refresh()`. Fica para mais tarde.

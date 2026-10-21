# Melhorias futuras: botão e edge

Ideias acordadas, ainda **não implementadas**, para considerar mais tarde. O botão é o
firmware em `button-firmware/`; o edge é este projeto. Hoje o botão faz
`POST /replay/{courtId}` sem autenticação e espera pela resposta completa.

## 1. Token partilhado no `POST /replay`

**Problema.** Qualquer aparelho na rede do local pode disparar replays: um cliente do clube
no Wi-Fi, um script, um botão avariado.

**Desenho.** O edge tem um segredo (`BUTTON_TOKEN`) e o botão guarda o mesmo e envia-o:

```
POST /replay/1
Authorization: Bearer <token>
```

O edge compara em tempo constante (`crypto.timingSafeEqual`) e responde **401** se faltar ou
estiver errado, antes de chegar ao `respondWithMoment` (`src/routes/replay.ts`).

| Decisão | Proposta |
| --- | --- |
| Quantos tokens | Um por local (por edge), igual em todos os botões desse local |
| No edge | `BUTTON_TOKEN` em `/etc/press2replay/edge.env` |
| No botão | 5.º campo no portal ("Chave"), guardado na flash do ESP32. Nunca no código nem no git |
| Rotas protegidas | `POST /replay` e `POST /replay/:courtId`. O `/health` fica aberto (o `p2r-update` e os humanos usam-no) |
| Gerar | `openssl rand -hex 24` |
| Sem `BUTTON_TOKEN` | O edge continua aberto, mas **avisa no arranque** (não parte o `sim:button` nem os testes). Nos guias de instalação passa a ser obrigatório |
| Trocar o token | `BUTTON_TOKEN` aceita uma lista (`antigo,novo`): os botões antigos funcionam até serem reconfigurados |
| Tentativas falhadas | Log com o IP, sem bloqueio |

**Botão.** O pedido leva o cabeçalho; o `401` ganha um padrão de LED próprio (2 piscadas
longas) para distinguir de uma falha de rede. O `sim:button` do edge passa a ler o token de
uma variável de ambiente.

**Limitação a documentar.** O pedido vai em HTTP simples, por isso o token viaja em claro na
rede do local. Protege contra aparelhos curiosos e enganos, **não** contra quem consiga ver o
tráfego. Resolver isso a sério pede HTTPS no edge (certificado próprio que o ESP32 teria de
aceitar) ou um protocolo com desafio (o ESP32 não tem relógio fiável sem internet). Para
replays de desporto amador, numa rede que o cliente controla, o token simples chega; usar o
Pi numa rede onde clientes não o alcancem (rede do pessoal, não a de convidados) ajuda mais.

## 2. Resposta `202 Accepted` imediata

**Problema.** Hoje o `POST /replay/:courtId` só responde depois do pós-roll, do corte e do
upload (6 a 13 s). O botão fica preso à espera, com a bateria (se houver) ligada.

**Desenho.**

1. O edge valida logo (token, a quadra existe, pelo menos uma câmera da quadra está a gravar)
   e responde `202` com `{ ok: true, momentId }` em milissegundos. Sem câmera a gravar:
   `503` na hora (como hoje, mas sem esperar).
2. O corte e o upload correm em segundo plano a partir da **hora em que o pedido chegou**
   (o `pressTimestamp` mantém-se).
3. O botão dá as 3 piscadas lentas logo a seguir ao 202 e fica livre. O tempo limite do pedido
   baixa de 25 s para uns 5 s (`HTTP_TIMEOUT_MS`).
4. As falhas de processamento (upload que falha, câmera que pára a meio) deixam de chegar ao
   botão: ficam no log do edge e na ausência do replay na página. O botão só sabe "recebido".

**Compatibilidade.** `POST /replay/1?wait=1` mantém o comportamento atual (espera e devolve o
resultado completo, com `uploaded` e `replayId`). Os testes e o `sim:button` usam-no; o
botão não.

**Opcional.** Um `GET /replay/moments/:momentId` para ver o resultado de um momento depois do
202 (diagnóstico).

## 3. Intervalo mínimo por quadra no edge

**Problema.** Dois botões na mesma quadra, um toque duplicado, ou um botão preso geram vários
momentos iguais. O intervalo de 8 s do firmware só protege cada botão sozinho.

**Desenho.** Se já foi aceite um pedido para essa quadra há menos de ~8 s (configurável), o
edge responde `202` com `ignored: true` e não cria outro momento. Vale para qualquer origem
(botão, `curl`), e protege também contra o contacto NC com fio solto.

## 4. Botão: trocar o bloco de contacto por um NO (NYAE-101)

**Problema.** O botão atual leva o bloco **NYAE-102**, que é **NC** (fechado em repouso, abre
ao premir). Com NC, um fio solto ou partido lê-se como "premido", e o ESP32 acende o LED e
tenta disparar sem ninguém tocar. A lógica está invertida no firmware (`PRESSED_LEVEL = HIGH`),
e uma bateria com *deep sleep* não funcionaria bem (gasta energia em repouso).

**Mudança.**

1. Comprar o bloco **NYAE-101** (1 NO), intercambiável (mesma série Tracon, 22 mm). Confirmar na
   etiqueta que é NO, e o código no fornecedor.
2. Trocar o bloco no botão (soltar o bloco preto da placa de metal, encaixar o novo, ligar os
   mesmos dois fios aos parafusos `1` e `2`).
3. No firmware, `button-firmware/src/main.cpp`: `PRESSED_LEVEL = LOW`, e enviar de novo
   (`pio run -t upload`). Atualizar a nota no `button-firmware/README.md`.

Com NO: fio solto = "solto" (seguro), e a bateria em *deep sleep* passa a ser possível.

## Ordem sugerida

1. **202 + intervalo mínimo** (melhora logo a experiência, sem mudar a configuração).
2. **Token** (antes do primeiro botão num cliente).
3. **Bloco NO** (barato, quando tiveres a peça).

## Por decidir

- Um token por local chega, ou um por botão?
- Aceitar o edge aberto (com aviso) quando não há `BUTTON_TOKEN`, ou exigi-lo sempre?
- O botão só saber "recebido" (sem o resultado do upload) é aceitável?

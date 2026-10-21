# Configurar o botão no cliente

Guia para ligar e configurar um botão num local. O botão chega já com o firmware
(ver `README.md`); só falta dizer-lhe a que Wi-Fi ligar e onde está o edge.

## O que levar

- O botão (ESP32 na caixa, com o botão ligado).
- Um **carregador USB de 5 V** (de telemóvel) e o cabo.
- Um **telemóvel**.
- Os dados do local, que confirmas **antes de ir** (ver a lista abaixo).

### Dados a ter à mão

| Dado | Exemplo | Onde se vê |
| --- | --- | --- |
| Nome e senha do **Wi-Fi 2,4 GHz** do local | `Clube-Wifi` | com o cliente. O ESP32 **não liga a 5 GHz** |
| **Endereço do edge** (o Raspberry) | `192.168.1.57` ou `p2r-edge-clube.local` | no Pi: `hostname -I`; ou na lista de dispositivos do router |
| **Id da quadra** deste botão | `1` | admin do web-server, no local, na quadra |

- Se puderes, **reserva o IP** do Pi no router do cliente: assim não muda. Sem acesso ao
  router, usa o **nome** `.local` do Pi (`p2r-edge-<local>.local`), que acompanha o Pi
  mesmo que o IP mude.
- Cada botão tem o seu id de quadra. Dois botões da mesma quadra usam o mesmo id.
- O botão e o Pi têm de estar **na mesma rede**.

## Primeira vez: configurar

1. **Liga o botão** ao carregador USB. O LED azul faz **dois piscares rápidos a cada 2
   segundos**: é o modo de configuração (porque ainda não tem configuração).
2. No telemóvel, abre as definições de Wi-Fi e liga-te à rede **`P2R-Botao-XXXX`** (o
   `XXXX` são os 4 últimos dígitos do endereço MAC do ESP32, por isso é diferente em cada botão e é
   o mesmo número que o router mostra na lista de dispositivos). Não tem senha. O telemóvel pode avisar "sem internet":
   mantém a ligação.
3. A página de configuração **abre sozinha**. Se não abrir, abre o browser e vai a
   **`http://192.168.4.1`**.
4. Preenche:
   - **Rede Wi-Fi**: escolhe da lista ou escreve o nome exato.
   - **Senha do Wi-Fi**.
   - **Endereço do edge**: o IP ou o nome `.local` do Pi.
   - **Id da quadra**.
5. Carrega em **Guardar e reiniciar**. O botão reinicia e liga-se à rede do local (o LED
   pisca enquanto liga).

## Testar

1. O Pi tem de estar ligado, a câmera a gravar (`curl -s <edge>:3000/status` deve mostrar
   `chunks.live: true`) e o edge com a quadra certa.
2. **Carrega no botão.** O LED fica **aceso fixo** enquanto o edge trata o pedido (6 a 13
   segundos) e depois dá **3 piscadas lentas**: o replay foi pedido com sucesso.
3. Abre a página da quadra no telemóvel, `https://<dominio>/replays/<local>/<quadra>`, e vê
   se o replay apareceu.

| LED | Significado |
| --- | --- |
| 2 piscares rápidos a cada 2 s | modo de configuração (portal aberto) |
| Pisca devagar ao ligar | a ligar ao Wi-Fi |
| Aceso fixo | a pedir o replay |
| 3 piscadas lentas | replay pedido, deu certo |
| 6 piscadas rápidas | falhou (Wi-Fi, edge não encontrado ou erro do edge) |

Depois de um toque, o botão ignora novos toques durante 8 segundos.

## Voltar a configurar (mudou o Wi-Fi, o Pi ou a quadra)

1. **Desliga** o botão da corrente.
2. **Carrega e mantém** o botão premido.
3. Sem largar, **liga o carregador**, e continua a carregar uns **5 segundos**: o LED pisca
   depressa e depois fica fixo.
4. **Larga**. O botão abre o portal, como na primeira vez (o LED faz os dois piscares).
5. Segue os passos de "Primeira vez". Os campos já vêm preenchidos com os valores atuais, e
   se deixares a senha vazia mantém-se a atual.

## Problemas comuns

| Sintoma | O que fazer |
| --- | --- |
| Não aparece a rede `P2R-Botao-XXXX` | O botão tem de estar ligado e em modo de configuração (2 piscares). Se já está configurado, repete o passo "Voltar a configurar". |
| A página não abre | Vai a `http://192.168.4.1`, e desliga os dados móveis do telemóvel. |
| 6 piscadas rápidas ao carregar | Confirma o Wi-Fi (2,4 GHz, senha), e se o Pi e o botão estão na **mesma rede** (redes de convidados costumam isolar os dispositivos). Para ver a mensagem de erro, liga o botão a um computador e usa `pio device monitor`. |
| O portal abre sozinho em cada arranque | Ou nunca foi configurado, ou o contacto do botão está a ler "premido" (fio solto, ou o botão preso). Verifica os dois fios. |
| "Edge não encontrado" (nome `.local`) | O mDNS pode não funcionar nessa rede. Usa o **IP** do Pi e reserva-o no router. |
| O replay aparece sem o início | A câmera só começou a gravar há pouco: o edge precisa de 30 a 60 s a gravar. |
| Carregou e nada apareceu na página | Confirma no Pi: `journalctl -u press2replay -n 30` e `curl -s localhost:3000/status`. Ver `edge-server/CONFIG.md`. |

## Montagem (resumo)

- Alimentação: cabo USB para um carregador de 5 V junto ao botão. Passa o cabo pelo passa-fios
  da caixa e fecha com uma junta, se for exterior.
- Os dois fios do botão vão ao ESP32: um no `D4` e outro no `GND` (a ordem não importa).
- Não ligues o ESP32 a mais de 5 V. Não juntes o `3V3` ou o `VIN` ao `GND`.

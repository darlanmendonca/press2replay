#pragma once
#include <Arduino.h>
#include "config.h"

// Identificador curto deste botao: os 2 ultimos bytes do MAC, em hexadecimal
// (ex.: "E640"). Vem do MAC de fabrica, por isso e unico e nao depende de o Wi-Fi
// ja ter arrancado.
String deviceId();

// Abre o Wi-Fi proprio "P2R-Botao-XXXX" e uma pagina de configuracao (portal
// cativo). Guarda a configuracao e reinicia; tambem reinicia se ninguem a
// preencher a tempo. Nunca retorna.
[[noreturn]] void runPortal(const Config& current);

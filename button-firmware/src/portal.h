#pragma once
#include "config.h"

// Abre o Wi-Fi proprio "P2R-Botao-XXXX" e uma pagina de configuracao (portal
// cativo). Guarda a configuracao e reinicia; tambem reinicia se ninguem a
// preencher a tempo. Nunca retorna.
[[noreturn]] void runPortal(const Config& current);

#pragma once
#include <Arduino.h>

// Configuracao do botao, guardada na flash (Preferences) e preenchida pelo
// portal. Nada disto vai no codigo nem no git: muda de cliente para cliente.
struct Config {
  String ssid;      // Wi-Fi do local (so 2,4 GHz)
  String password;  // senha desse Wi-Fi
  String edge;      // endereco do edge: IP ou nome .local, com ":porta" opcional
  String court;     // id da quadra deste botao (o mesmo do admin e do edge)
};

// true se a configuracao esta completa (tem Wi-Fi, edge e quadra).
bool loadConfig(Config& config);
void saveConfig(const Config& config);

#include <Arduino.h>
#include <ESPmDNS.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include "config.h"
#include "portal.h"

// Botao do Press2Replay: ao premir, faz POST /replay/{courtId} no edge.
//
// Contacto: um lado no GPIO 4 e o outro no GND, com pull-up interno.
//  - NC (abre ao premir, o bloco NYAE-102): solto = LOW, premido = HIGH.
//  - NO (fecha ao premir): solto = HIGH, premido = LOW.
//
// Configuracao (Wi-Fi, endereco do edge, quadra): portal no telemovel. Abre
// sozinho se ainda nao ha configuracao, ou ao ligar a alimentacao com o botao
// premido durante PORTAL_HOLD_MS.
constexpr uint8_t BUTTON_PIN = 4;
constexpr bool PRESSED_LEVEL = HIGH;  // NC. Trocar para LOW com um bloco NO.
constexpr uint8_t LED_PIN = 2;        // LED azul do devkit

constexpr uint32_t DEBOUNCE_MS = 30;
constexpr uint32_t BOOT_SETTLE_MS = 500;    // o pino oscila ao arrancar: nao conta
constexpr uint32_t PORTAL_HOLD_MS = 5000;   // premido ao ligar -> portal
constexpr uint32_t COOLDOWN_MS = 8000;      // intervalo minimo entre disparos
constexpr uint32_t WIFI_TIMEOUT_MS = 15000;
constexpr uint32_t HTTP_TIMEOUT_MS = 25000;  // o edge so responde depois do pos-roll e do upload
constexpr uint16_t DEFAULT_EDGE_PORT = 3000;
constexpr const char* MDNS_HOSTNAME = "p2r-button";

Config config;
bool stableState;
bool lastReading;
uint32_t lastChange = 0;
uint32_t lastTrigger = 0;
bool everTriggered = false;
bool mdnsStarted = false;

bool isPressed() { return digitalRead(BUTTON_PIN) == PRESSED_LEVEL; }

void blink(uint8_t times, uint16_t ms) {
  for (uint8_t i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(ms);
    digitalWrite(LED_PIN, LOW);
    delay(ms);
  }
}

// Premido ao ligar: pisca depressa e, se continuar premido PORTAL_HOLD_MS, pede o portal.
bool heldAtBoot() {
  if (!isPressed()) return false;
  const uint32_t start = millis();
  while (isPressed()) {
    digitalWrite(LED_PIN, (millis() / 100) % 2);
    if (millis() - start >= PORTAL_HOLD_MS) {
      digitalWrite(LED_PIN, HIGH);
      while (isPressed()) delay(10);  // espera soltar antes de abrir o portal
      return true;
    }
    delay(10);
  }
  digitalWrite(LED_PIN, LOW);
  return false;
}

bool connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return true;
  Serial.printf("wifi: a ligar a \"%s\"\n", config.ssid.c_str());
  WiFi.mode(WIFI_STA);
  WiFi.begin(config.ssid.c_str(), config.password.c_str());
  const uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT_MS) {
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    delay(250);
  }
  digitalWrite(LED_PIN, LOW);
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("wifi: falhou");
    return false;
  }
  Serial.printf("wifi: ligado, IP %s\n", WiFi.localIP().toString().c_str());
  return true;
}

// "192.168.1.57", "192.168.1.57:3000" ou "p2r-edge-local.local[:porta]" -> IP + porta.
bool resolveEdge(String& host, uint16_t& port) {
  String address = config.edge;
  port = DEFAULT_EDGE_PORT;
  const int colon = address.lastIndexOf(':');
  if (colon > 0) {
    port = address.substring(colon + 1).toInt();
    address = address.substring(0, colon);
  }
  if (address.endsWith(".local")) {
    if (!mdnsStarted) mdnsStarted = MDNS.begin(MDNS_HOSTNAME);
    const IPAddress ip = MDNS.queryHost(address.substring(0, address.length() - 6), 3000);
    if (ip == IPAddress()) {
      Serial.printf("edge: nao encontrei \"%s\" na rede\n", address.c_str());
      return false;
    }
    address = ip.toString();
  }
  host = address;
  return port > 0;
}

// LED fixo enquanto envia; 3 piscadas lentas = recebido, 6 rapidas = falhou.
void sendReplay() {
  String host;
  uint16_t port;
  if (!connectWifi() || !resolveEdge(host, port)) {
    blink(6, 80);
    return;
  }
  const String url = "http://" + host + ":" + port + "/replay/" + config.court;
  digitalWrite(LED_PIN, HIGH);
  HTTPClient http;
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.begin(url);
  const int code = http.POST("");
  Serial.printf("replay: POST %s -> %d\n", url.c_str(), code);
  if (code > 0) Serial.println(http.getString());
  http.end();
  digitalWrite(LED_PIN, LOW);
  if (code >= 200 && code < 300) {
    blink(3, 300);
  } else {
    blink(6, 80);
  }
}

void onPress() {
  const uint32_t now = millis();
  if (everTriggered && now - lastTrigger < COOLDOWN_MS) {
    Serial.println("PREMIDO: ignorado (intervalo minimo)");
    return;
  }
  everTriggered = true;
  Serial.println("PREMIDO: a pedir replay");
  sendReplay();
  lastTrigger = millis();  // o intervalo conta a partir do fim do pedido
}

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  delay(BOOT_SETTLE_MS);
  Serial.printf("p2r-button: a arrancar (id %s)\n", deviceId().c_str());

  const bool configured = loadConfig(config);
  if (!configured || heldAtBoot()) runPortal(config);

  Serial.printf("config: wifi \"%s\", edge \"%s\", quadra \"%s\"\n", config.ssid.c_str(),
                config.edge.c_str(), config.court.c_str());
  stableState = lastReading = digitalRead(BUTTON_PIN);
  connectWifi();
  Serial.println("p2r-button: pronto");
}

void loop() {
  const bool reading = digitalRead(BUTTON_PIN);
  if (reading != lastReading) {
    lastReading = reading;
    lastChange = millis();
  }
  if (millis() - lastChange > DEBOUNCE_MS && reading != stableState) {
    stableState = reading;
    if (stableState == PRESSED_LEVEL) {
      onPress();
      // Descarta o que mudou enquanto o pedido bloqueava.
      stableState = lastReading = digitalRead(BUTTON_PIN);
      lastChange = millis();
    }
  }
}

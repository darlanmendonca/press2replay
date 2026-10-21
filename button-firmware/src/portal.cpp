#include "portal.h"
#include <DNSServer.h>
#include <WebServer.h>
#include <WiFi.h>

namespace {

constexpr uint8_t LED_PIN = 2;
constexpr uint32_t PORTAL_TIMEOUT_MS = 10UL * 60 * 1000;
const IPAddress AP_IP(192, 168, 4, 1);

DNSServer dns;
WebServer server(80);
Config current;
String networkOptions;  // <option> de cada rede vista no scan

String escapeHtml(const String& text) {
  String out;
  for (char c : text) {
    switch (c) {
      case '&': out += "&amp;"; break;
      case '<': out += "&lt;"; break;
      case '>': out += "&gt;"; break;
      case '"': out += "&quot;"; break;
      default: out += c;
    }
  }
  return out;
}

// Mesmo formato dos ids no admin e no edge: letras, numeros, - e _, ate 64.
bool validId(const String& id) {
  if (id.isEmpty() || id.length() > 64) return false;
  for (char c : id) {
    if (!isalnum(static_cast<unsigned char>(c)) && c != '-' && c != '_') return false;
  }
  return true;
}

void scanNetworks() {
  const int found = WiFi.scanNetworks();
  networkOptions = "";
  String seen;
  for (int i = 0; i < found && i < 20; i++) {
    const String name = WiFi.SSID(i);
    if (name.isEmpty() || seen.indexOf("\n" + name + "\n") >= 0) continue;
    seen += "\n" + name + "\n";
    networkOptions += "<option value=\"" + escapeHtml(name) + "\">";
  }
  WiFi.scanDelete();
}

String page(const String& message = "") {
  String html =
      "<!doctype html><html lang=\"pt\"><head><meta charset=\"utf-8\">"
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
      "<title>Botao Press2Replay</title><style>"
      "body{font-family:system-ui,sans-serif;margin:0;padding:24px;background:#0b0b0f;color:#f4f4f5}"
      "main{max-width:420px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}"
      "p{color:#a1a1aa;margin:4px 0 18px;font-size:14px}"
      "label{display:block;font-size:14px;margin:14px 0 4px}"
      "input{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #3f3f46;"
      "background:#18181b;color:#f4f4f5;font-size:16px}"
      "button{width:100%;margin-top:22px;padding:14px;border:0;border-radius:10px;background:#22c55e;"
      "color:#04130a;font-weight:700;font-size:16px}"
      ".msg{background:#3f1d1d;border:1px solid #7f1d1d;padding:10px;border-radius:10px;font-size:14px}"
      "small{color:#a1a1aa;font-size:12px}</style></head><body><main>"
      "<h1>Botao Press2Replay</h1><p>Configuracao deste botao.</p>";
  if (message.length()) html += "<div class=\"msg\">" + escapeHtml(message) + "</div>";
  html +=
      "<form method=\"post\" action=\"/save\">"
      "<label>Rede Wi-Fi (2,4 GHz)</label>"
      "<input name=\"ssid\" list=\"nets\" required autocapitalize=\"none\" autocorrect=\"off\" value=\"" +
      escapeHtml(current.ssid) + "\"><datalist id=\"nets\">" + networkOptions + "</datalist>"
      "<label>Senha do Wi-Fi</label>"
      "<input name=\"pass\" type=\"password\" autocomplete=\"off\" placeholder=\"" +
      String(current.ssid.length() ? "deixe vazio para manter a atual" : "") + "\">"
      "<label>Endereco do edge</label>"
      "<input name=\"edge\" required autocapitalize=\"none\" autocorrect=\"off\" placeholder=\"192.168.1.57\" value=\"" +
      escapeHtml(current.edge) + "\"><small>IP do Pi, ou o nome (ex.: p2r-edge-local.local). "
      "Porta opcional: 192.168.1.57:3000</small>"
      "<label>Id da quadra</label>"
      "<input name=\"court\" required maxlength=\"64\" pattern=\"[A-Za-z0-9_\\-]+\" autocapitalize=\"none\" value=\"" +
      escapeHtml(current.court) + "\"><small>O mesmo id da quadra no admin (ex.: 1)</small>"
      "<button type=\"submit\">Guardar e reiniciar</button></form></main></body></html>";
  return html;
}

void handleSave() {
  Config next;
  next.ssid = server.arg("ssid");
  next.password = server.arg("pass");
  next.edge = server.arg("edge");
  next.court = server.arg("court");
  next.ssid.trim();
  next.edge.trim();
  next.court.trim();

  if (next.ssid.isEmpty() || next.edge.isEmpty() || !validId(next.court)) {
    current = next;
    server.send(400, "text/html; charset=utf-8",
                page("Preencha a rede, o endereco do edge e um id de quadra valido (letras, numeros, - e _)."));
    return;
  }
  if (next.password.isEmpty() && next.ssid == current.ssid) next.password = current.password;

  saveConfig(next);
  server.send(200, "text/html; charset=utf-8",
              "<!doctype html><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
              "<body style=\"font-family:system-ui;padding:24px;background:#0b0b0f;color:#f4f4f5\">"
              "<h2>Guardado</h2><p>O botao vai reiniciar e ligar-se a rede escolhida.</p></body>");
  delay(1500);
  ESP.restart();
}

// Qualquer outro endereco (os testes de "ha internet?" dos telemoveis incluidos)
// vai para a pagina de configuracao.
void redirectToPortal() {
  server.sendHeader("Location", "http://192.168.4.1/", true);
  server.send(302, "text/plain", "");
}

}  // namespace

[[noreturn]] void runPortal(const Config& existing) {
  current = existing;
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char apName[24];
  snprintf(apName, sizeof(apName), "P2R-Botao-%02X%02X", mac[4], mac[5]);

  WiFi.mode(WIFI_AP_STA);
  scanNetworks();
  WiFi.softAPConfig(AP_IP, AP_IP, IPAddress(255, 255, 255, 0));
  WiFi.softAP(apName);
  dns.start(53, "*", AP_IP);

  server.on("/", HTTP_GET, [] { server.send(200, "text/html; charset=utf-8", page()); });
  server.on("/save", HTTP_POST, handleSave);
  server.onNotFound(redirectToPortal);
  server.begin();

  Serial.printf("portal: rede \"%s\", abrir http://192.168.4.1\n", apName);

  const uint32_t start = millis();
  while (millis() - start < PORTAL_TIMEOUT_MS) {
    dns.processNextRequest();
    server.handleClient();
    // Dois piscares rapidos a cada 2 s: "estou em modo de configuracao".
    const uint32_t phase = millis() % 2000;
    digitalWrite(LED_PIN, (phase < 120 || (phase > 240 && phase < 360)) ? HIGH : LOW);
    delay(2);
  }
  Serial.println("portal: tempo esgotado, a reiniciar");
  ESP.restart();
  while (true) {}
}

#include "config.h"
#include <Preferences.h>

namespace {
constexpr const char* NAMESPACE = "p2r";
}

bool loadConfig(Config& config) {
  Preferences prefs;
  prefs.begin(NAMESPACE, true);
  config.ssid = prefs.getString("ssid", "");
  config.password = prefs.getString("pass", "");
  config.edge = prefs.getString("edge", "");
  config.court = prefs.getString("court", "");
  prefs.end();
  return config.ssid.length() && config.edge.length() && config.court.length();
}

void saveConfig(const Config& config) {
  Preferences prefs;
  prefs.begin(NAMESPACE, false);
  prefs.putString("ssid", config.ssid);
  prefs.putString("pass", config.password);
  prefs.putString("edge", config.edge);
  prefs.putString("court", config.court);
  prefs.end();
}

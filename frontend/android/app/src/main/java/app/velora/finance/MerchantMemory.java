package app.velora.finance;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.util.Iterator;

final class MerchantMemory {
  static final String PREFS = "velora_payment_capture";
  static final String KEY_MAP = "merchant_memory";
  static final String KEY_LAUNCH = "launch_action";

  private MerchantMemory() {}

  static void saveMap(Context context, String json) {
    if (context == null) return;
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_MAP, json == null ? "{}" : json)
      .apply();
  }

  static String categoryFor(Context context, String blob) {
    if (context == null || blob == null) return "";
    try {
      SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
      JSONObject map = new JSONObject(prefs.getString(KEY_MAP, "{}"));
      String lower = blob.toLowerCase();
      String best = "";
      int bestLen = 0;
      Iterator<String> keys = map.keys();
      while (keys.hasNext()) {
        String key = keys.next();
        if (key != null && key.length() >= 3 && lower.contains(key) && key.length() > bestLen) {
          best = map.optString(key, "");
          bestLen = key.length();
        }
      }
      return best;
    } catch (Exception ignored) {
      return "";
    }
  }

  static void setLaunch(Context context, String action, String noteId, String category) {
    setLaunch(context, action, noteId, category, "");
  }

  static void setLaunch(Context context, String action, String noteId, String category, String path) {
    if (context == null) return;
    try {
      JSONObject obj = new JSONObject();
      obj.put("action", action == null ? "" : action);
      obj.put("noteId", noteId == null ? "" : noteId);
      obj.put("category", category == null ? "" : category);
      obj.put("path", path == null ? "" : path);
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_LAUNCH, obj.toString())
        .apply();
    } catch (Exception ignored) { /* ignore */ }
  }

  static JSONObject consumeLaunch(Context context) {
    if (context == null) return new JSONObject();
    SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    String raw = prefs.getString(KEY_LAUNCH, "");
    prefs.edit().remove(KEY_LAUNCH).apply();
    if (raw == null || raw.isEmpty()) return new JSONObject();
    try {
      return new JSONObject(raw);
    } catch (Exception ignored) {
      return new JSONObject();
    }
  }
}

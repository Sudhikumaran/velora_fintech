package app.velora.finance;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

final class PaymentQueue {
  static final String PREFS = "velora_payment_capture";
  static final String KEY_QUEUE = "queue";
  private static final int MAX_QUEUE = 80;

  private PaymentQueue() {}

  static boolean looksFinancial(String combined) {
    if (combined == null || combined.trim().length() < 8) return false;
    String lower = combined.toLowerCase();
    return combined.contains("₹")
        || lower.contains("rs.")
        || lower.contains("rs ")
        || lower.contains("inr")
        || lower.contains("upi")
        || lower.contains("imps")
        || lower.contains("neft")
        || lower.contains("rtgs")
        || lower.contains("debited")
        || lower.contains("credited")
        || lower.contains("withdrawn")
        || lower.contains("paid")
        || lower.contains("spent")
        || lower.contains("a/c")
        || lower.contains("acct");
  }

  static void enqueue(Context context, JSONObject item) {
    if (context == null || item == null) return;
    try {
      SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
      JSONArray queue = new JSONArray(prefs.getString(KEY_QUEUE, "[]"));
      String id = item.optString("id");
      for (int i = 0; i < queue.length(); i += 1) {
        if (id.equals(queue.getJSONObject(i).optString("id"))) return;
      }
      JSONArray next = new JSONArray();
      int start = Math.max(0, queue.length() - (MAX_QUEUE - 1));
      for (int i = start; i < queue.length(); i += 1) next.put(queue.getJSONObject(i));
      next.put(item);
      prefs.edit().putString(KEY_QUEUE, next.toString()).apply();
      PaymentCapturePlugin.emit(item);
      Context app = context.getApplicationContext();
      String payload = item.toString();
      new Handler(Looper.getMainLooper()).post(() -> {
        if (PaymentOverlay.show(app, item)) return;
        PaymentPrompt.show(app, item);
        try {
          Intent wake = new Intent(app, PaymentWakeService.class);
          wake.putExtra("payload", payload);
          if (android.os.Build.VERSION.SDK_INT >= 26) {
            app.startForegroundService(wake);
          } else {
            app.startService(wake);
          }
        } catch (Exception ignored) {
          try {
            Intent popup = new Intent(app, PaymentPopupActivity.class);
            popup.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            popup.putExtra("payload", payload);
            app.startActivity(popup);
          } catch (Exception ignored2) { /* last resort is the notification */ }
        }
      });
    } catch (Exception ignored) { /* keep capturing */ }
  }

  static void remove(Context context, String id) {
    if (context == null || id == null) return;
    try {
      SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
      JSONArray queue = new JSONArray(prefs.getString(KEY_QUEUE, "[]"));
      JSONArray keep = new JSONArray();
      for (int i = 0; i < queue.length(); i += 1) {
        JSONObject item = queue.getJSONObject(i);
        if (!id.equals(item.optString("id"))) keep.put(item);
      }
      prefs.edit().putString(KEY_QUEUE, keep.toString()).apply();
      PaymentPrompt.cancel(context, id);
    } catch (Exception ignored) { /* ignore */ }
  }
}

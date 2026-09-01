package app.velora.finance;

import android.Manifest;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.provider.Settings;
import android.provider.Telephony;
import android.speech.RecognizerIntent;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(
  name = "PaymentCapture",
  permissions = {
    @Permission(
      alias = "sms",
      strings = { Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS }
    ),
    @Permission(
      alias = "notifications",
      strings = { Manifest.permission.POST_NOTIFICATIONS }
    )
  }
)
public class PaymentCapturePlugin extends Plugin {
  private static PaymentCapturePlugin instance;

  @Override
  public void load() {
    instance = this;
  }

  static void emit(JSONObject item) {
    if (instance == null || item == null) return;
    try {
      instance.notifyListeners("paymentNotification", JSObject.fromJSONObject(item));
    } catch (Exception ignored) { /* app may be in background */ }
  }

  static boolean isAppVisible() {
    if (instance == null) return false;
    try {
      return instance.getActivity() != null && instance.getActivity().hasWindowFocus();
    } catch (Exception ignored) {
      return false;
    }
  }

  @PluginMethod
  public void isAvailable(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("available", true);
    call.resolve(ret);
  }

  @PluginMethod
  public void isAccessEnabled(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("enabled", isListenerEnabled());
    ret.put("sms", getPermissionState("sms") == PermissionState.GRANTED);
    call.resolve(ret);
  }

  @PluginMethod
  public void openAccessSettings(PluginCall call) {
    Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getContext().startActivity(intent);
    call.resolve();
  }

  @PluginMethod
  public void requestSmsPermission(PluginCall call) {
    if (getPermissionState("sms") == PermissionState.GRANTED) {
      JSObject ret = new JSObject();
      ret.put("granted", true);
      call.resolve(ret);
      return;
    }
    requestPermissionForAlias("sms", call, "smsCallback");
  }

  @PermissionCallback
  private void smsCallback(PluginCall call) {
    JSObject ret = new JSObject();
    boolean granted = getPermissionState("sms") == PermissionState.GRANTED;
    ret.put("granted", granted);
    if (granted) scanInbox(2);
    call.resolve(ret);
  }

  @PluginMethod
  public void requestNotifyPermission(PluginCall call) {
    if (getPermissionState("notifications") == PermissionState.GRANTED) {
      JSObject ret = new JSObject();
      ret.put("granted", true);
      call.resolve(ret);
      return;
    }
    requestPermissionForAlias("notifications", call, "notifyCallback");
  }

  @PermissionCallback
  private void notifyCallback(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("granted", getPermissionState("notifications") == PermissionState.GRANTED);
    call.resolve(ret);
  }

  @PluginMethod
  public void setMerchantMemory(PluginCall call) {
    JSObject map = call.getObject("map");
    MerchantMemory.saveMap(getContext(), map == null ? "{}" : map.toString());
    call.resolve();
  }

  @PluginMethod
  public void consumeLaunchAction(PluginCall call) {
    try {
      call.resolve(JSObject.fromJSONObject(MerchantMemory.consumeLaunch(getContext())));
    } catch (Exception e) {
      JSObject ret = new JSObject();
      ret.put("action", "");
      call.resolve(ret);
    }
  }

  @PluginMethod
  public void updateTodaySpend(PluginCall call) {
    Double amount = call.getDouble("amount");
    String label = call.getString("label", "Today");
    double value = amount == null ? 0 : amount;
    String formatted = "₹" + String.format(java.util.Locale.ENGLISH, "%,.0f", value);
    getContext().getSharedPreferences(PaymentQueue.PREFS, 0)
      .edit()
      .putString(SpendWidgetProvider.KEY_LABEL, label == null ? "Today" : label)
      .putString(SpendWidgetProvider.KEY_AMOUNT, formatted)
      .apply();
    SpendWidgetProvider.updateAll(getContext());
    call.resolve();
  }

  @PluginMethod
  public void showDueNotices(PluginCall call) {
    JSArray items = call.getArray("items");
    if (items != null) {
      for (int i = 0; i < items.length(); i += 1) {
        try {
          JSONObject raw = items.getJSONObject(i);
          PaymentPrompt.showDue(getContext(), raw.optString("id"), raw.optString("title", "Bill due soon"), raw.optString("text"));
        } catch (Exception ignored) { /* skip */ }
      }
    }
    call.resolve();
  }

  @PluginMethod
  public void startVoiceInput(PluginCall call) {
    Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN");
    intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Say amount and what you paid, like 40 tea");
    startActivityForResult(call, intent, "voiceCallback");
  }

  @ActivityCallback
  private void voiceCallback(PluginCall call, ActivityResult result) {
    JSObject ret = new JSObject();
    ret.put("text", "");
    if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
      java.util.ArrayList<String> matches = result.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
      if (matches != null && !matches.isEmpty()) ret.put("text", matches.get(0));
    }
    call.resolve(ret);
  }

  @PluginMethod
  public void scanRecentSms(PluginCall call) {
    JSObject ret = new JSObject();
    ret.put("scanned", scanInbox(2));
    call.resolve(ret);
  }

  @PluginMethod
  public void getPending(PluginCall call) {
    try {
      SharedPreferences prefs = getContext().getSharedPreferences(PaymentQueue.PREFS, 0);
      JSONArray queue = new JSONArray(prefs.getString(PaymentQueue.KEY_QUEUE, "[]"));
      JSArray notifications = new JSArray();
      for (int i = 0; i < queue.length(); i += 1) {
        notifications.put(JSObject.fromJSONObject(queue.getJSONObject(i)));
      }
      JSObject ret = new JSObject();
      ret.put("notifications", notifications);
      call.resolve(ret);
    } catch (Exception e) {
      call.reject(e.getMessage());
    }
  }

  @PluginMethod
  public void removeByIds(PluginCall call) {
    try {
      JSArray ids = call.getArray("ids");
      if (ids == null) {
        call.resolve();
        return;
      }
      SharedPreferences prefs = getContext().getSharedPreferences(PaymentQueue.PREFS, 0);
      JSONArray queue = new JSONArray(prefs.getString(PaymentQueue.KEY_QUEUE, "[]"));
      JSONArray keep = new JSONArray();
      for (int i = 0; i < queue.length(); i += 1) {
        JSONObject item = queue.getJSONObject(i);
        String id = item.optString("id");
        boolean drop = false;
        for (int j = 0; j < ids.length(); j += 1) {
          if (id.equals(String.valueOf(ids.get(j)))) {
            drop = true;
            break;
          }
        }
        if (!drop) keep.put(item);
        else PaymentPrompt.cancel(getContext(), id);
      }
      prefs.edit().putString(PaymentQueue.KEY_QUEUE, keep.toString()).apply();
      call.resolve();
    } catch (Exception e) {
      call.reject(e.getMessage());
    }
  }

  private int scanInbox(int hours) {
    if (getPermissionState("sms") != PermissionState.GRANTED) return 0;
    int added = 0;
    long since = System.currentTimeMillis() - hours * 3600L * 1000L;
    try (Cursor cursor = getContext().getContentResolver().query(
      Telephony.Sms.Inbox.CONTENT_URI,
      new String[]{ Telephony.Sms._ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE },
      Telephony.Sms.DATE + " >= ?",
      new String[]{ String.valueOf(since) },
      Telephony.Sms.DATE + " DESC"
    )) {
      if (cursor == null) return 0;
      while (cursor.moveToNext()) {
        String from = cursor.getString(1);
        String text = cursor.getString(2);
        long when = cursor.getLong(3);
        if (!PaymentQueue.looksFinancial(text)) continue;
        JSONObject item = new JSONObject();
        item.put("id", "sms|" + from + "|" + when + "|" + (text == null ? 0 : text.hashCode()));
        item.put("packageName", "sms");
        item.put("title", from == null || from.isEmpty() ? "Bank SMS" : from);
        item.put("text", text == null ? "" : text);
        item.put("bigText", "");
        item.put("subText", "");
        item.put("when", when);
        PaymentQueue.enqueue(getContext(), item);
        added += 1;
      }
    } catch (Exception ignored) {
      return added;
    }
    return added;
  }

  private boolean isListenerEnabled() {
    String pkg = getContext().getPackageName();
    String flat = Settings.Secure.getString(getContext().getContentResolver(), "enabled_notification_listeners");
    if (flat == null || pkg == null) return false;
    ComponentName expected = new ComponentName(getContext(), PaymentNotificationService.class);
    return flat.contains(pkg) && (flat.contains(expected.flattenToString()) || flat.contains(expected.flattenToShortString()) || flat.contains(PaymentNotificationService.class.getName()));
  }
}

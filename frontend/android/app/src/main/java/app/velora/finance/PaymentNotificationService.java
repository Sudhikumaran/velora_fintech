package app.velora.finance;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONObject;

public class PaymentNotificationService extends NotificationListenerService {
  static final String PREFS = PaymentQueue.PREFS;
  static final String KEY_QUEUE = PaymentQueue.KEY_QUEUE;

  @Override
  public void onNotificationPosted(StatusBarNotification sbn) {
    if (sbn == null || sbn.getNotification() == null) return;
    if ((sbn.getNotification().flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
    if (getPackageName().equals(sbn.getPackageName())) return;

    Bundle extras = sbn.getNotification().extras;
    if (extras == null) return;

    String title = extras.getString(Notification.EXTRA_TITLE, "");
    CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
    CharSequence bigCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
    CharSequence subCs = extras.getCharSequence(Notification.EXTRA_SUB_TEXT);
    String text = textCs == null ? "" : textCs.toString();
    String bigText = bigCs == null ? "" : bigCs.toString();
    String subText = subCs == null ? "" : subCs.toString();
    String combined = (title + " " + text + " " + bigText + " " + subText).trim();
    if (!PaymentQueue.looksFinancial(combined)) return;

    try {
      JSONObject item = new JSONObject();
      item.put("id", sbn.getKey() + "|" + sbn.getPostTime());
      item.put("packageName", sbn.getPackageName() == null ? "" : sbn.getPackageName());
      item.put("title", title == null ? "" : title);
      item.put("text", text);
      item.put("bigText", bigText);
      item.put("subText", subText);
      item.put("when", sbn.getPostTime());
      PaymentQueue.enqueue(this, item);
    } catch (Exception ignored) { /* keep capturing */ }
  }
}

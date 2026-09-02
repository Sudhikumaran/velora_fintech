package app.velora.finance;

import android.app.Notification;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONObject;

public class PaymentNotificationService extends NotificationListenerService {
  private static PaymentNotificationService instance;

  @Override
  public void onListenerConnected() {
    instance = this;
    scanActive();
  }

  @Override
  public void onListenerDisconnected() {
    if (instance == this) instance = null;
  }

  @Override
  public void onNotificationPosted(StatusBarNotification sbn) {
    capture(sbn);
  }

  static int scanActive() {
    PaymentNotificationService service = instance;
    if (service == null) return 0;
    StatusBarNotification[] notes;
    try {
      notes = service.getActiveNotifications();
    } catch (Exception e) {
      return 0;
    }
    if (notes == null) return 0;
    int added = 0;
    long since = System.currentTimeMillis() - 2L * 60L * 60L * 1000L;
    for (StatusBarNotification sbn : notes) {
      if (sbn == null || sbn.getPostTime() < since) continue;
      if (service.capture(sbn)) added += 1;
    }
    return added;
  }

  private boolean capture(StatusBarNotification sbn) {
    if (sbn == null || sbn.getNotification() == null) return false;
    if ((sbn.getNotification().flags & Notification.FLAG_GROUP_SUMMARY) != 0) return false;
    if (getPackageName().equals(sbn.getPackageName())) return false;

    String title = NotificationText.title(sbn);
    String body = NotificationText.body(sbn);
    String combined = NotificationText.combined(sbn);
    if (!PaymentQueue.looksFinancial(combined)) return false;

    try {
      JSONObject item = new JSONObject();
      item.put("id", sbn.getKey() + "|" + sbn.getPostTime());
      item.put("packageName", sbn.getPackageName() == null ? "" : sbn.getPackageName());
      item.put("title", title);
      item.put("text", body);
      item.put("bigText", combined);
      item.put("subText", "");
      item.put("when", sbn.getPostTime());
      PaymentQueue.enqueue(this, item);
      return true;
    } catch (Exception ignored) {
      return false;
    }
  }
}

package app.velora.finance;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;

final class NotificationText {
  private NotificationText() {}

  static String combined(StatusBarNotification sbn) {
    if (sbn == null || sbn.getNotification() == null) return "";
    Bundle extras = sbn.getNotification().extras;
    if (extras == null) return "";
    StringBuilder out = new StringBuilder();
    append(out, extras.getCharSequence(Notification.EXTRA_TITLE));
    append(out, extras.getCharSequence(Notification.EXTRA_TITLE_BIG));
    append(out, extras.getCharSequence(Notification.EXTRA_TEXT));
    append(out, extras.getCharSequence(Notification.EXTRA_BIG_TEXT));
    append(out, extras.getCharSequence(Notification.EXTRA_SUB_TEXT));
    append(out, extras.getCharSequence(Notification.EXTRA_INFO_TEXT));
    append(out, extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT));
    CharSequence[] lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
    if (lines != null) {
      for (CharSequence line : lines) append(out, line);
    }
    return out.toString().trim();
  }

  static String title(StatusBarNotification sbn) {
    if (sbn == null || sbn.getNotification() == null || sbn.getNotification().extras == null) return "";
    CharSequence title = sbn.getNotification().extras.getCharSequence(Notification.EXTRA_TITLE);
    return title == null ? "" : title.toString();
  }

  static String body(StatusBarNotification sbn) {
    String all = combined(sbn);
    String head = title(sbn);
    if (!head.isEmpty() && all.startsWith(head)) {
      return all.substring(head.length()).trim();
    }
    return all;
  }

  private static void append(StringBuilder out, CharSequence value) {
    if (value == null) return;
    String text = value.toString().trim();
    if (text.isEmpty()) return;
    if (out.indexOf(text) >= 0) return;
    if (out.length() > 0) out.append(' ');
    out.append(text);
  }
}

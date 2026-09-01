package app.velora.finance;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONObject;

final class PaymentPrompt {
  private static final String CHANNEL_ID = "velora_payments";
  private static final String DUE_CHANNEL = "velora_dues";

  private PaymentPrompt() {}

  static int notifyIdFor(String id) {
    if (id == null || id.isEmpty()) return 4101;
    return 4200 + Math.abs(id.hashCode() % 200);
  }

  static void show(Context context, JSONObject item) {
    if (context == null || item == null) return;
    try {
      ensureChannel(context);
      String id = item.optString("id");
      String text = item.optString("text");
      if (text.isEmpty()) text = item.optString("title");
      if (text.length() > 140) text = text.substring(0, 140);
      String category = MerchantMemory.categoryFor(context, text + " " + item.optString("title"));

      Intent openIntent = new Intent(context, MainActivity.class);
      openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
      openIntent.putExtra("velora_action", "open");
      openIntent.putExtra("velora_note_id", id);
      PendingIntent openPi = PendingIntent.getActivity(
        context,
        notifyIdFor(id),
        openIntent,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );

      NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
        .setSmallIcon(R.drawable.ic_stat_velora)
        .setContentTitle("Add this payment in Velora")
        .setContentText(text)
        .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
        .setContentIntent(openPi)
        .setAutoCancel(true)
        .setPriority(NotificationCompat.PRIORITY_HIGH);

      Intent skip = new Intent(context, PaymentActionReceiver.class);
      skip.setAction(PaymentActionReceiver.ACTION_SKIP);
      skip.putExtra("noteId", id);
      PendingIntent skipPi = PendingIntent.getBroadcast(
        context,
        notifyIdFor(id) + 1,
        skip,
        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      );
      builder.addAction(0, "Skip", skipPi);
      builder.addAction(0, "Open", openPi);

      if (!category.isEmpty()) {
        Intent save = new Intent(context, PaymentActionReceiver.class);
        save.setAction(PaymentActionReceiver.ACTION_SAVE);
        save.putExtra("noteId", id);
        save.putExtra("category", category);
        PendingIntent savePi = PendingIntent.getBroadcast(
          context,
          notifyIdFor(id) + 2,
          save,
          PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        String label = category.length() > 18 ? category.substring(0, 18) : category;
        builder.addAction(0, "Save · " + label, savePi);
      }

      NotificationManagerCompat.from(context).notify(notifyIdFor(id), builder.build());
    } catch (Exception ignored) { /* permission or OEM limits */ }
  }

  static void showDue(Context context, String id, String title, String text) {
    if (context == null) return;
    try {
      NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
      if (Build.VERSION.SDK_INT >= 26 && manager != null) {
        NotificationChannel channel = new NotificationChannel(DUE_CHANNEL, "Bills due soon", NotificationManager.IMPORTANCE_DEFAULT);
        manager.createNotificationChannel(channel);
      }
      Intent intent = new Intent(context, MainActivity.class);
      intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
      PendingIntent pi = PendingIntent.getActivity(context, 4300 + Math.abs((id == null ? 0 : id.hashCode()) % 50), intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
      NotificationCompat.Builder builder = new NotificationCompat.Builder(context, DUE_CHANNEL)
        .setSmallIcon(R.drawable.ic_stat_velora)
        .setContentTitle(title == null ? "Bill due soon" : title)
        .setContentText(text == null ? "" : text)
        .setContentIntent(pi)
        .setAutoCancel(true);
      NotificationManagerCompat.from(context).notify(4300 + Math.abs((id == null ? 0 : id.hashCode()) % 50), builder.build());
    } catch (Exception ignored) { /* ignore */ }
  }

  static void cancel(Context context) {
    /* keep due notices; payment ids are cancelled one by one */
  }

  static void cancel(Context context, String id) {
    if (context == null) return;
    try {
      NotificationManagerCompat.from(context).cancel(notifyIdFor(id));
    } catch (Exception ignored) { /* ignore */ }
  }

  private static void ensureChannel(Context context) {
    NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26 && manager != null) {
      NotificationChannel channel = new NotificationChannel(
        CHANNEL_ID,
        "Payments to add",
        NotificationManager.IMPORTANCE_HIGH
      );
      channel.setDescription("Opens Velora so you can add a payment you just made");
      manager.createNotificationChannel(channel);
    }
  }
}

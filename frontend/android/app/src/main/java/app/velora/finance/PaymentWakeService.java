package app.velora.finance;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;

public class PaymentWakeService extends Service {
  private static final String CHANNEL_ID = "velora_payments";

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    String payload = intent != null ? intent.getStringExtra("payload") : "";
    ensureChannel();
    Intent popup = new Intent(this, PaymentPopupActivity.class);
    popup.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    popup.putExtra("payload", payload);
    PendingIntent content = PendingIntent.getActivity(
      this,
      4102,
      popup,
      PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
    );
    Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(R.drawable.ic_stat_velora)
      .setContentTitle("Review this payment")
      .setContentText("Tap to add it in Velora")
      .setContentIntent(content)
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setFullScreenIntent(content, true)
      .setOngoing(false)
      .build();

    try {
      if (Build.VERSION.SDK_INT >= 34) {
        startForeground(4102, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
      } else {
        startForeground(4102, notification);
      }
    } catch (Exception ignored) {
      try { startForeground(4102, notification); } catch (Exception ignored2) { /* continue */ }
    }

    try {
      startActivity(popup);
    } catch (Exception ignored) { /* overlay / OEM block */ }

    new Handler(Looper.getMainLooper()).postDelayed(this::stopSelf, 4000);
    return START_NOT_STICKY;
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  private void ensureChannel() {
    if (Build.VERSION.SDK_INT < 26) return;
    NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    if (manager == null) return;
    NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Payments to add", NotificationManager.IMPORTANCE_HIGH);
    channel.setDescription("Opens Velora so you can review a payment before it is saved");
    manager.createNotificationChannel(channel);
  }
}

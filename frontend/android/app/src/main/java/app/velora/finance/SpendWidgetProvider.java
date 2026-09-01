package app.velora.finance;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class SpendWidgetProvider extends AppWidgetProvider {
  static final String PREFS = "velora_payment_capture";
  static final String KEY_LABEL = "widget_label";
  static final String KEY_AMOUNT = "widget_amount";

  @Override
  public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
    updateAll(context);
  }

  static void updateAll(Context context) {
    if (context == null) return;
    AppWidgetManager manager = AppWidgetManager.getInstance(context);
    int[] ids = manager.getAppWidgetIds(new ComponentName(context, SpendWidgetProvider.class));
    SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    String label = prefs.getString(KEY_LABEL, "Today");
    String amount = prefs.getString(KEY_AMOUNT, "₹0");
    for (int id : ids) {
      RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.spend_widget);
      views.setTextViewText(R.id.widget_label, label);
      views.setTextViewText(R.id.widget_amount, amount);
      Intent intent = new Intent(context, MainActivity.class);
      intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
      PendingIntent pi = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
      views.setOnClickPendingIntent(R.id.widget_root, pi);
      manager.updateAppWidget(id, views);
    }
  }
}

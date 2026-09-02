package app.velora.finance;

import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.provider.Settings;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.ImageButton;

final class PaymentBubble {
  private static ImageButton current;
  private static WindowManager currentWm;

  private PaymentBubble() {}

  static void show(Context context) {
    if (context == null) return;
    Context app = context.getApplicationContext();
    if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(app)) return;
    WindowManager wm = (WindowManager) app.getSystemService(Context.WINDOW_SERVICE);
    if (wm == null || current != null) return;

    int size = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 56, app.getResources().getDisplayMetrics());
    ImageButton button = new ImageButton(app);
    button.setImageResource(R.drawable.ic_stat_velora);
    button.setBackgroundResource(R.drawable.bg_payment_bubble);
    button.setColorFilter(0xFFFFFFFF);
    button.setPadding(size / 4, size / 4, size / 4, size / 4);
    button.setContentDescription("Add a payment");
    button.setOnClickListener(v -> {
      MerchantMemory.setLaunch(app, "log", "", "");
      Intent open = new Intent(app, MainActivity.class);
      open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
      open.putExtra("velora_action", "log");
      app.startActivity(open);
    });

    int type = Build.VERSION.SDK_INT >= 26
      ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      : WindowManager.LayoutParams.TYPE_PHONE;
    WindowManager.LayoutParams params = new WindowManager.LayoutParams(
      size,
      size,
      type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT
    );
    params.gravity = Gravity.BOTTOM | Gravity.END;
    params.x = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 12, app.getResources().getDisplayMetrics());
    params.y = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 96, app.getResources().getDisplayMetrics());

    try {
      wm.addView(button, params);
      current = button;
      currentWm = wm;
    } catch (Exception ignored) { /* overlay blocked */ }
  }

  static void hide() {
    if (current == null || currentWm == null) return;
    try { currentWm.removeView(current); } catch (Exception ignored) { /* already gone */ }
    current = null;
    currentWm = null;
  }
}

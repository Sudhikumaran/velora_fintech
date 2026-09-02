package app.velora.finance;

import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.os.Build;
import android.provider.Settings;
import android.util.TypedValue;
import android.view.ContextThemeWrapper;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import org.json.JSONObject;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

final class PaymentOverlay {
  private static final Pattern AMOUNT = Pattern.compile(
    "(?:₹|Rs\\.?|INR)\\s*[:\\-]?\\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)",
    Pattern.CASE_INSENSITIVE
  );

  private static View current;
  private static WindowManager currentWm;

  private PaymentOverlay() {}

  static boolean show(Context context, JSONObject item) {
    if (context == null || item == null) return false;
    Context app = context.getApplicationContext();
    if (Build.VERSION.SDK_INT >= 23 && !Settings.canDrawOverlays(app)) return false;

    WindowManager wm = (WindowManager) app.getSystemService(Context.WINDOW_SERVICE);
    if (wm == null) return false;

    hide();

    String amount = "Payment";
    String detail = "Tap to add this in Velora.";
    String noteId = item.optString("id");
    String text = (item.optString("title") + " " + item.optString("text") + " " + item.optString("bigText")).trim();
    Matcher matcher = AMOUNT.matcher(text);
    if (matcher.find()) amount = "₹" + matcher.group(1);
    if (text.length() > 120) text = text.substring(0, 120);
    if (!text.isEmpty()) detail = text;

    Context themed = new ContextThemeWrapper(app, R.style.AppTheme);
    View root = LayoutInflater.from(themed).inflate(R.layout.overlay_payment_popup, null, false);
    ((TextView) root.findViewById(R.id.popup_amount)).setText(amount);
    ((TextView) root.findViewById(R.id.popup_detail)).setText(detail);

    ((Button) root.findViewById(R.id.popup_add)).setOnClickListener(v -> {
      MerchantMemory.setLaunch(app, "open", noteId, "");
      hide();
      Intent open = new Intent(app, MainActivity.class);
      open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
      open.putExtra("velora_action", "open");
      open.putExtra("velora_note_id", noteId);
      app.startActivity(open);
    });
    ((Button) root.findViewById(R.id.popup_skip)).setOnClickListener(v -> hide());

    int type = Build.VERSION.SDK_INT >= 26
      ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      : WindowManager.LayoutParams.TYPE_PHONE;
    int margin = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 16, app.getResources().getDisplayMetrics());
    WindowManager.LayoutParams params = new WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
        | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
        | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED,
      PixelFormat.TRANSLUCENT
    );
    params.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
    params.x = 0;
    params.y = margin;
    params.dimAmount = 0.25f;
    params.flags |= WindowManager.LayoutParams.FLAG_DIM_BEHIND;

    try {
      wm.addView(root, params);
      current = root;
      currentWm = wm;
      return true;
    } catch (Exception ignored) {
      return false;
    }
  }

  static void hide() {
    if (current == null || currentWm == null) return;
    try { currentWm.removeView(current); } catch (Exception ignored) { /* already gone */ }
    current = null;
    currentWm = null;
  }
}

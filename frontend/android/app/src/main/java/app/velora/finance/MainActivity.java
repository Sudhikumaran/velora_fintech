package app.velora.finance;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(PaymentCapturePlugin.class);
    super.onCreate(savedInstanceState);
    captureLaunch(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    captureLaunch(intent);
  }

  private void captureLaunch(Intent intent) {
    if (intent == null) return;
    if (!intent.hasExtra("velora_action") && !intent.hasExtra("velora_note_id") && !intent.getBooleanExtra("velora_open_payment", false)) {
      return;
    }
    String action = intent.getStringExtra("velora_action");
    if (action == null || action.isEmpty() || "save".equals(action)) action = "open";
    MerchantMemory.setLaunch(this, action, intent.getStringExtra("velora_note_id"), "");
  }

  @Override
  public void onStart() {
    super.onStart();
    if (getBridge() == null || getBridge().getWebView() == null) {
      return;
    }
    WebSettings settings = getBridge().getWebView().getSettings();
    settings.setDomStorageEnabled(true);
    settings.setCacheMode(WebSettings.LOAD_DEFAULT);
  }
}

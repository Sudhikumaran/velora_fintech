package app.velora.finance;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

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
    if (Intent.ACTION_SEND.equals(intent.getAction())) {
      String type = intent.getType() == null ? "" : intent.getType();
      if (type.startsWith("image/")) {
        captureSharedImage(intent);
      } else {
        captureSharedText(intent);
      }
      return;
    }
    if (!intent.hasExtra("velora_action") && !intent.hasExtra("velora_note_id") && !intent.getBooleanExtra("velora_open_payment", false)) {
      return;
    }
    String action = intent.getStringExtra("velora_action");
    if (action == null || action.isEmpty() || "save".equals(action)) action = "open";
    MerchantMemory.setLaunch(this, action, intent.getStringExtra("velora_note_id"), "");
    PaymentNotificationService.scanActive();
  }

  private void captureSharedImage(Intent intent) {
    Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
    if (uri == null) {
      MerchantMemory.setLaunch(this, "log", "", "");
      return;
    }
    try {
      File out = new File(getCacheDir(), "shared_pay.jpg");
      try (InputStream in = getContentResolver().openInputStream(uri);
           FileOutputStream fos = new FileOutputStream(out)) {
        if (in == null) throw new IllegalStateException("no stream");
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) fos.write(buf, 0, n);
      }
      MerchantMemory.setLaunch(this, "ocr", "", "", out.getAbsolutePath());
    } catch (Exception ignored) {
      MerchantMemory.setLaunch(this, "log", "", "");
    }
  }

  private void captureSharedText(Intent intent) {
    String shared = intent.getStringExtra(Intent.EXTRA_TEXT);
    if (shared == null || shared.trim().length() < 4) {
      MerchantMemory.setLaunch(this, "log", "", "");
      return;
    }
    try {
      JSONObject item = new JSONObject();
      String id = "share|" + System.currentTimeMillis() + "|" + shared.hashCode();
      item.put("id", id);
      item.put("packageName", "share");
      item.put("title", "Shared payment");
      item.put("text", shared.trim());
      item.put("bigText", "");
      item.put("subText", "");
      item.put("when", System.currentTimeMillis());
      PaymentQueue.enqueue(this, item);
      MerchantMemory.setLaunch(this, "open", id, "");
    } catch (Exception ignored) {
      MerchantMemory.setLaunch(this, "log", "", "");
    }
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

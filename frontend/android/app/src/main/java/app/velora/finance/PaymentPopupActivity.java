package app.velora.finance;

import android.content.Intent;
import android.os.Bundle;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONObject;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class PaymentPopupActivity extends AppCompatActivity {
  private static final Pattern AMOUNT = Pattern.compile(
    "(?:₹|Rs\\.?|INR)\\s*[:\\-]?\\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\\.[0-9]{1,2})?|[0-9]+(?:\\.[0-9]{1,2})?)",
    Pattern.CASE_INSENSITIVE
  );

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    getWindow().addFlags(
      WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
        | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
    );
    if (android.os.Build.VERSION.SDK_INT >= 27) {
      setShowWhenLocked(true);
      setTurnScreenOn(true);
    }
    setContentView(R.layout.activity_payment_popup);

    String payload = getIntent() != null ? getIntent().getStringExtra("payload") : "";
    String amount = "Payment";
    String detail = "Pick a category and save in Velora.";
    String noteId = "";
    try {
      JSONObject item = new JSONObject(payload == null ? "{}" : payload);
      noteId = item.optString("id");
      String text = (item.optString("title") + " " + item.optString("text") + " " + item.optString("bigText")).trim();
      Matcher matcher = AMOUNT.matcher(text);
      if (matcher.find()) amount = "₹" + matcher.group(1);
      if (text.length() > 140) text = text.substring(0, 140);
      if (!text.isEmpty()) detail = text;
    } catch (Exception ignored) { /* use defaults */ }

    ((TextView) findViewById(R.id.popup_amount)).setText(amount);
    ((TextView) findViewById(R.id.popup_detail)).setText(detail);

    String finalNoteId = noteId;
    ((Button) findViewById(R.id.popup_add)).setOnClickListener(v -> {
      MerchantMemory.setLaunch(this, "open", finalNoteId, "");
      Intent open = new Intent(this, MainActivity.class);
      open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
      open.putExtra("velora_action", "open");
      open.putExtra("velora_note_id", finalNoteId);
      startActivity(open);
      finish();
    });
    ((Button) findViewById(R.id.popup_skip)).setOnClickListener(v -> {
      if (!finalNoteId.isEmpty()) PaymentQueue.remove(this, finalNoteId);
      finish();
    });
  }
}

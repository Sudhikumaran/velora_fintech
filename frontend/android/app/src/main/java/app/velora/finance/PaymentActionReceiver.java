package app.velora.finance;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class PaymentActionReceiver extends BroadcastReceiver {
  public static final String ACTION_SAVE = "app.velora.finance.PAY_SAVE";
  public static final String ACTION_SKIP = "app.velora.finance.PAY_SKIP";

  @Override
  public void onReceive(Context context, Intent intent) {
    if (context == null || intent == null) return;
    String action = intent.getAction();
    String noteId = intent.getStringExtra("noteId");
    String category = intent.getStringExtra("category");
    if (ACTION_SAVE.equals(action)) {
      MerchantMemory.setLaunch(context, "save", noteId, category);
    } else if (ACTION_SKIP.equals(action)) {
      MerchantMemory.setLaunch(context, "skip", noteId, "");
    } else {
      MerchantMemory.setLaunch(context, "open", noteId, "");
    }
    PaymentPrompt.cancel(context, noteId);
    if (ACTION_SKIP.equals(action)) {
      PaymentQueue.remove(context, noteId);
    }

    Intent open = new Intent(context, MainActivity.class);
    open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    context.startActivity(open);
  }
}

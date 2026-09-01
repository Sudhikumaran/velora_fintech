package app.velora.finance;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.provider.Telephony;
import android.telephony.SmsMessage;

import org.json.JSONObject;

public class BankSmsReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (context == null || intent == null) return;
    if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;

    SmsMessage[] messages;
    try {
      messages = Telephony.Sms.Intents.getMessagesFromIntent(intent);
    } catch (Exception e) {
      return;
    }
    if (messages == null || messages.length == 0) return;

    StringBuilder body = new StringBuilder();
    String from = "";
    long when = System.currentTimeMillis();
    for (SmsMessage message : messages) {
      if (message == null) continue;
      if (message.getDisplayOriginatingAddress() != null) {
        from = message.getDisplayOriginatingAddress();
      }
      if (message.getMessageBody() != null) body.append(message.getMessageBody());
      when = message.getTimestampMillis();
    }

    String text = body.toString().trim();
    if (!PaymentQueue.looksFinancial(text)) return;

    try {
      JSONObject item = new JSONObject();
      item.put("id", "sms|" + from + "|" + when + "|" + text.hashCode());
      item.put("packageName", "sms");
      item.put("title", from.isEmpty() ? "Bank SMS" : from);
      item.put("text", text);
      item.put("bigText", "");
      item.put("subText", "");
      item.put("when", when);
      PaymentQueue.enqueue(context, item);
    } catch (Exception ignored) { /* keep capturing */ }
  }
}

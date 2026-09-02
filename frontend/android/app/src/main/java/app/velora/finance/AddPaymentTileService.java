package app.velora.finance;

import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

public class AddPaymentTileService extends TileService {
  @Override
  public void onStartListening() {
    Tile tile = getQsTile();
    if (tile == null) return;
    tile.setLabel("Add payment");
    tile.setState(Tile.STATE_ACTIVE);
    tile.updateTile();
  }

  @Override
  public void onClick() {
    PaymentNotificationService.scanActive();
    Intent open = new Intent(this, MainActivity.class);
    open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    open.putExtra("velora_action", "open");
    open.putExtra("velora_open_payment", true);
    try {
      if (Build.VERSION.SDK_INT >= 34) {
        PendingIntent pi = PendingIntent.getActivity(
          this,
          4301,
          open,
          PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        startActivityAndCollapse(pi);
      } else {
        startActivityAndCollapse(open);
      }
    } catch (Exception ignored) {
      try { startActivity(open); } catch (Exception ignored2) { /* tile still useful as a reminder */ }
    }
  }
}

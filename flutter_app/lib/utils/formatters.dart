import 'package:intl/intl.dart';

String formatCurrency(double amount, [String currency = 'USD']) {
  final symbol = switch (currency) {
    'INR' => '₹',
    'EUR' => '€',
    'GBP' => '£',
    'JPY' => '¥',
    _ => '\$',
  };
  final formatted = NumberFormat('#,##0.##').format(amount.abs());
  final prefix = amount < 0 ? '-$symbol' : symbol;
  return '$prefix$formatted';
}

String formatDate(DateTime date, {bool short = false}) {
  if (short) return DateFormat('MMM d').format(date);
  return DateFormat('MMM d, yyyy').format(date);
}

String greeting() {
  final h = DateTime.now().hour;
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

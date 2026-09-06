import 'package:flutter/material.dart';
import '../models/transaction_model.dart';
import '../theme/app_colors.dart';
import '../utils/formatters.dart';

class TransactionTile extends StatelessWidget {
  const TransactionTile({super.key, required this.tx, required this.currency});

  final TransactionModel tx;
  final String currency;

  Color get _typeColor {
    return switch (tx.type) {
      'income' => AppColors.green,
      'transfer' => AppColors.indigo,
      _ => AppColors.red,
    };
  }

  IconData get _typeIcon {
    return switch (tx.type) {
      'income' => Icons.arrow_downward_rounded,
      'transfer' => Icons.swap_horiz_rounded,
      _ => Icons.arrow_upward_rounded,
    };
  }

  @override
  Widget build(BuildContext context) {
    final prefix = tx.type == 'expense' ? '-' : '+';
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      leading: CircleAvatar(
        backgroundColor: _typeColor.withValues(alpha: 0.12),
        child: Icon(_typeIcon, color: _typeColor, size: 20),
      ),
      title: Text(
        tx.description?.isNotEmpty == true ? tx.description! : tx.category,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      ),
      subtitle: Text(
        '${tx.category}${tx.accountName != null ? ' · ${tx.accountName}' : ''}',
        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(
            '$prefix${formatCurrency(tx.amount, currency)}',
            style: TextStyle(fontWeight: FontWeight.bold, color: _typeColor, fontSize: 14),
          ),
          Text(formatDate(tx.date, short: true), style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
        ],
      ),
    );
  }
}

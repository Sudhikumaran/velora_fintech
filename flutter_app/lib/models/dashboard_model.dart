import 'account_model.dart';
import 'transaction_model.dart';

class DashboardModel {
  DashboardModel({
    required this.totalBalance,
    required this.totalAccounts,
    required this.monthlyIncome,
    required this.monthlyExpenses,
    required this.netSavings,
    required this.recentTransactions,
    required this.accounts,
  });

  final double totalBalance;
  final int totalAccounts;
  final double monthlyIncome;
  final double monthlyExpenses;
  final double netSavings;
  final List<TransactionModel> recentTransactions;
  final List<AccountModel> accounts;

  factory DashboardModel.fromJson(Map<String, dynamic> json) {
    final recent = (json['recentTransactions'] as List? ?? [])
        .map((e) => TransactionModel.fromJson(e as Map<String, dynamic>))
        .toList();
    final accounts = (json['accounts'] as List? ?? [])
        .map((e) => AccountModel.fromJson(e as Map<String, dynamic>))
        .toList();
    return DashboardModel(
      totalBalance: (json['totalBalance'] as num?)?.toDouble() ?? 0,
      totalAccounts: (json['totalAccounts'] as num?)?.toInt() ?? 0,
      monthlyIncome: (json['monthlyIncome'] as num?)?.toDouble() ?? 0,
      monthlyExpenses: (json['monthlyExpenses'] as num?)?.toDouble() ?? 0,
      netSavings: (json['netSavings'] as num?)?.toDouble() ?? 0,
      recentTransactions: recent,
      accounts: accounts,
    );
  }
}

class MonthlyTrendPoint {
  MonthlyTrendPoint({required this.month, required this.income, required this.expense});
  final String month;
  final double income;
  final double expense;

  factory MonthlyTrendPoint.fromJson(Map<String, dynamic> json) {
    return MonthlyTrendPoint(
      month: json['month']?.toString() ?? '',
      income: (json['income'] as num?)?.toDouble() ?? 0,
      expense: (json['expense'] as num?)?.toDouble() ?? 0,
    );
  }
}

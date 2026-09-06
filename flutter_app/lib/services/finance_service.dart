import '../core/api_client.dart';
import '../models/account_model.dart';
import '../models/dashboard_model.dart';
import '../models/transaction_model.dart';

class FinanceService {
  FinanceService(this._api);
  final ApiClient _api;

  Future<DashboardModel> getDashboard() async {
    final res = await _api.get('/analytics/dashboard');
    return DashboardModel.fromJson(res['data'] as Map<String, dynamic>);
  }

  Future<List<MonthlyTrendPoint>> getMonthlyTrend({int months = 6}) async {
    final res = await _api.get('/analytics/monthly-trend', query: {'months': months});
    final list = res['data'] as List? ?? [];
    return list.map((e) => MonthlyTrendPoint.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<AccountModel>> getAccounts() async {
    final res = await _api.get('/accounts');
    final list = res['data'] as List? ?? [];
    return list.map((e) => AccountModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<AccountModel> createAccount({
    required String name,
    required String type,
    double balance = 0,
    String currency = 'USD',
  }) async {
    final res = await _api.post('/accounts', body: {
      'name': name,
      'type': type,
      'balance': balance,
      'currency': currency,
    });
    return AccountModel.fromJson(res['data'] as Map<String, dynamic>);
  }

  Future<List<TransactionModel>> getTransactions({int limit = 30, String? type}) async {
    final res = await _api.get('/transactions', query: {
      'limit': limit,
      'page': 1,
      if (type != null) 'type': type,
    });
    final list = res['data'] as List? ?? [];
    return list.map((e) => TransactionModel.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<TransactionModel> createTransaction({
    required String accountId,
    required String type,
    required double amount,
    required String category,
    String? description,
    DateTime? date,
  }) async {
    final res = await _api.post('/transactions', body: {
      'account': accountId,
      'type': type,
      'amount': amount,
      'category': category,
      if (description != null && description.isNotEmpty) 'description': description,
      'date': (date ?? DateTime.now()).toIso8601String(),
    });
    return TransactionModel.fromJson(res['data'] as Map<String, dynamic>);
  }

  Future<void> deleteTransaction(String id) async {
    await _api.delete('/transactions/$id');
  }
}

import '../core/api_client.dart';
import '../models/account_model.dart';
import '../models/dashboard_model.dart';
import '../models/transaction_model.dart';
import '../models/velora_models.dart';

class VeloraApi {
  VeloraApi() : _api = ApiClient.instance;
  final ApiClient _api;

  List<T> _list<T>(Map<String, dynamic> res, T Function(Map<String, dynamic>) fromJson) {
    final data = res['data'];
    if (data is! List) return [];
    return data.map((e) => fromJson(Map<String, dynamic>.from(e as Map))).toList();
  }

  Map<String, dynamic> _data(Map<String, dynamic> res) {
    final d = res['data'];
    if (d is Map<String, dynamic>) return d;
    if (d is Map) return Map<String, dynamic>.from(d);
    return res;
  }

  // Dashboard & analytics
  Future<DashboardModel> dashboard() async {
    final res = await _api.get('/analytics/dashboard');
    return DashboardModel.fromJson(_data(res));
  }

  Future<List<MonthlyTrendPoint>> monthlyTrend({int months = 6}) async {
    final res = await _api.get('/analytics/monthly-trend', query: {'months': months});
    return _list(res, MonthlyTrendPoint.fromJson);
  }

  Future<List<CategorySpend>> spendingByCategory({String period = 'month'}) async {
    final res = await _api.get('/analytics/spending-by-category', query: {'period': period});
    return _list(res, CategorySpend.fromJson);
  }

  Future<Map<String, dynamic>> netWorth() async {
    final res = await _api.get('/analytics/net-worth');
    return _data(res);
  }

  Future<List<CashFlowPoint>> cashFlow({int? year}) async {
    final res = await _api.get('/analytics/cash-flow', query: {
      if (year != null) 'year': year,
    });
    return _list(res, CashFlowPoint.fromJson);
  }

  Future<Map<String, dynamic>> exportData() async {
    final res = await _api.get('/analytics/export');
    return _data(res);
  }

  // Accounts
  Future<List<AccountModel>> accounts({bool includeArchived = false}) async {
    final res = await _api.get('/accounts', query: {
      if (includeArchived) 'includeArchived': true,
    });
    return _list(res, AccountModel.fromJson);
  }

  Future<AccountModel> createAccount(Map<String, dynamic> body) async {
    final res = await _api.post('/accounts', body: body);
    return AccountModel.fromJson(_data(res));
  }

  Future<AccountModel> updateAccount(String id, Map<String, dynamic> body) async {
    final res = await _api.put('/accounts/$id', body: body);
    return AccountModel.fromJson(_data(res));
  }

  Future<void> archiveAccount(String id) => _api.patch('/accounts/$id/archive');

  Future<void> deleteAccount(String id) => _api.delete('/accounts/$id');

  // Transactions
  Future<List<TransactionModel>> transactions({
    String? type,
    String? account,
    String? search,
    String? startDate,
    String? endDate,
    bool includeArchived = false,
    int limit = 100,
    int page = 1,
  }) async {
    final res = await _api.get('/transactions', query: {
      'limit': limit,
      'page': page,
      if (type != null) 'type': type,
      if (account != null) 'account': account,
      if (search != null && search.isNotEmpty) 'search': search,
      if (startDate != null) 'startDate': startDate,
      if (endDate != null) 'endDate': endDate,
      if (includeArchived) 'includeArchived': true,
    });
    return _list(res, TransactionModel.fromJson);
  }

  Future<TransactionModel> createTransaction(Map<String, dynamic> body) async {
    final res = await _api.post('/transactions', body: body);
    return TransactionModel.fromJson(_data(res));
  }

  Future<TransactionModel> updateTransaction(String id, Map<String, dynamic> body) async {
    final res = await _api.put('/transactions/$id', body: body);
    return TransactionModel.fromJson(_data(res));
  }

  Future<void> archiveTransaction(String id) => _api.patch('/transactions/$id/archive');

  Future<void> deleteTransaction(String id) => _api.delete('/transactions/$id');

  // Budgets
  Future<List<BudgetModel>> budgets() async {
    final res = await _api.get('/budgets');
    return _list(res, BudgetModel.fromJson);
  }

  Future<BudgetModel> createBudget(Map<String, dynamic> body) async {
    final res = await _api.post('/budgets', body: body);
    return BudgetModel.fromJson(_data(res));
  }

  Future<BudgetModel> updateBudget(String id, Map<String, dynamic> body) async {
    final res = await _api.put('/budgets/$id', body: body);
    return BudgetModel.fromJson(_data(res));
  }

  Future<void> deleteBudget(String id) => _api.delete('/budgets/$id');

  // Goals
  Future<List<GoalModel>> goals() async {
    final res = await _api.get('/goals');
    return _list(res, GoalModel.fromJson);
  }

  Future<GoalModel> createGoal(Map<String, dynamic> body) async {
    final res = await _api.post('/goals', body: body);
    return GoalModel.fromJson(_data(res));
  }

  Future<GoalModel> updateGoal(String id, Map<String, dynamic> body) async {
    final res = await _api.put('/goals/$id', body: body);
    return GoalModel.fromJson(_data(res));
  }

  Future<void> addGoalContribution(String id, double amount, {String? note, DateTime? date}) async {
    await _api.post('/goals/$id/contributions', body: {
      'amount': amount,
      if (note != null) 'note': note,
      if (date != null) 'date': date.toIso8601String(),
    });
  }

  Future<void> deleteGoal(String id) => _api.delete('/goals/$id');

  // Debts
  Future<List<DebtModel>> debts() async {
    final res = await _api.get('/debts');
    return _list(res, DebtModel.fromJson);
  }

  Future<DebtModel> createDebt(Map<String, dynamic> body) async {
    final res = await _api.post('/debts', body: body);
    return DebtModel.fromJson(_data(res));
  }

  Future<DebtModel> updateDebt(String id, Map<String, dynamic> body) async {
    final res = await _api.put('/debts/$id', body: body);
    return DebtModel.fromJson(_data(res));
  }

  Future<void> addDebtRepayment(String id, double amount, {String? note, DateTime? date}) async {
    await _api.post('/debts/$id/repayments', body: {
      'amount': amount,
      if (note != null) 'note': note,
      if (date != null) 'date': date.toIso8601String(),
    });
  }

  Future<void> deleteDebt(String id) => _api.delete('/debts/$id');

  // Subscriptions
  Future<List<SubscriptionModel>> subscriptions() async {
    final res = await _api.get('/subscriptions');
    return _list(res, SubscriptionModel.fromJson);
  }

  Future<SubscriptionModel> createSubscription(Map<String, dynamic> body) async {
    final res = await _api.post('/subscriptions', body: body);
    return SubscriptionModel.fromJson(_data(res));
  }

  Future<SubscriptionModel> updateSubscription(String id, Map<String, dynamic> body) async {
    final res = await _api.put('/subscriptions/$id', body: body);
    return SubscriptionModel.fromJson(_data(res));
  }

  Future<void> toggleSubscription(String id) => _api.patch('/subscriptions/$id/toggle');

  Future<void> deleteSubscription(String id) => _api.delete('/subscriptions/$id');

  // Investments
  Future<List<InvestmentModel>> investments() async {
    final res = await _api.get('/investments');
    return _list(res, InvestmentModel.fromJson);
  }

  Future<InvestmentModel> createInvestment(Map<String, dynamic> body) async {
    final res = await _api.post('/investments', body: body);
    return InvestmentModel.fromJson(_data(res));
  }

  Future<InvestmentModel> updateInvestment(String id, Map<String, dynamic> body) async {
    final res = await _api.put('/investments/$id', body: body);
    return InvestmentModel.fromJson(_data(res));
  }

  Future<InvestmentModel> updateInvestmentPrice(String id, double price) async {
    final res = await _api.patch('/investments/$id/price', body: {'currentPrice': price});
    return InvestmentModel.fromJson(_data(res));
  }

  Future<List<Map<String, dynamic>>> investmentPriceHistory(String id) async {
    final res = await _api.get('/investments/$id/price-history');
    final data = res['data'];
    if (data is Map && data['history'] is List) {
      return (data['history'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    if (data is List) {
      return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return [];
  }

  Future<void> deleteInvestment(String id) => _api.delete('/investments/$id');

  // Calendar
  Future<List<CalendarEventModel>> calendarEvents() async {
    final res = await _api.get('/calendar-events');
    return _list(res, CalendarEventModel.fromJson);
  }

  Future<CalendarEventModel> createEvent(Map<String, dynamic> body) async {
    final res = await _api.post('/calendar-events', body: body);
    return CalendarEventModel.fromJson(_data(res));
  }

  Future<CalendarEventModel> updateEvent(String id, Map<String, dynamic> body) async {
    final res = await _api.put('/calendar-events/$id', body: body);
    return CalendarEventModel.fromJson(_data(res));
  }

  Future<void> deleteEvent(String id) => _api.delete('/calendar-events/$id');
}

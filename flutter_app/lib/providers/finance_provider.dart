import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../models/account_model.dart';
import '../models/dashboard_model.dart';
import '../models/transaction_model.dart';
import '../services/finance_service.dart';

class FinanceProvider extends ChangeNotifier {
  FinanceProvider() {
    _finance = FinanceService(_api);
  }

  final ApiClient _api = ApiClient.instance;
  late final FinanceService _finance;

  DashboardModel? _dashboard;
  List<MonthlyTrendPoint> _trend = [];
  List<AccountModel> _accounts = [];
  List<TransactionModel> _transactions = [];
  bool _loading = false;
  String? _error;

  DashboardModel? get dashboard => _dashboard;
  List<MonthlyTrendPoint> get trend => _trend;
  List<AccountModel> get accounts => _accounts;
  List<TransactionModel> get transactions => _transactions;
  bool get isLoading => _loading;
  String? get error => _error;

  Future<void> loadDashboard() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _dashboard = await _finance.getDashboard();
      _trend = await _finance.getMonthlyTrend(months: 6);
      _accounts = _dashboard!.accounts;
    } catch (e) {
      _error = e.toString().replaceFirst('ApiException: ', '');
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> loadAccounts() async {
    _loading = true;
    notifyListeners();
    try {
      _accounts = await _finance.getAccounts();
    } catch (e) {
      _error = e.toString().replaceFirst('ApiException: ', '');
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> loadTransactions({String? type}) async {
    _loading = true;
    notifyListeners();
    try {
      _transactions = await _finance.getTransactions(limit: 50, type: type);
    } catch (e) {
      _error = e.toString().replaceFirst('ApiException: ', '');
    }
    _loading = false;
    notifyListeners();
  }

  Future<bool> addAccount({required String name, required String type, double balance = 0, String currency = 'USD'}) async {
    try {
      await _finance.createAccount(name: name, type: type, balance: balance, currency: currency);
      await loadAccounts();
      await loadDashboard();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> addTransaction({
    required String accountId,
    required String type,
    required double amount,
    required String category,
    String? description,
  }) async {
    try {
      await _finance.createTransaction(
        accountId: accountId,
        type: type,
        amount: amount,
        category: category,
        description: description,
      );
      await loadTransactions();
      await loadDashboard();
      return true;
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> deleteTransaction(String id) async {
    await _finance.deleteTransaction(id);
    await loadTransactions();
    await loadDashboard();
  }
}

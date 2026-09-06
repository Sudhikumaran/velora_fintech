import 'package:flutter/foundation.dart';
import '../core/error_utils.dart';
import '../core/local_cache.dart';
import '../models/account_model.dart';
import '../models/dashboard_model.dart';
import '../models/transaction_model.dart';
import '../models/velora_models.dart';
import '../services/velora_api.dart';

class VeloraProvider extends ChangeNotifier {
  VeloraProvider() {
    hydrateFromCache();
  }

  final VeloraApi _api = VeloraApi();

  bool loading = false;
  bool syncing = false;
  bool hydrated = false;
  String? error;

  DashboardModel? dashboard;
  List<MonthlyTrendPoint> trend = [];
  List<CategorySpend> spending = [];
  List<CashFlowPoint> cashFlow = [];
  List<AccountModel> accounts = [];
  List<TransactionModel> transactions = [];
  List<BudgetModel> budgets = [];
  List<GoalModel> goals = [];
  List<DebtModel> debts = [];
  List<SubscriptionModel> subscriptions = [];
  List<InvestmentModel> investments = [];
  List<CalendarEventModel> events = [];
  Map<String, dynamic> netWorthData = {};
  Map<String, dynamic>? lastExport;

  bool get hasLocalData => dashboard != null || accounts.isNotEmpty;

  Future<void> hydrateFromCache() async {
    try {
      final dash = await LocalCache.get('dashboard');
      if (dash is Map) dashboard = DashboardModel.fromJson(Map<String, dynamic>.from(dash));

      final tr = await LocalCache.get('trend');
      if (tr is List) {
        trend = tr.map((e) => MonthlyTrendPoint.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      }

      final acc = await LocalCache.get('accounts');
      if (acc is List) {
        accounts = acc.map((e) => AccountModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      }

      final txs = await LocalCache.get('transactions');
      if (txs is List) {
        transactions = txs.map((e) => TransactionModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      }

      await _hydrateList('budgets', (m) => BudgetModel.fromJson(m), (v) => budgets = v);
      await _hydrateList('goals', (m) => GoalModel.fromJson(m), (v) => goals = v);
      await _hydrateList('debts', (m) => DebtModel.fromJson(m), (v) => debts = v);
      await _hydrateList('subscriptions', (m) => SubscriptionModel.fromJson(m), (v) => subscriptions = v);
      await _hydrateList('investments', (m) => InvestmentModel.fromJson(m), (v) => investments = v);
      await _hydrateList('events', (m) => CalendarEventModel.fromJson(m), (v) => events = v);

      final spend = await LocalCache.get('spending');
      if (spend is List) {
        spending = spend.map((e) => CategorySpend.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      }

      final nw = await LocalCache.get('netWorth');
      if (nw is Map) netWorthData = Map<String, dynamic>.from(nw);
    } catch (_) {}
    hydrated = true;
    notifyListeners();
  }

  Future<void> _hydrateList<T>(
    String key,
    T Function(Map<String, dynamic>) fromJson,
    void Function(List<T>) assign,
  ) async {
    final raw = await LocalCache.get(key);
    if (raw is List) {
      assign(raw.map((e) => fromJson(Map<String, dynamic>.from(e as Map))).toList());
    }
  }

  Future<void> _persist() async {
    if (dashboard != null) {
      await LocalCache.set('dashboard', {
        'totalBalance': dashboard!.totalBalance,
        'totalAccounts': dashboard!.totalAccounts,
        'monthlyIncome': dashboard!.monthlyIncome,
        'monthlyExpenses': dashboard!.monthlyExpenses,
        'netSavings': dashboard!.netSavings,
        'recentTransactions': dashboard!.recentTransactions.map(_txMap).toList(),
        'accounts': dashboard!.accounts.map(_accMap).toList(),
      });
    }
    await LocalCache.set('trend', trend.map((t) => {'month': t.month, 'income': t.income, 'expense': t.expense}).toList());
    await LocalCache.set('accounts', accounts.map(_accMap).toList());
    await LocalCache.set('transactions', transactions.map(_txMap).toList());
    await LocalCache.set('budgets', budgets.map(_budgetMap).toList());
    await LocalCache.set('goals', goals.map(_goalMap).toList());
    await LocalCache.set('debts', debts.map(_debtMap).toList());
    await LocalCache.set('subscriptions', subscriptions.map(_subMap).toList());
    await LocalCache.set('investments', investments.map(_invMap).toList());
    await LocalCache.set('events', events.map(_eventMap).toList());
    await LocalCache.set('spending', spending.map((s) => {'category': s.category, 'total': s.total}).toList());
    if (netWorthData.isNotEmpty) await LocalCache.set('netWorth', netWorthData);
  }

  Map<String, dynamic> _accMap(AccountModel a) => {
        '_id': a.id,
        'name': a.name,
        'type': a.type,
        'balance': a.balance,
        'currency': a.currency,
        'color': a.color,
        'isArchived': a.isArchived,
        if (a.description != null) 'description': a.description,
        if (a.creditLimit != null) 'creditLimit': a.creditLimit,
      };

  Map<String, dynamic> _txMap(TransactionModel t) => {
        '_id': t.id,
        'type': t.type,
        'amount': t.amount,
        'category': t.category,
        'date': t.date.toIso8601String(),
        if (t.description != null) 'description': t.description,
        if (t.accountId != null) 'account': {'_id': t.accountId, 'name': t.accountName, 'color': t.accountColor},
        if (t.toAccountId != null) 'toAccount': {'_id': t.toAccountId, 'name': t.toAccountName},
        'isArchived': t.isArchived,
      };

  Map<String, dynamic> _budgetMap(BudgetModel b) => {
        '_id': b.id, 'name': b.name, 'category': b.category, 'limit': b.limit, 'spent': b.spent,
        'period': b.period, 'color': b.color, 'alertThreshold': b.alertThreshold,
      };

  Map<String, dynamic> _goalMap(GoalModel g) => {
        '_id': g.id, 'name': g.name, 'targetAmount': g.targetAmount, 'currentAmount': g.currentAmount,
        'color': g.color, 'status': g.status, 'priority': g.priority,
        if (g.category != null) 'category': g.category,
        if (g.deadline != null) 'deadline': g.deadline!.toIso8601String(),
      };

  Map<String, dynamic> _debtMap(DebtModel d) => {
        '_id': d.id, 'type': d.type, 'person': d.person, 'amount': d.amount,
        'remainingAmount': d.remainingAmount, 'status': d.status, 'interestRate': d.interestRate,
        'isEMI': d.isEMI,
        if (d.dueDate != null) 'dueDate': d.dueDate!.toIso8601String(),
        if (d.emiAmount != null) 'emiAmount': d.emiAmount,
        if (d.emiDay != null) 'emiDay': d.emiDay,
        if (d.tenure != null) 'tenure': d.tenure,
      };

  Map<String, dynamic> _subMap(SubscriptionModel s) => {
        '_id': s.id, 'name': s.name, 'amount': s.amount, 'frequency': s.frequency,
        'category': s.category, 'status': s.status, 'color': s.color,
        if (s.nextBillingDate != null) 'nextBillingDate': s.nextBillingDate!.toIso8601String(),
      };

  Map<String, dynamic> _invMap(InvestmentModel i) => {
        '_id': i.id, 'name': i.name, 'type': i.type, 'units': i.units,
        'buyPrice': i.buyPrice, 'color': i.color,
        if (i.currentPrice != null) 'currentPrice': i.currentPrice,
      };

  Map<String, dynamic> _eventMap(CalendarEventModel e) => {
        '_id': e.id, 'title': e.title, 'date': e.date.toIso8601String(),
        'type': e.type, 'color': e.color, 'isRecurring': e.isRecurring,
        if (e.amount != null) 'amount': e.amount,
      };

  Future<void> _run(Future<void> Function() fn, {bool background = false}) async {
    final showSpinner = !background && !hasLocalData;
    if (showSpinner) {
      loading = true;
      error = null;
      notifyListeners();
    } else if (background) {
      syncing = true;
      notifyListeners();
    }
    try {
      await fn();
      await _persist();
    } catch (e) {
      error = errorMessage(e);
    }
    loading = false;
    syncing = false;
    notifyListeners();
  }

  Future<bool> _mutate(Future<void> Function() fn) async {
    error = null;
    try {
      await fn();
      await _persist();
      notifyListeners();
      return true;
    } catch (e) {
      error = errorMessage(e);
      notifyListeners();
      return false;
    }
  }

  Future<void> syncAll() async {
    await loadDashboard(background: true);
    await loadAnalytics(background: true);
  }

  Future<void> loadDashboard({bool background = false}) => _run(() async {
        dashboard = await _api.dashboard();
        trend = await _api.monthlyTrend();
        accounts = dashboard!.accounts;
      }, background: background || hasLocalData);

  Future<void> loadAccounts({bool includeArchived = false, bool background = false}) => _run(() async {
        accounts = await _api.accounts(includeArchived: includeArchived);
      }, background: background || accounts.isNotEmpty);

  Future<void> loadTransactions({
    String? type,
    String? account,
    String? search,
    String? startDate,
    String? endDate,
    bool background = false,
  }) =>
      _run(() async {
        transactions = await _api.transactions(
          type: type,
          account: account,
          search: search,
          startDate: startDate,
          endDate: endDate,
        );
      }, background: background || transactions.isNotEmpty);

  Future<void> loadBudgets({bool background = false}) => _run(() async {
        budgets = await _api.budgets();
      }, background: background || budgets.isNotEmpty);

  Future<void> loadGoals({bool background = false}) => _run(() async {
        goals = await _api.goals();
      }, background: background || goals.isNotEmpty);

  Future<void> loadDebts({bool background = false}) => _run(() async {
        debts = await _api.debts();
      }, background: background || debts.isNotEmpty);

  Future<void> loadSubscriptions({bool background = false}) => _run(() async {
        subscriptions = await _api.subscriptions();
      }, background: background || subscriptions.isNotEmpty);

  Future<void> loadInvestments({bool background = false}) => _run(() async {
        investments = await _api.investments();
      }, background: background || investments.isNotEmpty);

  Future<void> loadAnalytics({String period = 'month', bool background = false}) => _run(() async {
        spending = await _api.spendingByCategory(period: period);
        trend = await _api.monthlyTrend();
        cashFlow = await _api.cashFlow();
        netWorthData = await _api.netWorth();
      }, background: background || spending.isNotEmpty);

  Future<void> loadCalendar({bool background = false}) => _run(() async {
        events = await _api.calendarEvents();
      }, background: background || events.isNotEmpty);

  Future<bool> addAccount(Map<String, dynamic> body) => _mutate(() async {
        await _api.createAccount(body);
        await loadAccounts(background: true);
        await loadDashboard(background: true);
      });

  Future<bool> updateAccount(String id, Map<String, dynamic> body) => _mutate(() async {
        await _api.updateAccount(id, body);
        await loadAccounts(background: true);
        await loadDashboard(background: true);
      });

  Future<bool> archiveAccount(String id) => _mutate(() async {
        await _api.archiveAccount(id);
        await loadAccounts(includeArchived: true, background: true);
        await loadDashboard(background: true);
      });

  Future<bool> removeAccount(String id) => _mutate(() async {
        await _api.deleteAccount(id);
        await loadAccounts(background: true);
        await loadDashboard(background: true);
      });

  Future<bool> saveTransaction(Map<String, dynamic> body, {String? id}) => _mutate(() async {
        if (id == null) {
          await _api.createTransaction(body);
        } else {
          await _api.updateTransaction(id, body);
        }
        await loadTransactions(background: true);
        await loadDashboard(background: true);
        await loadAccounts(background: true);
      });

  Future<bool> archiveTransaction(String id) => _mutate(() async {
        await _api.archiveTransaction(id);
        await loadTransactions(background: true);
        await loadDashboard(background: true);
      });

  Future<bool> removeTransaction(String id) => _mutate(() async {
        await _api.deleteTransaction(id);
        await loadTransactions(background: true);
        await loadDashboard(background: true);
      });

  Future<void> deleteTransaction(String id) async => removeTransaction(id);

  Future<bool> addTransaction({
    required String accountId,
    required String type,
    required double amount,
    required String category,
    String? description,
    String? toAccountId,
    DateTime? date,
  }) =>
      saveTransaction({
        'account': accountId,
        'type': type,
        'amount': amount,
        'category': category,
        if (description != null) 'description': description,
        if (toAccountId != null) 'toAccount': toAccountId,
        'date': (date ?? DateTime.now()).toIso8601String(),
      });

  Future<bool> addBudget(Map<String, dynamic> body) => _mutate(() async {
        await _api.createBudget(body);
        await loadBudgets(background: true);
      });

  Future<bool> updateBudget(String id, Map<String, dynamic> body) => _mutate(() async {
        await _api.updateBudget(id, body);
        await loadBudgets(background: true);
      });

  Future<bool> removeBudget(String id) => _mutate(() async {
        await _api.deleteBudget(id);
        await loadBudgets(background: true);
      });

  Future<bool> addGoal(Map<String, dynamic> body) => _mutate(() async {
        await _api.createGoal(body);
        await loadGoals(background: true);
      });

  Future<bool> updateGoal(String id, Map<String, dynamic> body) => _mutate(() async {
        await _api.updateGoal(id, body);
        await loadGoals(background: true);
      });

  Future<bool> contributeGoal(String id, double amount, {String? note}) => _mutate(() async {
        await _api.addGoalContribution(id, amount, note: note);
        await loadGoals(background: true);
      });

  Future<bool> removeGoal(String id) => _mutate(() async {
        await _api.deleteGoal(id);
        await loadGoals(background: true);
      });

  Future<bool> addDebt(Map<String, dynamic> body) => _mutate(() async {
        await _api.createDebt(body);
        await loadDebts(background: true);
      });

  Future<bool> updateDebt(String id, Map<String, dynamic> body) => _mutate(() async {
        await _api.updateDebt(id, body);
        await loadDebts(background: true);
      });

  Future<bool> repayDebt(String id, double amount, {String? note}) => _mutate(() async {
        await _api.addDebtRepayment(id, amount, note: note);
        await loadDebts(background: true);
      });

  Future<bool> removeDebt(String id) => _mutate(() async {
        await _api.deleteDebt(id);
        await loadDebts(background: true);
      });

  Future<bool> addSubscription(Map<String, dynamic> body) => _mutate(() async {
        await _api.createSubscription(body);
        await loadSubscriptions(background: true);
      });

  Future<bool> updateSubscription(String id, Map<String, dynamic> body) => _mutate(() async {
        await _api.updateSubscription(id, body);
        await loadSubscriptions(background: true);
      });

  Future<bool> toggleSubscription(String id) => _mutate(() async {
        await _api.toggleSubscription(id);
        await loadSubscriptions(background: true);
      });

  Future<bool> removeSubscription(String id) => _mutate(() async {
        await _api.deleteSubscription(id);
        await loadSubscriptions(background: true);
      });

  Future<bool> addInvestment(Map<String, dynamic> body) => _mutate(() async {
        await _api.createInvestment(body);
        await loadInvestments(background: true);
      });

  Future<bool> updateInvestment(String id, Map<String, dynamic> body) => _mutate(() async {
        await _api.updateInvestment(id, body);
        await loadInvestments(background: true);
      });

  Future<bool> updateInvestmentPrice(String id, double price) => _mutate(() async {
        await _api.updateInvestmentPrice(id, price);
        await loadInvestments(background: true);
      });

  Future<bool> removeInvestment(String id) => _mutate(() async {
        await _api.deleteInvestment(id);
        await loadInvestments(background: true);
      });

  Future<bool> addCalendarEvent(Map<String, dynamic> body) => _mutate(() async {
        await _api.createEvent(body);
        await loadCalendar(background: true);
      });

  Future<bool> updateCalendarEvent(String id, Map<String, dynamic> body) => _mutate(() async {
        await _api.updateEvent(id, body);
        await loadCalendar(background: true);
      });

  Future<bool> removeCalendarEvent(String id) => _mutate(() async {
        await _api.deleteEvent(id);
        await loadCalendar(background: true);
      });

  Future<bool> exportAllData() => _mutate(() async {
        lastExport = await _api.exportData();
      });
}

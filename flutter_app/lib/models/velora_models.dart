class BudgetModel {
  BudgetModel({
    required this.id,
    required this.name,
    required this.category,
    required this.limit,
    required this.spent,
    this.period = 'monthly',
    this.color = '#6366f1',
    this.alertThreshold = 80,
    this.startDate,
    this.endDate,
  });
  final String id;
  final String name;
  final String category;
  final double limit;
  final double spent;
  final String period;
  final String color;
  final int alertThreshold;
  final DateTime? startDate;
  final DateTime? endDate;

  double get percent => limit > 0 ? (spent / limit * 100).clamp(0, 999) : 0;

  factory BudgetModel.fromJson(Map<String, dynamic> j) => BudgetModel(
        id: j['_id']?.toString() ?? '',
        name: j['name']?.toString() ?? '',
        category: j['category']?.toString() ?? '',
        limit: (j['limit'] as num?)?.toDouble() ?? 0,
        spent: (j['spent'] as num?)?.toDouble() ?? 0,
        period: j['period']?.toString() ?? 'monthly',
        color: j['color']?.toString() ?? '#6366f1',
        alertThreshold: (j['alertThreshold'] as num?)?.toInt() ?? 80,
        startDate: DateTime.tryParse(j['startDate']?.toString() ?? ''),
        endDate: DateTime.tryParse(j['endDate']?.toString() ?? ''),
      );
}

class GoalModel {
  GoalModel({
    required this.id,
    required this.name,
    required this.targetAmount,
    required this.currentAmount,
    this.deadline,
    this.color = '#6366f1',
    this.status = 'active',
    this.category,
    this.priority = 'medium',
    this.description,
  });
  final String id;
  final String name;
  final double targetAmount;
  final double currentAmount;
  final DateTime? deadline;
  final String color;
  final String status;
  final String? category;
  final String priority;
  final String? description;

  double get progress => targetAmount > 0 ? (currentAmount / targetAmount * 100).clamp(0, 100) : 0;

  factory GoalModel.fromJson(Map<String, dynamic> j) => GoalModel(
        id: j['_id']?.toString() ?? '',
        name: j['name']?.toString() ?? '',
        targetAmount: (j['targetAmount'] as num?)?.toDouble() ?? 0,
        currentAmount: (j['currentAmount'] as num?)?.toDouble() ?? 0,
        deadline: DateTime.tryParse(j['deadline']?.toString() ?? ''),
        color: j['color']?.toString() ?? '#6366f1',
        status: j['status']?.toString() ?? 'active',
        category: j['category']?.toString(),
        priority: j['priority']?.toString() ?? 'medium',
        description: j['description']?.toString(),
      );
}

class DebtModel {
  DebtModel({
    required this.id,
    required this.type,
    required this.person,
    required this.amount,
    required this.remainingAmount,
    this.dueDate,
    this.status = 'pending',
    this.description,
    this.interestRate = 0,
    this.isEMI = false,
    this.emiAmount,
    this.emiDay,
    this.tenure,
  });
  final String id;
  final String type;
  final String person;
  final double amount;
  final double remainingAmount;
  final DateTime? dueDate;
  final String status;
  final String? description;
  final double interestRate;
  final bool isEMI;
  final double? emiAmount;
  final int? emiDay;
  final int? tenure;

  factory DebtModel.fromJson(Map<String, dynamic> j) => DebtModel(
        id: j['_id']?.toString() ?? '',
        type: j['type']?.toString() ?? 'borrowed',
        person: j['person']?.toString() ?? '',
        amount: (j['amount'] as num?)?.toDouble() ?? 0,
        remainingAmount: (j['remainingAmount'] as num?)?.toDouble() ?? (j['amount'] as num?)?.toDouble() ?? 0,
        dueDate: DateTime.tryParse(j['dueDate']?.toString() ?? ''),
        status: j['status']?.toString() ?? 'pending',
        description: j['description']?.toString(),
        interestRate: (j['interestRate'] as num?)?.toDouble() ?? 0,
        isEMI: j['isEMI'] == true,
        emiAmount: (j['emiAmount'] as num?)?.toDouble(),
        emiDay: (j['emiDay'] as num?)?.toInt(),
        tenure: (j['tenure'] as num?)?.toInt(),
      );
}

class SubscriptionModel {
  SubscriptionModel({
    required this.id,
    required this.name,
    required this.amount,
    required this.frequency,
    required this.category,
    this.nextBillingDate,
    this.status = 'active',
    this.color = '#6366f1',
    this.website,
    this.startDate,
  });
  final String id;
  final String name;
  final double amount;
  final String frequency;
  final String category;
  final DateTime? nextBillingDate;
  final String status;
  final String color;
  final String? website;
  final DateTime? startDate;

  factory SubscriptionModel.fromJson(Map<String, dynamic> j) => SubscriptionModel(
        id: j['_id']?.toString() ?? '',
        name: j['name']?.toString() ?? '',
        amount: (j['amount'] as num?)?.toDouble() ?? 0,
        frequency: j['frequency']?.toString() ?? 'monthly',
        category: j['category']?.toString() ?? '',
        nextBillingDate: DateTime.tryParse(j['nextBillingDate']?.toString() ?? ''),
        status: j['status']?.toString() ?? 'active',
        color: j['color']?.toString() ?? '#6366f1',
        website: j['website']?.toString(),
        startDate: DateTime.tryParse(j['startDate']?.toString() ?? ''),
      );
}

class InvestmentModel {
  InvestmentModel({
    required this.id,
    required this.name,
    required this.type,
    required this.units,
    required this.buyPrice,
    this.currentPrice,
    this.color = '#6366f1',
    this.symbol,
    this.platform,
    this.purchaseDate,
  });
  final String id;
  final String name;
  final String type;
  final double units;
  final double buyPrice;
  final double? currentPrice;
  final String color;
  final String? symbol;
  final String? platform;
  final DateTime? purchaseDate;

  double get value => units * (currentPrice ?? buyPrice);
  double get cost => units * buyPrice;
  double get gain => value - cost;

  factory InvestmentModel.fromJson(Map<String, dynamic> j) => InvestmentModel(
        id: j['_id']?.toString() ?? '',
        name: j['name']?.toString() ?? '',
        type: j['type']?.toString() ?? 'stock',
        units: (j['units'] as num?)?.toDouble() ?? 0,
        buyPrice: (j['buyPrice'] as num?)?.toDouble() ?? 0,
        currentPrice: (j['currentPrice'] as num?)?.toDouble(),
        color: j['color']?.toString() ?? '#6366f1',
        symbol: j['symbol']?.toString(),
        platform: j['platform']?.toString(),
        purchaseDate: DateTime.tryParse(j['purchaseDate']?.toString() ?? ''),
      );
}

class CalendarEventModel {
  CalendarEventModel({
    required this.id,
    required this.title,
    required this.date,
    this.type = 'note',
    this.amount,
    this.color = '#6366f1',
    this.description,
    this.isRecurring = false,
  });
  final String id;
  final String title;
  final DateTime date;
  final String type;
  final double? amount;
  final String color;
  final String? description;
  final bool isRecurring;

  factory CalendarEventModel.fromJson(Map<String, dynamic> j) => CalendarEventModel(
        id: j['_id']?.toString() ?? '',
        title: j['title']?.toString() ?? '',
        date: DateTime.tryParse(j['date']?.toString() ?? '') ?? DateTime.now(),
        type: j['type']?.toString() ?? 'note',
        amount: (j['amount'] as num?)?.toDouble(),
        color: j['color']?.toString() ?? '#6366f1',
        description: j['description']?.toString(),
        isRecurring: j['isRecurring'] == true,
      );
}

class CategorySpend {
  CategorySpend({required this.category, required this.total});
  final String category;
  final double total;
  factory CategorySpend.fromJson(Map<String, dynamic> j) => CategorySpend(
        category: j['_id']?.toString() ?? j['category']?.toString() ?? 'Other',
        total: (j['total'] as num?)?.toDouble() ?? 0,
      );
}

class CashFlowPoint {
  CashFlowPoint({required this.label, required this.income, required this.expense});
  final String label;
  final double income;
  final double expense;
  factory CashFlowPoint.fromJson(Map<String, dynamic> j) => CashFlowPoint(
        label: j['monthName']?.toString() ?? j['month']?.toString() ?? j['label']?.toString() ?? '',
        income: (j['income'] as num?)?.toDouble() ?? 0,
        expense: (j['expense'] as num?)?.toDouble() ?? 0,
      );
}

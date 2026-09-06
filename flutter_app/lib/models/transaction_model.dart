class TransactionModel {
  TransactionModel({
    required this.id,
    required this.type,
    required this.amount,
    required this.category,
    required this.date,
    this.description,
    this.notes,
    this.accountId,
    this.accountName,
    this.accountColor,
    this.toAccountId,
    this.toAccountName,
    this.isArchived = false,
  });

  final String id;
  final String type;
  final double amount;
  final String category;
  final DateTime date;
  final String? description;
  final String? notes;
  final String? accountId;
  final String? accountName;
  final String? accountColor;
  final String? toAccountId;
  final String? toAccountName;
  final bool isArchived;

  factory TransactionModel.fromJson(Map<String, dynamic> json) {
    final account = json['account'];
    final toAccount = json['toAccount'];
    String? name;
    String? color;
    String? accountId;
    String? toId;
    String? toName;
    if (account is Map) {
      accountId = account['_id']?.toString();
      name = account['name']?.toString();
      color = account['color']?.toString();
    } else if (account != null) {
      accountId = account.toString();
    }
    if (toAccount is Map) {
      toId = toAccount['_id']?.toString();
      toName = toAccount['name']?.toString();
    } else if (toAccount != null) {
      toId = toAccount.toString();
    }
    return TransactionModel(
      id: json['_id']?.toString() ?? '',
      type: json['type']?.toString() ?? 'expense',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      category: json['category']?.toString() ?? '',
      date: DateTime.tryParse(json['date']?.toString() ?? '') ?? DateTime.now(),
      description: json['description']?.toString(),
      notes: json['notes']?.toString(),
      accountId: accountId,
      accountName: name,
      accountColor: color,
      toAccountId: toId,
      toAccountName: toName,
      isArchived: json['isArchived'] == true,
    );
  }
}

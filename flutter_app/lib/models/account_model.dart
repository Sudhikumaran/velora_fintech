class AccountModel {
  AccountModel({
    required this.id,
    required this.name,
    required this.type,
    required this.balance,
    this.currency = 'USD',
    this.color = '#6366f1',
    this.isArchived = false,
    this.description,
    this.creditLimit,
  });

  final String id;
  final String name;
  final String type;
  final double balance;
  final String currency;
  final String color;
  final bool isArchived;
  final String? description;
  final double? creditLimit;

  factory AccountModel.fromJson(Map<String, dynamic> json) {
    return AccountModel(
      id: json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      type: json['type']?.toString() ?? 'bank',
      balance: (json['balance'] as num?)?.toDouble() ?? 0,
      currency: json['currency']?.toString() ?? 'USD',
      color: json['color']?.toString() ?? '#6366f1',
      isArchived: json['isArchived'] == true,
      description: json['description']?.toString(),
      creditLimit: (json['creditLimit'] as num?)?.toDouble(),
    );
  }
}

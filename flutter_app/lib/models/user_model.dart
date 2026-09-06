class UserModel {
  UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.currency = 'USD',
    this.theme,
    this.avatar,
    this.timezone,
  });

  final String id;
  final String name;
  final String email;
  final String currency;
  final String? theme;
  final String? avatar;
  final String? timezone;

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      currency: json['currency']?.toString() ?? 'USD',
      theme: json['theme']?.toString(),
      avatar: json['avatar']?.toString(),
      timezone: json['timezone']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'currency': currency,
        if (theme != null) 'theme': theme,
        if (avatar != null) 'avatar': avatar,
        if (timezone != null) 'timezone': timezone,
      };
}

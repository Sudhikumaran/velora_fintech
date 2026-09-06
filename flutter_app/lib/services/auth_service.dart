import '../core/api_client.dart';
import '../core/storage.dart';
import '../models/user_model.dart';

class AuthService {
  AuthService(this._api);
  final ApiClient _api;

  Map<String, dynamic> _requireMap(dynamic value, String field) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    throw ApiException('Login response missing "$field".');
  }

  Future<({String token, UserModel user})> login(String email, String password) async {
    final res = await _api.post('/auth/login', body: {
      'email': email.trim().toLowerCase(),
      'password': password,
    });
    final token = res['token']?.toString() ?? '';
    if (token.isEmpty) {
      throw ApiException(res['message']?.toString() ?? 'Login failed — no token returned.');
    }
    final user = UserModel.fromJson(_requireMap(res['user'], 'user'));
    await Storage.saveToken(token);
    await Storage.saveUser(user);
    return (token: token, user: user);
  }

  Future<({String token, UserModel user})> register({
    required String name,
    required String email,
    required String password,
    String currency = 'USD',
  }) async {
    final res = await _api.post('/auth/register', body: {
      'name': name.trim(),
      'email': email.trim().toLowerCase(),
      'password': password,
      'currency': currency,
    });
    final token = res['token']?.toString() ?? '';
    if (token.isEmpty) {
      throw ApiException(res['message']?.toString() ?? 'Registration failed — no token returned.');
    }
    final user = UserModel.fromJson(_requireMap(res['user'], 'user'));
    await Storage.saveToken(token);
    await Storage.saveUser(user);
    return (token: token, user: user);
  }

  Future<UserModel> fetchMe() async {
    final res = await _api.get('/auth/me');
    final data = res['data'];
    final user = UserModel.fromJson(_requireMap(data, 'data'));
    await Storage.saveUser(user);
    return user;
  }

  Future<UserModel> updateProfile(Map<String, dynamic> body) async {
    final res = await _api.put('/auth/profile', body: body);
    final user = UserModel.fromJson(_requireMap(res['data'], 'data'));
    await Storage.saveUser(user);
    return user;
  }

  Future<void> updatePassword({required String currentPassword, required String newPassword}) async {
    await _api.put('/auth/password', body: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
  }

  Future<void> logout() => Storage.clear();
}

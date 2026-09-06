import 'package:flutter/foundation.dart';
import '../core/api_client.dart';
import '../core/error_utils.dart';
import '../core/storage.dart';
import '../models/user_model.dart';
import '../services/auth_service.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider() {
    _auth = AuthService(_api);
  }

  final ApiClient _api = ApiClient.instance;
  late final AuthService _auth;

  UserModel? _user;
  bool _loading = false;
  bool _initialized = false;
  bool _syncingProfile = false;
  String? _error;

  UserModel? get user => _user;
  bool get isLoading => _loading;
  bool get isAuthenticated => _user != null;
  bool get isInitialized => _initialized;
  bool get syncingProfile => _syncingProfile;
  String? get error => _error;

  Future<void> init() async {
    final token = await Storage.getToken();
    if (token == null || token.isEmpty) {
      _initialized = true;
      notifyListeners();
      return;
    }

    // Open instantly with cached profile — no server wait.
    _user = await Storage.getUser();
    _initialized = true;
    notifyListeners();

    _syncingProfile = true;
    notifyListeners();
    try {
      _user = await _auth.fetchMe();
    } catch (_) {
      // Keep cached user if network is slow/offline.
    }
    _syncingProfile = false;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await _auth.login(email, password);
      _user = result.user;
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = errorMessage(e);
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String name,
    required String email,
    required String password,
    String currency = 'USD',
  }) async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      final result = await _auth.register(
        name: name,
        email: email,
        password: password,
        currency: currency,
      );
      _user = result.user;
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = errorMessage(e);
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _auth.logout();
    _user = null;
    notifyListeners();
  }

  Future<bool> updateProfile({required String name, required String currency, String? timezone}) async {
    _error = null;
    try {
      _user = await _auth.updateProfile({
        'name': name.trim(),
        'currency': currency,
        if (timezone != null) 'timezone': timezone,
      });
      notifyListeners();
      return true;
    } catch (e) {
      _error = errorMessage(e);
      notifyListeners();
      return false;
    }
  }

  Future<bool> updatePassword({required String currentPassword, required String newPassword}) async {
    _error = null;
    try {
      await _auth.updatePassword(currentPassword: currentPassword, newPassword: newPassword);
      notifyListeners();
      return true;
    } catch (e) {
      _error = errorMessage(e);
      notifyListeners();
      return false;
    }
  }
}

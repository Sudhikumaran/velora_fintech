import 'package:dio/dio.dart';
import '../config/api_config.dart';
import 'storage.dart';

class ApiException implements Exception {
  ApiException(this.message, [this.statusCode]);
  final String message;
  final int? statusCode;
  @override
  String toString() => message;
}

class ApiClient {
  ApiClient._() {
    _dio = _buildDio();
  }

  static final ApiClient instance = ApiClient._();
  factory ApiClient() => instance;

  late Dio _dio;
  Dio get dio => _dio;

  void refreshBaseUrl() {
    _dio = _buildDio();
  }

  Dio _buildDio() {
    final dio = Dio(BaseOptions(
      baseUrl: ApiConfig.apiBase,
      connectTimeout: const Duration(seconds: 90),
      receiveTimeout: const Duration(seconds: 90),
      sendTimeout: const Duration(seconds: 90),
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
      validateStatus: (status) => status != null && status >= 200 && status < 300,
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await Storage.getToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        final req = error.requestOptions;
        final retries = req.extra['retries'] as int? ?? 0;
        final isRetryable = error.type == DioExceptionType.connectionError ||
            error.type == DioExceptionType.connectionTimeout ||
            error.type == DioExceptionType.receiveTimeout;

        if (isRetryable && retries < 3) {
          req.extra['retries'] = retries + 1;
          await Future<void>.delayed(Duration(seconds: 2 + retries * 4));
          try {
            final response = await dio.fetch(req);
            return handler.resolve(response);
          } catch (_) {}
        }

        handler.reject(DioException(
          requestOptions: error.requestOptions,
          response: error.response,
          type: error.type,
          error: ApiException(_extractMessage(error), error.response?.statusCode),
        ));
      },
    ));

    return dio;
  }

  String _extractMessage(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] != null) {
      return data['message'].toString();
    }
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return 'Server is waking up (Render). Wait 30–60s and try again.';
    }
    if (error.type == DioExceptionType.connectionError) {
      return 'Cannot reach ${ApiConfig.baseUrl}. Check internet, then retry.';
    }
    if (error.response?.statusCode == 401) {
      return 'Invalid email or password.';
    }
    return error.message ?? 'Something went wrong';
  }

  Map<String, dynamic> _asMap(dynamic data, String path) {
    if (data is Map<String, dynamic>) return data;
    if (data is Map) return Map<String, dynamic>.from(data);
    throw ApiException('Unexpected response from $path. Is the API URL correct?');
  }

  Future<bool> checkHealth() async {
    try {
      final res = await _dio.get(
        '/health',
        options: Options(
          receiveTimeout: const Duration(seconds: 120),
          sendTimeout: const Duration(seconds: 120),
          extra: {'retries': 0},
        ),
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Pings Render until awake (free tier can take 30–90s).
  Future<bool> wakeServer({
    int attempts = 8,
    Duration delay = const Duration(seconds: 8),
    void Function(int attempt, int total)? onAttempt,
  }) async {
    for (var i = 1; i <= attempts; i++) {
      onAttempt?.call(i, attempts);
      if (await checkHealth()) return true;
      if (i < attempts) await Future<void>.delayed(delay);
    }
    return false;
  }

  Future<Map<String, dynamic>> get(String path, {Map<String, dynamic>? query}) async {
    final res = await _dio.get(path, queryParameters: query);
    return _asMap(res.data, path);
  }

  Future<Map<String, dynamic>> post(String path, {Map<String, dynamic>? body}) async {
    final res = await _dio.post(path, data: body);
    return _asMap(res.data, path);
  }

  Future<Map<String, dynamic>> put(String path, {Map<String, dynamic>? body}) async {
    final res = await _dio.put(path, data: body);
    return _asMap(res.data, path);
  }

  Future<Map<String, dynamic>> patch(String path, {Map<String, dynamic>? body}) async {
    final res = await _dio.patch(path, data: body);
    return _asMap(res.data, path);
  }

  Future<Map<String, dynamic>> delete(String path) async {
    final res = await _dio.delete(path);
    if (res.data == null) return {'success': true};
    return _asMap(res.data, path);
  }
}

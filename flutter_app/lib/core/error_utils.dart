import 'package:dio/dio.dart';
import 'api_client.dart';

String errorMessage(Object error) {
  if (error is DioException) {
    if (error.error is ApiException) {
      return (error.error as ApiException).message;
    }
    if (error.type == DioExceptionType.connectionError) {
      return 'Cannot reach the server. Check internet, then tap Retry. '
          'Free servers (Render) may take up to a minute to wake up.';
    }
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return 'Request timed out. The server may be starting — wait a moment and try again.';
    }
    return error.message ?? 'Network error';
  }
  if (error is ApiException) return error.message;
  final s = error.toString();
  if (s.startsWith('ApiException: ')) return s.substring(14);
  if (s.contains('DioException')) return 'Network error. Please try again.';
  return s;
}

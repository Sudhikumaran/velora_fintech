import 'package:flutter_test/flutter_test.dart';
import 'package:velora/config/api_config.dart';

void main() {
  test('API config has default base URL', () {
    expect(ApiConfig.baseUrl, isNotEmpty);
    expect(ApiConfig.apiBase, endsWith('/api'));
  });
}

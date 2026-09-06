import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../models/transaction_model.dart';
import '../providers/auth_provider.dart';
import '../providers/velora_provider.dart';
import '../screens/add_transaction_screen.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/home_shell.dart';
import '../screens/splash_screen.dart';
import '../theme/app_theme.dart';
import '../theme/app_colors.dart';

GoRouter createRouter(AuthProvider auth) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: auth,
    redirect: (context, state) {
      final loc = state.matchedLocation;

      if (!auth.isInitialized) {
        return loc == '/loading' ? null : '/loading';
      }

      final loggingIn = loc == '/login' || loc == '/register';
      if (!auth.isAuthenticated && !loggingIn) return '/login';
      if (auth.isAuthenticated && (loggingIn || loc == '/loading')) return '/';
      return null;
    },
    routes: [
      GoRoute(
        path: '/loading',
        builder: (_, __) => const SplashScreen(),
      ),
      GoRoute(path: '/', builder: (_, __) => const HomeShell()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      GoRoute(
        path: '/add-transaction',
        builder: (_, state) {
          final extra = state.extra;
          if (extra is TransactionModel) return AddTransactionScreen(existing: extra);
          if (extra is String) return AddTransactionScreen(initialType: extra);
          return const AddTransactionScreen();
        },
      ),
    ],
  );
}

class VeloraApp extends StatefulWidget {
  const VeloraApp({super.key});

  @override
  State<VeloraApp> createState() => _VeloraAppState();
}

class _VeloraAppState extends State<VeloraApp> {
  late final AuthProvider _auth;
  late final VeloraProvider _finance;
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _auth = AuthProvider()..init();
    _finance = VeloraProvider();
    _router = createRouter(_auth);
  }

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: _auth),
        ChangeNotifierProvider.value(value: _finance),
      ],
      child: MaterialApp.router(
        title: 'Velora',
        theme: AppTheme.light,
        routerConfig: _router,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}

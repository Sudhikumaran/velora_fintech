import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/velora_provider.dart';
import '../theme/app_colors.dart';
import 'accounts_screen.dart';
import 'dashboard_screen.dart';
import 'features/all_features.dart';
import 'settings_screen.dart';
import 'transactions_screen.dart';
import '../widgets/sync_chip.dart';
import '../widgets/gradient_scaffold.dart';
import '../widgets/velora_logo.dart';

enum AppSection {
  dashboard('Dashboard', Icons.dashboard_rounded, AppColors.primaryGradient),
  analytics('Analytics', Icons.insights_rounded, AppColors.coolGradient),
  calendar('Calendar', Icons.calendar_month_rounded, AppColors.warmGradient),
  accounts('Accounts', Icons.account_balance_wallet_rounded, AppColors.coolGradient),
  transactions('Transactions', Icons.swap_horiz_rounded, AppColors.primaryGradient),
  income('Income', Icons.payments_rounded, AppColors.successGradient),
  budgets('Budgets', Icons.track_changes_rounded, AppColors.warmGradient),
  goals('Goals', Icons.flag_rounded, AppColors.successGradient),
  debts('Debts', Icons.trending_down_rounded, [AppColors.rose, AppColors.pink]),
  investments('Investments', Icons.show_chart_rounded, AppColors.coolGradient),
  subscriptions('Subscriptions', Icons.autorenew_rounded, AppColors.primaryGradient),
  settings('Settings', Icons.settings_rounded, [AppColors.slate800, AppColors.indigo]);

  const AppSection(this.label, this.icon, this.gradient);
  final String label;
  final IconData icon;
  final List<Color> gradient;

  Widget buildScreen() => switch (this) {
        AppSection.dashboard => const DashboardScreen(),
        AppSection.analytics => const AnalyticsScreen(),
        AppSection.calendar => const CalendarScreen(),
        AppSection.accounts => const AccountsScreen(),
        AppSection.transactions => const TransactionsScreen(),
        AppSection.income => const IncomeScreen(),
        AppSection.budgets => const BudgetsScreen(),
        AppSection.goals => const GoalsScreen(),
        AppSection.debts => const DebtsScreen(),
        AppSection.investments => const InvestmentsScreen(),
        AppSection.subscriptions => const SubscriptionsScreen(),
        AppSection.settings => const SettingsScreen(),
      };
}

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  AppSection _section = AppSection.dashboard;
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VeloraProvider>().syncAll();
    });
  }

  static const _bottomTabs = [
    AppSection.dashboard,
    AppSection.accounts,
    AppSection.transactions,
    AppSection.settings,
  ];

  int get _bottomIndex {
    final i = _bottomTabs.indexOf(_section);
    return i >= 0 ? i : 0;
  }

  void _select(AppSection s, {bool closeDrawer = false}) {
    setState(() => _section = s);
    if (closeDrawer && (_scaffoldKey.currentState?.isDrawerOpen ?? false)) {
      Navigator.of(context).pop();
    }
  }

  void _showQuickAdd(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Text('Quick add', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            ),
            ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0x2222C55E),
                child: Icon(Icons.add, color: AppColors.green),
              ),
              title: const Text('Income'),
              onTap: () {
                Navigator.pop(ctx);
                context.push('/add-transaction', extra: 'income');
              },
            ),
            ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0x22F43F5E),
                child: Icon(Icons.remove, color: AppColors.rose),
              ),
              title: const Text('Expense'),
              onTap: () {
                Navigator.pop(ctx);
                context.push('/add-transaction', extra: 'expense');
              },
            ),
            ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0x226366F1),
                child: Icon(Icons.swap_horiz, color: AppColors.indigo),
              ),
              title: const Text('Transfer'),
              onTap: () {
                Navigator.pop(ctx);
                context.push('/add-transaction', extra: 'transfer');
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 900;
    final showBottom = !wide;
    final finance = context.watch<VeloraProvider>();

    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: AppColors.slate50,
      drawer: wide
          ? null
          : Drawer(
              child: _NavDrawer(
                section: _section,
                onSelect: (s) => _select(s, closeDrawer: true),
              ),
            ),
      body: Row(
        children: [
          if (wide)
            SizedBox(
              width: 260,
              child: _NavDrawer(section: _section, onSelect: _select, embedded: true),
            ),
          Expanded(
            child: GradientScaffold(
              colors: _section.gradient,
              appBar: AppBar(
                backgroundColor: Colors.transparent,
                elevation: 0,
                leading: wide
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.menu_rounded, color: Colors.white),
                        onPressed: () => _scaffoldKey.currentState?.openDrawer(),
                      ),
                automaticallyImplyLeading: !wide,
                title: _section == AppSection.dashboard
                    ? const VeloraLogo(size: 34, showLabel: true, light: true)
                    : Text(
                        _section.label,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
                      ),
                actions: [
                  SyncChip(syncing: finance.syncing),
                  IconButton(
                    tooltip: 'Quick add',
                    icon: const Icon(Icons.add_circle_outline, color: Colors.white),
                    onPressed: () => _showQuickAdd(context),
                  ),
                ],
              ),
              body: SafeArea(
                top: false,
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 250),
                  child: KeyedSubtree(
                    key: ValueKey(_section),
                    child: _section.buildScreen(),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: showBottom
          ? NavigationBar(
              selectedIndex: _bottomTabs.contains(_section) ? _bottomIndex : 0,
              onDestinationSelected: (i) => _select(_bottomTabs[i]),
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.dashboard_outlined),
                  selectedIcon: Icon(Icons.dashboard_rounded),
                  label: 'Home',
                ),
                NavigationDestination(
                  icon: Icon(Icons.account_balance_wallet_outlined),
                  selectedIcon: Icon(Icons.account_balance_wallet_rounded),
                  label: 'Accounts',
                ),
                NavigationDestination(
                  icon: Icon(Icons.swap_horiz),
                  selectedIcon: Icon(Icons.swap_horiz_rounded),
                  label: 'Txns',
                ),
                NavigationDestination(
                  icon: Icon(Icons.settings_outlined),
                  selectedIcon: Icon(Icons.settings_rounded),
                  label: 'Settings',
                ),
              ],
            )
          : null,
    );
  }
}

class _NavDrawer extends StatelessWidget {
  const _NavDrawer({required this.section, required this.onSelect, this.embedded = false});
  final AppSection section;
  final ValueChanged<AppSection> onSelect;
  final bool embedded;

  static const _groups = [
    ('Overview', [AppSection.dashboard, AppSection.analytics, AppSection.calendar]),
    ('Money', [AppSection.accounts, AppSection.transactions, AppSection.income]),
    ('Planning', [AppSection.budgets, AppSection.goals, AppSection.debts]),
    ('Portfolio', [AppSection.investments, AppSection.subscriptions]),
  ];

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          if (!embedded) const Padding(padding: EdgeInsets.all(20), child: VeloraLogo(size: 40)),
          ..._groups.expand((g) => [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 10, 20, 4),
                  child: Text(
                    g.$1.toUpperCase(),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: Colors.grey.shade500,
                      letterSpacing: 1,
                    ),
                  ),
                ),
                ...g.$2.map(
                  (s) => _NavTile(
                    section: s,
                    selected: section == s,
                    onTap: () => onSelect(s),
                  ),
                ),
              ]),
          const Divider(),
          _NavTile(
            section: AppSection.settings,
            selected: section == AppSection.settings,
            onTap: () => onSelect(AppSection.settings),
          ),
        ],
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  const _NavTile({required this.section, required this.selected, required this.onTap});
  final AppSection section;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: section.gradient),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(section.icon, color: Colors.white, size: 18),
      ),
      title: Text(
        section.label,
        style: TextStyle(
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
          color: selected ? AppColors.indigo : null,
        ),
      ),
      selected: selected,
      selectedTileColor: AppColors.indigo.withValues(alpha: 0.08),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      onTap: onTap,
    );
  }
}

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/velora_provider.dart';
import '../theme/app_colors.dart';
import '../utils/formatters.dart';
import '../widgets/glass_card.dart';
import '../widgets/stat_card.dart';
import '../widgets/transaction_tile.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final p = context.read<VeloraProvider>();
      p.loadDashboard(background: p.hasLocalData);
      if (p.spending.isEmpty) p.loadAnalytics(background: p.hasLocalData);
    });
  }

  Future<void> _refresh() async {
    final p = context.read<VeloraProvider>();
    await p.loadDashboard();
    await p.loadAnalytics();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final p = context.watch<VeloraProvider>();
    final currency = user?.currency ?? 'USD';

    if (p.loading && p.dashboard == null) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          _shimmer(height: 28, width: 200),
          const SizedBox(height: 20),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.25,
            children: List.generate(4, (_) => _shimmer(height: 100)),
          ),
        ],
      );
    }

    final d = p.dashboard;
    if (d == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_off_outlined, color: Colors.white, size: 48),
              const SizedBox(height: 12),
              Text(p.error ?? 'Pull down to refresh', style: const TextStyle(color: Colors.white)),
            ],
          ),
        ),
      );
    }

    final nw = p.netWorthData;
    final topSpend = p.spending.take(3).toList();

    return RefreshIndicator(
      onRefresh: _refresh,
      color: AppColors.indigo,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        children: [
          Text(
            '${greeting()}, ${user?.name.split(' ').first ?? 'there'} 👋',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.white),
          ),
          const SizedBox(height: 4),
          Text('Your finance snapshot',
              style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 13)),
          const SizedBox(height: 20),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 12,
            crossAxisSpacing: 12,
            childAspectRatio: 1.25,
            children: [
              StatCard(
                  title: 'Balance',
                  value: formatCurrency(d.totalBalance, currency),
                  subtitle: '${d.totalAccounts} accounts',
                  color: AppColors.indigo,
                  icon: Icons.wallet_rounded),
              StatCard(
                  title: 'Income',
                  value: formatCurrency(d.monthlyIncome, currency),
                  subtitle: 'This month',
                  color: AppColors.green,
                  icon: Icons.trending_up_rounded),
              StatCard(
                  title: 'Expenses',
                  value: formatCurrency(d.monthlyExpenses, currency),
                  subtitle: 'This month',
                  color: AppColors.rose,
                  icon: Icons.trending_down_rounded),
              StatCard(
                  title: 'Savings',
                  value: formatCurrency(d.netSavings, currency),
                  subtitle: 'Net',
                  color: d.netSavings >= 0 ? AppColors.emerald : AppColors.orange,
                  icon: Icons.savings_rounded),
            ],
          ),
          if (nw.isNotEmpty) ...[
            const SizedBox(height: 16),
            GlassCard(
              child: Row(
                children: [
                  const Icon(Icons.account_balance, color: AppColors.indigo),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Net worth', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                        Text(
                          formatCurrency((nw['netWorth'] as num?)?.toDouble() ?? 0, currency),
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (p.trend.isNotEmpty) ...[
            const SizedBox(height: 16),
            GlassCard(
              child: SizedBox(
                height: 200,
                child: LineChart(
                  LineChartData(
                    gridData: const FlGridData(show: false),
                    titlesData: const FlTitlesData(
                      leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    ),
                    borderData: FlBorderData(show: false),
                    lineBarsData: [
                      LineChartBarData(
                        spots: p.trend.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value.income)).toList(),
                        isCurved: true,
                        color: AppColors.green,
                        barWidth: 3,
                        dotData: const FlDotData(show: false),
                        belowBarData: BarAreaData(show: true, color: AppColors.green.withValues(alpha: 0.15)),
                      ),
                      LineChartBarData(
                        spots: p.trend.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value.expense)).toList(),
                        isCurved: true,
                        color: AppColors.pink,
                        barWidth: 3,
                        dotData: const FlDotData(show: false),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
          if (topSpend.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text('Top spending',
                style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Colors.white)),
            const SizedBox(height: 8),
            GlassCard(
              child: Column(
                children: topSpend
                    .map(
                      (s) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 6),
                        child: Row(
                          children: [
                            Expanded(child: Text(s.category, style: const TextStyle(fontWeight: FontWeight.w600))),
                            Text(formatCurrency(s.total, currency),
                                style: const TextStyle(fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),
          ],
          const SizedBox(height: 16),
          const Text('Recent activity',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Colors.white)),
          const SizedBox(height: 8),
          GlassCard(
            child: d.recentTransactions.isEmpty
                ? const Padding(padding: EdgeInsets.all(20), child: Center(child: Text('No transactions yet')))
                : Column(children: d.recentTransactions.map((t) => TransactionTile(tx: t, currency: currency)).toList()),
          ),
        ],
      ),
    );
  }

  Widget _shimmer({required double height, double? width}) {
    return Container(
      height: height,
      width: width,
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(16),
      ),
    );
  }
}

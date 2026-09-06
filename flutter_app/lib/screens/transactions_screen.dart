import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../models/transaction_model.dart';
import '../providers/auth_provider.dart';
import '../providers/velora_provider.dart';
import '../screens/add_transaction_screen.dart';
import '../theme/app_colors.dart';
import '../widgets/feature_ui.dart';
import '../widgets/transaction_tile.dart';

class TransactionsScreen extends StatefulWidget {
  const TransactionsScreen({super.key});

  @override
  State<TransactionsScreen> createState() => _TransactionsScreenState();
}

class _TransactionsScreenState extends State<TransactionsScreen> {
  String? _filterType;
  String? _accountId;
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final p = context.read<VeloraProvider>();
      if (p.accounts.isEmpty) await p.loadAccounts();
      _load();
    });
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _load() {
    context.read<VeloraProvider>().loadTransactions(
          type: _filterType,
          account: _accountId,
          search: _search.text.trim().isEmpty ? null : _search.text.trim(),
        );
  }

  Future<void> _openEditor({TransactionModel? existing, String? type}) async {
    if (existing != null) {
      await Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => AddTransactionScreen(existing: existing)),
      );
    } else {
      await context.push('/add-transaction', extra: type);
    }
    _load();
  }

  Future<bool> _confirmDelete() async {
    return await showDialog<bool>(
          context: context,
          builder: (c) => AlertDialog(
            title: const Text('Delete transaction?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel')),
              FilledButton(onPressed: () => Navigator.pop(c, true), child: const Text('Delete')),
            ],
          ),
        ) ??
        false;
  }

  @override
  Widget build(BuildContext context) {
    final currency = context.watch<AuthProvider>().user?.currency ?? 'USD';
    final finance = context.watch<VeloraProvider>();
    final accounts = finance.accounts.where((a) => !a.isArchived).toList();

    return Scaffold(
      floatingActionButton: GradientFab(
        heroTag: 'fab_transactions',
        onPressed: () => _openEditor(),
        label: 'Add',
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: TextField(
              controller: _search,
              decoration: InputDecoration(
                hintText: 'Search transactions',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _search.text.isEmpty
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _search.clear();
                          setState(() {});
                          _load();
                        },
                      ),
              ),
              onSubmitted: (_) => _load(),
              onChanged: (_) => setState(() {}),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: Row(
              children: [
                for (final f in [
                  (null, 'All'),
                  ('income', 'Income'),
                  ('expense', 'Expense'),
                  ('transfer', 'Transfer'),
                ]) ...[
                  FilterChip(
                    label: Text(f.$2),
                    selected: _filterType == f.$1,
                    onSelected: (_) => setState(() {
                      _filterType = f.$1;
                      _load();
                    }),
                  ),
                  const SizedBox(width: 8),
                ],
              ],
            ),
          ),
          if (accounts.isNotEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: DropdownButtonFormField<String?>(
                value: _accountId,
                decoration: const InputDecoration(labelText: 'Account', isDense: true),
                items: [
                  const DropdownMenuItem(value: null, child: Text('All accounts')),
                  ...accounts.map((a) => DropdownMenuItem(value: a.id, child: Text(a.name))),
                ],
                onChanged: (v) => setState(() {
                  _accountId = v;
                  _load();
                }),
              ),
            ),
          Expanded(
            child: finance.loading && finance.transactions.isEmpty
                ? const Center(child: CircularProgressIndicator(color: AppColors.indigo))
                : RefreshIndicator(
                    onRefresh: () async => _load(),
                    child: finance.transactions.isEmpty
                        ? ListView(
                            children: const [
                              SizedBox(height: 100),
                              Center(child: Text('No transactions')),
                            ],
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            itemCount: finance.transactions.length,
                            itemBuilder: (_, i) {
                              final tx = finance.transactions[i];
                              return Dismissible(
                                key: ValueKey(tx.id),
                                direction: DismissDirection.endToStart,
                                background: Container(
                                  alignment: Alignment.centerRight,
                                  padding: const EdgeInsets.only(right: 20),
                                  color: AppColors.red,
                                  child: const Icon(Icons.delete, color: Colors.white),
                                ),
                                confirmDismiss: (_) => _confirmDelete(),
                                onDismissed: (_) async {
                                  final p = context.read<VeloraProvider>();
                                  final ok = await p.removeTransaction(tx.id);
                                  if (!ok && mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(p.error ?? 'Failed to delete')),
                                    );
                                  }
                                },
                                child: Card(
                                  margin: const EdgeInsets.only(bottom: 8),
                                  child: InkWell(
                                    onTap: () => _openEditor(existing: tx),
                                    onLongPress: () async {
                                      final p = context.read<VeloraProvider>();
                                      final ok = await p.archiveTransaction(tx.id);
                                      if (!mounted) return;
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text(
                                            ok ? 'Archived' : (p.error ?? 'Failed to archive'),
                                          ),
                                        ),
                                      );
                                      _load();
                                    },
                                    child: TransactionTile(tx: tx, currency: currency),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
          ),
        ],
      ),
    );
  }
}

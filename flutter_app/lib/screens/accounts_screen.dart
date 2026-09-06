import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/account_model.dart';
import '../providers/auth_provider.dart';
import '../providers/velora_provider.dart';
import '../theme/app_colors.dart';
import '../utils/color_utils.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../widgets/feature_ui.dart';
import '../widgets/glass_card.dart';

class AccountsScreen extends StatefulWidget {
  const AccountsScreen({super.key});

  @override
  State<AccountsScreen> createState() => _AccountsScreenState();
}

class _AccountsScreenState extends State<AccountsScreen> {
  bool _includeArchived = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VeloraProvider>().loadAccounts();
    });
  }

  Future<bool> _confirm(String title) async {
    return await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(title),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
              FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Confirm')),
            ],
          ),
        ) ??
        false;
  }

  void _sheet({AccountModel? existing}) {
    final nameCtrl = TextEditingController(text: existing?.name ?? '');
    final balanceCtrl = TextEditingController(text: existing != null ? existing.balance.toString() : '0');
    final descCtrl = TextEditingController(text: existing?.description ?? '');
    final creditCtrl = TextEditingController(text: existing?.creditLimit?.toString() ?? '');
    var type = existing?.type ?? 'bank';
    if (!accountTypes.any((t) => t.$1 == type)) type = 'bank';
    var color = existing?.color ?? paletteColors.first;
    final currency = context.read<AuthProvider>().user?.currency ?? 'USD';
    final isEdit = existing != null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: StatefulBuilder(
          builder: (ctx, setModalState) => SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(isEdit ? 'Edit account' : 'Add account',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Account name')),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: type,
                  decoration: const InputDecoration(labelText: 'Type'),
                  items: accountTypes.map((t) => DropdownMenuItem(value: t.$1, child: Text(t.$2))).toList(),
                  onChanged: (v) => setModalState(() => type = v ?? 'bank'),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: balanceCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: isEdit ? 'Balance ($currency)' : 'Opening balance ($currency)',
                  ),
                ),
                const SizedBox(height: 12),
                TextField(controller: descCtrl, decoration: const InputDecoration(labelText: 'Description')),
                if (type == 'credit') ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: creditCtrl,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Credit limit'),
                  ),
                ],
                const SizedBox(height: 12),
                const Text('Color', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: paletteColors.map((hex) {
                    final c = parseHexColor(hex);
                    final active = color.toLowerCase() == hex.toLowerCase();
                    return GestureDetector(
                      onTap: () => setModalState(() => color = hex),
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: c,
                          shape: BoxShape.circle,
                          border: Border.all(color: active ? Colors.black87 : Colors.transparent, width: 2.5),
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: () async {
                    final finance = context.read<VeloraProvider>();
                    final body = <String, dynamic>{
                      'name': nameCtrl.text.trim(),
                      'type': type,
                      'balance': double.tryParse(balanceCtrl.text) ?? 0,
                      'currency': currency,
                      'color': color,
                      if (descCtrl.text.trim().isNotEmpty) 'description': descCtrl.text.trim(),
                      if (type == 'credit') 'creditLimit': double.tryParse(creditCtrl.text),
                    };
                    final ok = isEdit
                        ? await finance.updateAccount(existing.id, body)
                        : await finance.addAccount(body);
                    if (ctx.mounted) Navigator.pop(ctx);
                    if (!mounted) return;
                    if (ok) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(isEdit ? 'Account updated' : 'Account added')),
                      );
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(finance.error ?? 'Failed to save account')),
                      );
                    }
                  },
                  child: Text(isEdit ? 'Save' : 'Create'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final currency = context.watch<AuthProvider>().user?.currency ?? 'USD';
    final finance = context.watch<VeloraProvider>();
    final total = finance.accounts.where((a) => !a.isArchived).fold<double>(0, (s, a) => s + a.balance);

    return Scaffold(
      floatingActionButton: GradientFab(heroTag: 'fab_accounts', onPressed: () => _sheet(), label: 'Add'),
      body: finance.loading && finance.accounts.isEmpty
          ? const Center(child: CircularProgressIndicator(color: AppColors.indigo))
          : RefreshIndicator(
              onRefresh: () => finance.loadAccounts(includeArchived: _includeArchived),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  GlassCard(
                    child: Row(
                      children: [
                        const Icon(Icons.account_balance_wallet, color: AppColors.indigo, size: 28),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Total balance', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                            Text(
                              formatCurrency(total, currency),
                              style: const TextStyle(
                                  fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.indigo),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Show archived'),
                    value: _includeArchived,
                    onChanged: (v) async {
                      setState(() => _includeArchived = v);
                      await context.read<VeloraProvider>().loadAccounts(includeArchived: v);
                    },
                  ),
                  if (finance.accounts.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(top: 48),
                      child: Center(child: Text('No accounts yet.\nTap Add to create one.', textAlign: TextAlign.center)),
                    )
                  else
                    ...finance.accounts.map((account) {
                      final color = parseHexColor(account.color);
                      return GlassCard(
                        onTap: () => _sheet(existing: account),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: color.withValues(alpha: 0.15),
                              child: Icon(Icons.account_balance, color: color),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(account.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                                  Text(
                                    '${account.type.toUpperCase()}${account.isArchived ? ' · archived' : ''}'
                                    '${account.description != null ? ' · ${account.description}' : ''}',
                                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                  ),
                                  if (account.type == 'credit' && account.creditLimit != null)
                                    Text(
                                      'Limit ${formatCurrency(account.creditLimit!, currency)}',
                                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                                    ),
                                ],
                              ),
                            ),
                            Text(
                              formatCurrency(account.balance, currency),
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            PopupMenuButton<String>(
                              onSelected: (action) async {
                                final p = context.read<VeloraProvider>();
                                if (action == 'archive') {
                                  if (!await _confirm('Archive ${account.name}?')) return;
                                  final ok = await p.archiveAccount(account.id);
                                  if (!mounted) return;
                                  if (!ok) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(p.error ?? 'Failed to archive')),
                                    );
                                  }
                                } else if (action == 'delete') {
                                  if (!await _confirm('Delete ${account.name}?')) return;
                                  final ok = await p.removeAccount(account.id);
                                  if (!mounted) return;
                                  if (!ok) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(p.error ?? 'Failed to delete')),
                                    );
                                  }
                                }
                              },
                              itemBuilder: (_) => [
                                if (!account.isArchived)
                                  const PopupMenuItem(value: 'archive', child: Text('Archive')),
                                const PopupMenuItem(value: 'delete', child: Text('Delete')),
                              ],
                            ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}

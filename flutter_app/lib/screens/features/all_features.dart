import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../models/velora_models.dart';
import '../../providers/auth_provider.dart';
import '../../providers/velora_provider.dart';
import '../../theme/app_colors.dart';
import '../../utils/color_utils.dart';
import '../../utils/constants.dart';
import '../../utils/formatters.dart';
import '../../widgets/feature_ui.dart';
import '../../widgets/glass_card.dart';

Future<bool> confirmDelete(BuildContext context, String label) async {
  return await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text('Delete $label?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
          ],
        ),
      ) ??
      false;
}

void _showError(BuildContext context, VeloraProvider p) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(p.error ?? 'Something went wrong')));
}

Future<({double amount, String? note})?> _promptAmountNote(
  BuildContext context, {
  required String title,
}) async {
  final amountCtrl = TextEditingController();
  final noteCtrl = TextEditingController();
  return showDialog<({double amount, String? note})>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TextField(
            controller: amountCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            autofocus: true,
            decoration: const InputDecoration(labelText: 'Amount'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: noteCtrl,
            decoration: const InputDecoration(labelText: 'Note (optional)'),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
        FilledButton(
          onPressed: () {
            final v = double.tryParse(amountCtrl.text.trim());
            if (v != null && v > 0) {
              final note = noteCtrl.text.trim();
              Navigator.pop(ctx, (amount: v, note: note.isEmpty ? null : note));
            }
          },
          child: const Text('Confirm'),
        ),
      ],
    ),
  );
}

Widget _colorPicker(String selected, ValueChanged<String> onSelect) {
  return Wrap(
    spacing: 8,
    runSpacing: 8,
    children: paletteColors.map((hex) {
      final c = parseHexColor(hex);
      final active = selected.toLowerCase() == hex.toLowerCase();
      return GestureDetector(
        onTap: () => onSelect(hex),
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
  );
}

Future<DateTime?> _pickDate(BuildContext context, DateTime initial) {
  return showDatePicker(
    context: context,
    initialDate: initial,
    firstDate: DateTime(2000),
    lastDate: DateTime(2100),
  );
}

// ─── Budgets ─────────────────────────────────────────────────────────────────

class BudgetsScreen extends StatefulWidget {
  const BudgetsScreen({super.key});
  @override
  State<BudgetsScreen> createState() => _BudgetsScreenState();
}

class _BudgetsScreenState extends State<BudgetsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<VeloraProvider>().loadBudgets());
  }

  void _sheet({BudgetModel? existing}) {
    final name = TextEditingController(text: existing?.name ?? '');
    final limit = TextEditingController(text: existing != null ? existing.limit.toString() : '');
    final alert = TextEditingController(text: (existing?.alertThreshold ?? 80).toString());
    var category = existing?.category ?? expenseCategories.first;
    if (!expenseCategories.contains(category)) category = expenseCategories.first;
    var period = existing?.period ?? 'monthly';
    if (!budgetPeriods.contains(period)) period = budgetPeriods.first;
    var color = existing?.color ?? paletteColors.first;
    final currency = context.read<AuthProvider>().user?.currency ?? 'USD';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: StatefulBuilder(
          builder: (ctx, setS) => SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(existing == null ? 'New budget' : 'Edit budget',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
                DropdownButtonFormField<String>(
                  value: category,
                  items: expenseCategories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                  onChanged: (v) => setS(() => category = v ?? category),
                  decoration: const InputDecoration(labelText: 'Category'),
                ),
                TextField(
                  controller: limit,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(labelText: 'Limit ($currency)'),
                ),
                DropdownButtonFormField<String>(
                  value: period,
                  items: budgetPeriods.map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                  onChanged: (v) => setS(() => period = v ?? period),
                  decoration: const InputDecoration(labelText: 'Period'),
                ),
                TextField(
                  controller: alert,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Alert threshold %'),
                ),
                const SizedBox(height: 8),
                const Text('Color', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                _colorPicker(color, (c) => setS(() => color = c)),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () async {
                    final p = context.read<VeloraProvider>();
                    final body = {
                      'name': name.text.trim(),
                      'category': category,
                      'limit': double.tryParse(limit.text) ?? 0,
                      'period': period,
                      'alertThreshold': int.tryParse(alert.text) ?? 80,
                      'color': color,
                      if (existing == null) 'startDate': DateTime.now().toIso8601String(),
                    };
                    final ok = existing == null
                        ? await p.addBudget(body)
                        : await p.updateBudget(existing.id, body);
                    if (ctx.mounted) Navigator.pop(ctx);
                    if (!ok && mounted) _showError(context, p);
                  },
                  child: Text(existing == null ? 'Create' : 'Save'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _delete(String id, String name) async {
    if (!await confirmDelete(context, name)) return;
    final p = context.read<VeloraProvider>();
    final ok = await p.removeBudget(id);
    if (!ok && mounted) _showError(context, p);
  }

  @override
  Widget build(BuildContext context) {
    final currency = context.watch<AuthProvider>().user?.currency ?? 'USD';
    final p = context.watch<VeloraProvider>();
    return _FeatureBody(
      loading: p.loading && p.budgets.isEmpty,
      onRefresh: p.loadBudgets,
      fab: () => _sheet(),
      fabLabel: 'Budget',
      child: p.budgets.isEmpty
          ? const EmptyFeature(emoji: '🎯', message: 'Set spending limits per category')
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: p.budgets.length,
              itemBuilder: (_, i) {
                final b = p.budgets[i];
                final c = parseHexColor(b.color);
                return GlassCard(
                  onTap: () => _sheet(existing: b),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(b.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          ),
                          Text('${b.percent.toStringAsFixed(0)}%',
                              style: TextStyle(fontWeight: FontWeight.bold, color: c)),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.rose),
                            onPressed: () => _delete(b.id, b.name),
                          ),
                        ],
                      ),
                      Text('${b.category} · ${b.period}',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                      const SizedBox(height: 10),
                      ColorProgressBar(percent: b.percent, color: c),
                      const SizedBox(height: 8),
                      Text(
                        '${formatCurrency(b.spent, currency)} / ${formatCurrency(b.limit, currency)}',
                        style: const TextStyle(fontSize: 13),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}

// ─── Goals ───────────────────────────────────────────────────────────────────

class GoalsScreen extends StatefulWidget {
  const GoalsScreen({super.key});
  @override
  State<GoalsScreen> createState() => _GoalsScreenState();
}

class _GoalsScreenState extends State<GoalsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<VeloraProvider>().loadGoals());
  }

  void _sheet({GoalModel? existing}) {
    final name = TextEditingController(text: existing?.name ?? '');
    final target = TextEditingController(text: existing != null ? existing.targetAmount.toString() : '');
    final current = TextEditingController(text: existing != null ? existing.currentAmount.toString() : '0');
    final category = TextEditingController(text: existing?.category ?? '');
    var priority = existing?.priority ?? 'medium';
    if (!goalPriorities.contains(priority)) priority = 'medium';
    var color = existing?.color ?? paletteColors[2];
    var deadline = existing?.deadline;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: StatefulBuilder(
          builder: (ctx, setS) => SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(existing == null ? 'New goal' : 'Edit goal',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
                TextField(
                  controller: target,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Target amount'),
                ),
                TextField(
                  controller: current,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Current amount'),
                ),
                TextField(controller: category, decoration: const InputDecoration(labelText: 'Category')),
                DropdownButtonFormField<String>(
                  value: priority,
                  items: goalPriorities.map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                  onChanged: (v) => setS(() => priority = v ?? priority),
                  decoration: const InputDecoration(labelText: 'Priority'),
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(deadline == null ? 'Deadline (optional)' : 'Deadline: ${formatDate(deadline!)}'),
                  trailing: const Icon(Icons.calendar_today),
                  onTap: () async {
                    final d = await _pickDate(ctx, deadline ?? DateTime.now().add(const Duration(days: 90)));
                    if (d != null) setS(() => deadline = d);
                  },
                ),
                const Text('Color', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                _colorPicker(color, (c) => setS(() => color = c)),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () async {
                    final p = context.read<VeloraProvider>();
                    final body = {
                      'name': name.text.trim(),
                      'targetAmount': double.tryParse(target.text) ?? 0,
                      'currentAmount': double.tryParse(current.text) ?? 0,
                      'category': category.text.trim().isEmpty ? null : category.text.trim(),
                      'priority': priority,
                      'color': color,
                      if (deadline != null) 'deadline': deadline!.toIso8601String(),
                    };
                    final ok = existing == null
                        ? await p.addGoal(body)
                        : await p.updateGoal(existing.id, body);
                    if (ctx.mounted) Navigator.pop(ctx);
                    if (!ok && mounted) _showError(context, p);
                  },
                  child: Text(existing == null ? 'Create goal' : 'Save'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _contribute(String id, String name) async {
    final result = await _promptAmountNote(context, title: 'Contribute to $name');
    if (result == null) return;
    final p = context.read<VeloraProvider>();
    final ok = await p.contributeGoal(id, result.amount, note: result.note);
    if (!ok && mounted) _showError(context, p);
  }

  Future<void> _delete(String id, String name) async {
    if (!await confirmDelete(context, name)) return;
    final p = context.read<VeloraProvider>();
    final ok = await p.removeGoal(id);
    if (!ok && mounted) _showError(context, p);
  }

  @override
  Widget build(BuildContext context) {
    final currency = context.watch<AuthProvider>().user?.currency ?? 'USD';
    final p = context.watch<VeloraProvider>();
    return _FeatureBody(
      loading: p.loading && p.goals.isEmpty,
      onRefresh: p.loadGoals,
      fab: () => _sheet(),
      fabLabel: 'Goal',
      child: p.goals.isEmpty
          ? const EmptyFeature(emoji: '🏆', message: 'Save for what matters')
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: p.goals.length,
              itemBuilder: (_, i) {
                final g = p.goals[i];
                return GlassCard(
                  onTap: () => _sheet(existing: g),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(g.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                          ),
                          Chip(
                            label: Text(g.priority, style: const TextStyle(fontSize: 11)),
                            visualDensity: VisualDensity.compact,
                            padding: EdgeInsets.zero,
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.rose),
                            onPressed: () => _delete(g.id, g.name),
                          ),
                        ],
                      ),
                      if (g.category != null)
                        Text(g.category!, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                      const SizedBox(height: 8),
                      ColorProgressBar(percent: g.progress, color: parseHexColor(g.color)),
                      const SizedBox(height: 8),
                      Text(
                        '${formatCurrency(g.currentAmount, currency)} of ${formatCurrency(g.targetAmount, currency)}'
                        '${g.deadline != null ? ' · by ${formatDate(g.deadline!)}' : ''}',
                      ),
                      const SizedBox(height: 10),
                      Align(
                        alignment: Alignment.centerRight,
                        child: FilledButton.tonal(
                          onPressed: () => _contribute(g.id, g.name),
                          child: const Text('Contribute'),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
    );
  }
}

// ─── Debts ───────────────────────────────────────────────────────────────────

class DebtsScreen extends StatefulWidget {
  const DebtsScreen({super.key});
  @override
  State<DebtsScreen> createState() => _DebtsScreenState();
}

class _DebtsScreenState extends State<DebtsScreen> {
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<VeloraProvider>().loadDebts());
  }

  void _sheet({DebtModel? existing}) {
    final person = TextEditingController(text: existing?.person ?? '');
    final amount = TextEditingController(text: existing != null ? existing.amount.toString() : '');
    final description = TextEditingController(text: existing?.description ?? '');
    final interest = TextEditingController(text: (existing?.interestRate ?? 0).toString());
    final emiAmount = TextEditingController(text: existing?.emiAmount?.toString() ?? '');
    final emiDay = TextEditingController(text: existing?.emiDay?.toString() ?? '');
    final tenure = TextEditingController(text: existing?.tenure?.toString() ?? '');
    var type = existing?.type ?? 'borrowed';
    var isEMI = existing?.isEMI ?? false;
    var dueDate = existing?.dueDate;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: StatefulBuilder(
          builder: (ctx, setS) => SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(existing == null ? 'Add debt' : 'Edit debt',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'borrowed', label: Text('I owe')),
                    ButtonSegment(value: 'lent', label: Text('Owed to me')),
                  ],
                  selected: {type},
                  onSelectionChanged: (s) => setS(() => type = s.first),
                ),
                TextField(controller: person, decoration: const InputDecoration(labelText: 'Person')),
                TextField(
                  controller: amount,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Amount'),
                ),
                TextField(controller: description, decoration: const InputDecoration(labelText: 'Description')),
                TextField(
                  controller: interest,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Interest rate %'),
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(dueDate == null ? 'Due date (optional)' : 'Due: ${formatDate(dueDate!)}'),
                  trailing: const Icon(Icons.calendar_today),
                  onTap: () async {
                    final d = await _pickDate(ctx, dueDate ?? DateTime.now().add(const Duration(days: 30)));
                    if (d != null) setS(() => dueDate = d);
                  },
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('EMI'),
                  value: isEMI,
                  onChanged: (v) => setS(() => isEMI = v),
                ),
                if (isEMI) ...[
                  TextField(
                    controller: emiAmount,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'EMI amount'),
                  ),
                  TextField(
                    controller: emiDay,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'EMI day (1–31)'),
                  ),
                  TextField(
                    controller: tenure,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Tenure (months)'),
                  ),
                ],
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () async {
                    final p = context.read<VeloraProvider>();
                    final body = <String, dynamic>{
                      'type': type,
                      'person': person.text.trim(),
                      'amount': double.tryParse(amount.text) ?? 0,
                      'description': description.text.trim().isEmpty ? null : description.text.trim(),
                      'interestRate': double.tryParse(interest.text) ?? 0,
                      'isEMI': isEMI,
                      if (dueDate != null) 'dueDate': dueDate!.toIso8601String(),
                      if (isEMI) ...{
                        'emiAmount': double.tryParse(emiAmount.text),
                        'emiDay': int.tryParse(emiDay.text),
                        'tenure': int.tryParse(tenure.text),
                      },
                    };
                    final ok = existing == null
                        ? await p.addDebt(body)
                        : await p.updateDebt(existing.id, body);
                    if (ctx.mounted) Navigator.pop(ctx);
                    if (!ok && mounted) _showError(context, p);
                  },
                  child: Text(existing == null ? 'Add debt' : 'Save'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _repay(String id, String person) async {
    final result = await _promptAmountNote(context, title: 'Repay $person');
    if (result == null) return;
    final p = context.read<VeloraProvider>();
    final ok = await p.repayDebt(id, result.amount, note: result.note);
    if (!ok && mounted) _showError(context, p);
  }

  Future<void> _delete(String id, String person) async {
    if (!await confirmDelete(context, person)) return;
    final p = context.read<VeloraProvider>();
    final ok = await p.removeDebt(id);
    if (!ok && mounted) _showError(context, p);
  }

  @override
  Widget build(BuildContext context) {
    final currency = context.watch<AuthProvider>().user?.currency ?? 'USD';
    final p = context.watch<VeloraProvider>();
    final debts = _filter == 'all' ? p.debts : p.debts.where((d) => d.type == _filter).toList();

    return _FeatureBody(
      loading: p.loading && p.debts.isEmpty,
      onRefresh: p.loadDebts,
      fab: () => _sheet(),
      fabLabel: 'Debt',
      child: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
            child: Row(
              children: [
                for (final f in [('all', 'All'), ('borrowed', 'Borrowed'), ('lent', 'Lent')]) ...[
                  FilterChip(
                    label: Text(f.$2),
                    selected: _filter == f.$1,
                    onSelected: (_) => setState(() => _filter = f.$1),
                  ),
                  const SizedBox(width: 8),
                ],
              ],
            ),
          ),
          Expanded(
            child: debts.isEmpty
                ? const EmptyFeature(emoji: '💸', message: 'Track money you owe or lent')
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: debts.length,
                    itemBuilder: (_, i) {
                      final d = debts[i];
                      return GlassCard(
                        onTap: () => _sheet(existing: d),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(d.person,
                                          style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                                      Text(
                                        '${d.type == 'borrowed' ? 'You owe' : 'Owes you'} · ${d.status}'
                                        '${d.isEMI ? ' · EMI' : ''}',
                                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                      ),
                                      if (d.dueDate != null)
                                        Text('Due ${formatDate(d.dueDate!)}',
                                            style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                                    ],
                                  ),
                                ),
                                Text(
                                  formatCurrency(d.remainingAmount, currency),
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: d.type == 'borrowed' ? AppColors.rose : AppColors.green,
                                    fontSize: 15,
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.rose),
                                  onPressed: () => _delete(d.id, d.person),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Align(
                              alignment: Alignment.centerRight,
                              child: FilledButton.tonal(
                                onPressed: () => _repay(d.id, d.person),
                                child: const Text('Repay'),
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

class SubscriptionsScreen extends StatefulWidget {
  const SubscriptionsScreen({super.key});
  @override
  State<SubscriptionsScreen> createState() => _SubscriptionsScreenState();
}

class _SubscriptionsScreenState extends State<SubscriptionsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<VeloraProvider>().loadSubscriptions());
  }

  void _sheet({SubscriptionModel? existing}) {
    final name = TextEditingController(text: existing?.name ?? '');
    final amount = TextEditingController(text: existing != null ? existing.amount.toString() : '');
    final website = TextEditingController(text: existing?.website ?? '');
    var frequency = existing?.frequency ?? 'monthly';
    if (!subscriptionFrequencies.contains(frequency)) frequency = 'monthly';
    var category = existing?.category ?? subscriptionCategories.first;
    if (!subscriptionCategories.contains(category)) category = subscriptionCategories.first;
    var nextBilling = existing?.nextBillingDate ?? DateTime.now().add(const Duration(days: 30));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: StatefulBuilder(
          builder: (ctx, setS) => SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(existing == null ? 'Add subscription' : 'Edit subscription',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
                TextField(
                  controller: amount,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Amount'),
                ),
                DropdownButtonFormField<String>(
                  value: frequency,
                  items: subscriptionFrequencies
                      .map((f) => DropdownMenuItem(value: f, child: Text(f)))
                      .toList(),
                  onChanged: (v) => setS(() => frequency = v ?? frequency),
                  decoration: const InputDecoration(labelText: 'Frequency'),
                ),
                DropdownButtonFormField<String>(
                  value: category,
                  items: subscriptionCategories
                      .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                      .toList(),
                  onChanged: (v) => setS(() => category = v ?? category),
                  decoration: const InputDecoration(labelText: 'Category'),
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Next billing: ${formatDate(nextBilling)}'),
                  trailing: const Icon(Icons.calendar_today),
                  onTap: () async {
                    final d = await _pickDate(ctx, nextBilling);
                    if (d != null) setS(() => nextBilling = d);
                  },
                ),
                TextField(controller: website, decoration: const InputDecoration(labelText: 'Website')),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () async {
                    final p = context.read<VeloraProvider>();
                    final body = {
                      'name': name.text.trim(),
                      'amount': double.tryParse(amount.text) ?? 0,
                      'frequency': frequency,
                      'category': category,
                      'nextBillingDate': nextBilling.toIso8601String(),
                      if (website.text.trim().isNotEmpty) 'website': website.text.trim(),
                      if (existing == null) 'startDate': DateTime.now().toIso8601String(),
                    };
                    final ok = existing == null
                        ? await p.addSubscription(body)
                        : await p.updateSubscription(existing.id, body);
                    if (ctx.mounted) Navigator.pop(ctx);
                    if (!ok && mounted) _showError(context, p);
                  },
                  child: Text(existing == null ? 'Add subscription' : 'Save'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _toggle(String id) async {
    final p = context.read<VeloraProvider>();
    final ok = await p.toggleSubscription(id);
    if (!ok && mounted) _showError(context, p);
  }

  Future<void> _delete(String id, String name) async {
    if (!await confirmDelete(context, name)) return;
    final p = context.read<VeloraProvider>();
    final ok = await p.removeSubscription(id);
    if (!ok && mounted) _showError(context, p);
  }

  @override
  Widget build(BuildContext context) {
    final currency = context.watch<AuthProvider>().user?.currency ?? 'USD';
    final p = context.watch<VeloraProvider>();
    return _FeatureBody(
      loading: p.loading && p.subscriptions.isEmpty,
      onRefresh: p.loadSubscriptions,
      fab: () => _sheet(),
      fabLabel: 'Sub',
      child: p.subscriptions.isEmpty
          ? const EmptyFeature(emoji: '🔄', message: 'Track recurring bills')
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: p.subscriptions.length,
              itemBuilder: (_, i) {
                final s = p.subscriptions[i];
                final paused = s.status != 'active';
                return GestureDetector(
                  onTap: () => _sheet(existing: s),
                  child: FeatureListTile(
                    title: s.name,
                    subtitle:
                        '${s.frequency} · ${s.category}${s.nextBillingDate != null ? ' · next ${formatDate(s.nextBillingDate!, short: true)}' : ''}${paused ? ' · paused' : ''}',
                    amount: formatCurrency(s.amount, currency),
                    colorHex: s.color,
                    trailing: IconButton(
                      icon: Icon(paused ? Icons.play_arrow : Icons.pause, size: 20),
                      tooltip: paused ? 'Resume' : 'Pause',
                      onPressed: () => _toggle(s.id),
                    ),
                    onDelete: () => _delete(s.id, s.name),
                  ),
                );
              },
            ),
    );
  }
}

// ─── Investments ─────────────────────────────────────────────────────────────

class InvestmentsScreen extends StatefulWidget {
  const InvestmentsScreen({super.key});
  @override
  State<InvestmentsScreen> createState() => _InvestmentsScreenState();
}

class _InvestmentsScreenState extends State<InvestmentsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<VeloraProvider>().loadInvestments());
  }

  void _sheet({InvestmentModel? existing}) {
    final name = TextEditingController(text: existing?.name ?? '');
    final units = TextEditingController(text: existing != null ? existing.units.toString() : '');
    final buyPrice = TextEditingController(text: existing != null ? existing.buyPrice.toString() : '');
    final currentPrice =
        TextEditingController(text: existing?.currentPrice?.toString() ?? existing?.buyPrice.toString() ?? '');
    final symbol = TextEditingController(text: existing?.symbol ?? '');
    final platform = TextEditingController(text: existing?.platform ?? '');
    var type = existing?.type ?? 'stock';
    if (!investmentTypes.contains(type)) type = 'stock';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: StatefulBuilder(
          builder: (ctx, setS) => SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(existing == null ? 'Add investment' : 'Edit investment',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                TextField(controller: name, decoration: const InputDecoration(labelText: 'Name')),
                DropdownButtonFormField<String>(
                  value: type,
                  items: investmentTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                  onChanged: (v) => setS(() => type = v ?? type),
                  decoration: const InputDecoration(labelText: 'Type'),
                ),
                TextField(
                  controller: units,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Units'),
                ),
                TextField(
                  controller: buyPrice,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Buy price'),
                ),
                TextField(
                  controller: currentPrice,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Current price'),
                ),
                TextField(controller: symbol, decoration: const InputDecoration(labelText: 'Symbol')),
                TextField(controller: platform, decoration: const InputDecoration(labelText: 'Platform')),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () async {
                    final p = context.read<VeloraProvider>();
                    final body = {
                      'name': name.text.trim(),
                      'type': type,
                      'units': double.tryParse(units.text) ?? 0,
                      'buyPrice': double.tryParse(buyPrice.text) ?? 0,
                      'currentPrice': double.tryParse(currentPrice.text),
                      if (symbol.text.trim().isNotEmpty) 'symbol': symbol.text.trim(),
                      if (platform.text.trim().isNotEmpty) 'platform': platform.text.trim(),
                    };
                    final ok = existing == null
                        ? await p.addInvestment(body)
                        : await p.updateInvestment(existing.id, body);
                    if (ctx.mounted) Navigator.pop(ctx);
                    if (!ok && mounted) _showError(context, p);
                  },
                  child: Text(existing == null ? 'Add investment' : 'Save'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _updatePrice(InvestmentModel inv) async {
    final ctrl = TextEditingController(text: (inv.currentPrice ?? inv.buyPrice).toString());
    final price = await showDialog<double>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Update price · ${inv.name}'),
        content: TextField(
          controller: ctrl,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Current price'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              final v = double.tryParse(ctrl.text.trim());
              if (v != null && v >= 0) Navigator.pop(ctx, v);
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
    if (price == null) return;
    final p = context.read<VeloraProvider>();
    final ok = await p.updateInvestmentPrice(inv.id, price);
    if (!ok && mounted) _showError(context, p);
  }

  Future<void> _delete(String id, String name) async {
    if (!await confirmDelete(context, name)) return;
    final p = context.read<VeloraProvider>();
    final ok = await p.removeInvestment(id);
    if (!ok && mounted) _showError(context, p);
  }

  @override
  Widget build(BuildContext context) {
    final currency = context.watch<AuthProvider>().user?.currency ?? 'USD';
    final p = context.watch<VeloraProvider>();
    return _FeatureBody(
      loading: p.loading && p.investments.isEmpty,
      onRefresh: p.loadInvestments,
      fab: () => _sheet(),
      fabLabel: 'Asset',
      child: p.investments.isEmpty
          ? const EmptyFeature(emoji: '📈', message: 'Build your portfolio')
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: p.investments.length,
              itemBuilder: (_, i) {
                final inv = p.investments[i];
                return GestureDetector(
                  onTap: () => _sheet(existing: inv),
                  child: FeatureListTile(
                    title: inv.name,
                    subtitle:
                        '${inv.type}${inv.symbol != null ? ' · ${inv.symbol}' : ''}${inv.platform != null ? ' · ${inv.platform}' : ''}',
                    amount: formatCurrency(inv.value, currency),
                    colorHex: inv.gain >= 0 ? '#22C55E' : '#F43F5E',
                    trailing: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${inv.gain >= 0 ? '+' : ''}${formatCurrency(inv.gain, currency)}',
                          style: TextStyle(
                              fontSize: 11, color: inv.gain >= 0 ? AppColors.green : AppColors.rose),
                        ),
                        TextButton(
                          onPressed: () => _updatePrice(inv),
                          child: const Text('Price', style: TextStyle(fontSize: 11)),
                        ),
                      ],
                    ),
                    onDelete: () => _delete(inv.id, inv.name),
                  ),
                );
              },
            ),
    );
  }
}

// ─── Analytics ───────────────────────────────────────────────────────────────

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});
  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  String _period = 'month';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  void _load() => context.read<VeloraProvider>().loadAnalytics(period: _period);

  @override
  Widget build(BuildContext context) {
    final currency = context.watch<AuthProvider>().user?.currency ?? 'USD';
    final p = context.watch<VeloraProvider>();
    final nw = p.netWorthData;
    final pieColors = [
      AppColors.indigo,
      AppColors.pink,
      AppColors.orange,
      AppColors.green,
      AppColors.cyan,
      AppColors.violet,
    ];
    final latestCf = p.cashFlow.isNotEmpty ? p.cashFlow.last : null;

    return _FeatureBody(
      loading: p.loading && p.spending.isEmpty && p.trend.isEmpty && nw.isEmpty,
      onRefresh: () async => _load(),
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                for (final f in [('month', 'Month'), ('year', 'Year')]) ...[
                  FilterChip(
                    label: Text(f.$2),
                    selected: _period == f.$1,
                    onSelected: (_) => setState(() {
                      _period = f.$1;
                      _load();
                    }),
                  ),
                  const SizedBox(width: 8),
                ],
              ],
            ),
          ),
          const SizedBox(height: 8),
          if (nw.isNotEmpty)
            GlassCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Net worth', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  const SizedBox(height: 8),
                  Text(
                    formatCurrency((nw['netWorth'] as num?)?.toDouble() ?? 0, currency),
                    style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: AppColors.indigo),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Assets ${formatCurrency((nw['assets'] as num?)?.toDouble() ?? 0, currency)}',
                          style: const TextStyle(color: AppColors.green, fontWeight: FontWeight.w600),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          'Liabilities ${formatCurrency((nw['liabilities'] as num?)?.toDouble() ?? 0, currency)}',
                          style: const TextStyle(color: AppColors.rose, fontWeight: FontWeight.w600),
                          textAlign: TextAlign.end,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          if (p.trend.isNotEmpty) ...[
            const SizedBox(height: 8),
            GlassCard(
              child: SizedBox(
                height: 220,
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
                        spots: p.trend
                            .asMap()
                            .entries
                            .map((e) => FlSpot(e.key.toDouble(), e.value.income))
                            .toList(),
                        isCurved: true,
                        color: AppColors.green,
                        barWidth: 3,
                        dotData: const FlDotData(show: false),
                        belowBarData:
                            BarAreaData(show: true, color: AppColors.green.withValues(alpha: 0.12)),
                      ),
                      LineChartBarData(
                        spots: p.trend
                            .asMap()
                            .entries
                            .map((e) => FlSpot(e.key.toDouble(), e.value.expense))
                            .toList(),
                        isCurved: true,
                        color: AppColors.rose,
                        barWidth: 3,
                        dotData: const FlDotData(show: false),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
          if (latestCf != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: GlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Cash in', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                        Text(formatCurrency(latestCf.income, currency),
                            style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.green)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: GlassCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Cash out', style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                        Text(formatCurrency(latestCf.expense, currency),
                            style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.rose)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          Text('Spending by category',
              style: TextStyle(fontWeight: FontWeight.w800, color: Colors.grey.shade800)),
          const SizedBox(height: 8),
          if (p.spending.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: Text('No spending data')),
            )
          else
            ...p.spending.asMap().entries.map((e) {
              final c = pieColors[e.key % pieColors.length];
              return GlassCard(
                child: Row(
                  children: [
                    Container(
                        width: 10,
                        height: 40,
                        decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(4))),
                    const SizedBox(width: 12),
                    Expanded(child: Text(e.value.category, style: const TextStyle(fontWeight: FontWeight.w600))),
                    Text(formatCurrency(e.value.total, currency),
                        style: TextStyle(fontWeight: FontWeight.bold, color: c)),
                  ],
                ),
              );
            }),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}

// ─── Calendar ────────────────────────────────────────────────────────────────

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});
  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<VeloraProvider>().loadCalendar());
  }

  void _sheet({CalendarEventModel? existing}) {
    final title = TextEditingController(text: existing?.title ?? '');
    final amount = TextEditingController(text: existing?.amount?.toString() ?? '');
    final description = TextEditingController(text: existing?.description ?? '');
    var type = existing?.type ?? 'reminder';
    if (!calendarEventTypes.contains(type)) type = 'reminder';
    var date = existing?.date ?? DateTime.now();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom, left: 20, right: 20, top: 20),
        child: StatefulBuilder(
          builder: (ctx, setS) => SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(existing == null ? 'Add event' : 'Edit event',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                TextField(controller: title, decoration: const InputDecoration(labelText: 'Title')),
                DropdownButtonFormField<String>(
                  value: type,
                  items: calendarEventTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                  onChanged: (v) => setS(() => type = v ?? type),
                  decoration: const InputDecoration(labelText: 'Type'),
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text('Date: ${formatDate(date)}'),
                  trailing: const Icon(Icons.calendar_today),
                  onTap: () async {
                    final d = await _pickDate(ctx, date);
                    if (d != null) setS(() => date = d);
                  },
                ),
                TextField(
                  controller: amount,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Amount (optional)'),
                ),
                TextField(controller: description, decoration: const InputDecoration(labelText: 'Description')),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () async {
                    final p = context.read<VeloraProvider>();
                    final amt = double.tryParse(amount.text.trim());
                    final body = {
                      'title': title.text.trim(),
                      'type': type,
                      'date': date.toIso8601String(),
                      if (amt != null) 'amount': amt,
                      if (description.text.trim().isNotEmpty) 'description': description.text.trim(),
                    };
                    final ok = existing == null
                        ? await p.addCalendarEvent(body)
                        : await p.updateCalendarEvent(existing.id, body);
                    if (ctx.mounted) Navigator.pop(ctx);
                    if (!ok && mounted) _showError(context, p);
                  },
                  child: Text(existing == null ? 'Add event' : 'Save'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _delete(String id, String title) async {
    if (!await confirmDelete(context, title)) return;
    final p = context.read<VeloraProvider>();
    final ok = await p.removeCalendarEvent(id);
    if (!ok && mounted) _showError(context, p);
  }

  @override
  Widget build(BuildContext context) {
    final currency = context.watch<AuthProvider>().user?.currency ?? 'USD';
    final p = context.watch<VeloraProvider>();
    final events = [...p.events]..sort((a, b) => a.date.compareTo(b.date));

    return _FeatureBody(
      loading: p.loading && p.events.isEmpty,
      onRefresh: p.loadCalendar,
      fab: () => _sheet(),
      fabLabel: 'Event',
      child: events.isEmpty
          ? const EmptyFeature(emoji: '📅', message: 'Plan bills, goals & reminders')
          : ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: events.length,
              itemBuilder: (_, i) {
                final e = events[i];
                return GestureDetector(
                  onTap: () => _sheet(existing: e),
                  child: FeatureListTile(
                    title: e.title,
                    subtitle:
                        '${formatDate(e.date)} · ${e.type}${e.description != null ? ' · ${e.description}' : ''}',
                    amount: e.amount != null ? formatCurrency(e.amount!, currency) : e.type.toUpperCase(),
                    colorHex: e.color,
                    onDelete: () => _delete(e.id, e.title),
                  ),
                );
              },
            ),
    );
  }
}

// ─── Income ──────────────────────────────────────────────────────────────────

class IncomeScreen extends StatefulWidget {
  const IncomeScreen({super.key});
  @override
  State<IncomeScreen> createState() => _IncomeScreenState();
}

class _IncomeScreenState extends State<IncomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance
        .addPostFrameCallback((_) => context.read<VeloraProvider>().loadTransactions(type: 'income'));
  }

  Future<void> _delete(String id, String label) async {
    if (id.isEmpty) return;
    if (!await confirmDelete(context, label)) return;
    final p = context.read<VeloraProvider>();
    final ok = await p.removeTransaction(id);
    if (!ok && mounted) _showError(context, p);
    await p.loadTransactions(type: 'income');
  }

  @override
  Widget build(BuildContext context) {
    final currency = context.watch<AuthProvider>().user?.currency ?? 'USD';
    final p = context.watch<VeloraProvider>();
    final incomeTx = p.transactions.where((t) => t.type == 'income').toList();
    final total = incomeTx.fold<double>(0, (s, t) => s + t.amount);

    return _FeatureBody(
      loading: p.loading && incomeTx.isEmpty,
      onRefresh: () => p.loadTransactions(type: 'income'),
      fab: () async {
        await context.push('/add-transaction', extra: 'income');
        if (mounted) context.read<VeloraProvider>().loadTransactions(type: 'income');
      },
      fabLabel: 'Income',
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: GlassCard(
              child: Row(
                children: [
                  const Icon(Icons.trending_up, color: AppColors.green, size: 32),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total income', style: TextStyle(fontSize: 12, color: Colors.grey)),
                      Text(formatCurrency(total, currency),
                          style: const TextStyle(
                              fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.green)),
                    ],
                  ),
                ],
              ),
            ),
          ),
          Expanded(
            child: incomeTx.isEmpty
                ? const EmptyFeature(emoji: '💰', message: 'Add income transactions')
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: incomeTx.length,
                    itemBuilder: (_, i) {
                      final t = incomeTx[i];
                      final label = t.description ?? t.category;
                      return FeatureListTile(
                        title: label,
                        subtitle: '${t.category} · ${formatDate(t.date, short: true)}',
                        amount: formatCurrency(t.amount, currency),
                        colorHex: '#22C55E',
                        onDelete: t.id.isNotEmpty ? () => _delete(t.id, label) : null,
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

// ─── Shared body ─────────────────────────────────────────────────────────────

class _FeatureBody extends StatelessWidget {
  const _FeatureBody({
    required this.child,
    this.loading = false,
    this.onRefresh,
    this.fab,
    this.fabLabel = 'Add',
  });
  final Widget child;
  final bool loading;
  final Future<void> Function()? onRefresh;
  final VoidCallback? fab;
  final String fabLabel;

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator(color: AppColors.indigo));

    Widget body = child;
    if (onRefresh != null) {
      final scrollable = child is ScrollView
          ? child
          : ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                SizedBox(
                  height: MediaQuery.sizeOf(context).height * 0.7,
                  child: child,
                ),
              ],
            );
      body = RefreshIndicator(
        onRefresh: onRefresh!,
        color: AppColors.indigo,
        child: scrollable,
      );
    }

    return Stack(
      children: [
        Positioned.fill(child: body),
        if (fab != null)
          Positioned(
            right: 16,
            bottom: 16,
            child: GradientFab(heroTag: 'fab_$fabLabel', onPressed: fab!, label: fabLabel),
          ),
      ],
    );
  }
}

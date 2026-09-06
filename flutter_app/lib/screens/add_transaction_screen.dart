import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../models/transaction_model.dart';
import '../providers/auth_provider.dart';
import '../providers/velora_provider.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';

class AddTransactionScreen extends StatefulWidget {
  const AddTransactionScreen({super.key, this.existing, this.initialType});

  final TransactionModel? existing;
  final String? initialType;

  @override
  State<AddTransactionScreen> createState() => _AddTransactionScreenState();
}

class _AddTransactionScreenState extends State<AddTransactionScreen> {
  late String _type;
  String? _accountId;
  String? _toAccountId;
  late String _category;
  final _amount = TextEditingController();
  final _description = TextEditingController();
  late DateTime _date;
  bool _saving = false;

  bool get _isEdit => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final e = widget.existing;
    _type = e?.type ?? widget.initialType ?? 'expense';
    if (!['expense', 'income', 'transfer'].contains(_type)) _type = 'expense';
    _accountId = e?.accountId;
    _toAccountId = e?.toAccountId;
    _category = e?.category ?? (_type == 'income' ? incomeCategories.first : expenseCategories.first);
    if (_type == 'transfer') _category = 'Transfer';
    if (e != null) {
      _amount.text = e.amount.toString();
      _description.text = e.description ?? '';
      _date = e.date;
    } else {
      _date = DateTime.now();
    }

    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final finance = context.read<VeloraProvider>();
      if (finance.accounts.isEmpty) await finance.loadAccounts();
      if (!mounted) return;
      final active = finance.accounts.where((a) => !a.isArchived).toList();
      setState(() {
        _accountId ??= active.isNotEmpty ? active.first.id : null;
        if (_type == 'transfer' && _toAccountId == null && active.length > 1) {
          _toAccountId = active.firstWhere((a) => a.id != _accountId, orElse: () => active.last).id;
        }
      });
    });
  }

  @override
  void dispose() {
    _amount.dispose();
    _description.dispose();
    super.dispose();
  }

  List<String> get _categories {
    if (_type == 'transfer') return const ['Transfer'];
    return _type == 'income' ? incomeCategories : expenseCategories;
  }

  Future<void> _save() async {
    if (_accountId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Add an account first')));
      return;
    }
    if (_type == 'transfer' && (_toAccountId == null || _toAccountId == _accountId)) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pick a different destination account')));
      return;
    }
    final amount = double.tryParse(_amount.text);
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Enter a valid amount')));
      return;
    }

    setState(() => _saving = true);
    final p = context.read<VeloraProvider>();
    final body = <String, dynamic>{
      'account': _accountId,
      'type': _type,
      'amount': amount,
      'category': _type == 'transfer' ? 'Transfer' : _category,
      'date': _date.toIso8601String(),
      if (_description.text.trim().isNotEmpty) 'description': _description.text.trim(),
      if (_type == 'transfer') 'toAccount': _toAccountId,
    };
    final ok = await p.saveTransaction(body, id: widget.existing?.id);
    setState(() => _saving = false);

    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_isEdit ? 'Transaction updated' : 'Transaction added')),
      );
      context.pop();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(p.error ?? 'Failed to save')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final finance = context.watch<VeloraProvider>();
    final accounts = finance.accounts.where((a) => !a.isArchived).toList();
    final currency = context.watch<AuthProvider>().user?.currency ?? 'USD';

    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? 'Edit transaction' : 'Add transaction')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          SegmentedButton<String>(
            segments: const [
              ButtonSegment(value: 'expense', label: Text('Expense'), icon: Icon(Icons.remove)),
              ButtonSegment(value: 'income', label: Text('Income'), icon: Icon(Icons.add)),
              ButtonSegment(value: 'transfer', label: Text('Transfer'), icon: Icon(Icons.swap_horiz)),
            ],
            selected: {_type},
            onSelectionChanged: (s) => setState(() {
              _type = s.first;
              _category = _categories.first;
            }),
          ),
          const SizedBox(height: 20),
          if (accounts.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text('Create an account before adding transactions.'),
              ),
            )
          else ...[
            DropdownButtonFormField<String>(
              value: _accountId,
              decoration: InputDecoration(labelText: _type == 'transfer' ? 'From account' : 'Account'),
              items: accounts.map((a) => DropdownMenuItem(value: a.id, child: Text(a.name))).toList(),
              onChanged: (v) => setState(() => _accountId = v),
            ),
            if (_type == 'transfer') ...[
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: _toAccountId,
                decoration: const InputDecoration(labelText: 'To account'),
                items: accounts
                    .where((a) => a.id != _accountId)
                    .map((a) => DropdownMenuItem(value: a.id, child: Text(a.name)))
                    .toList(),
                onChanged: (v) => setState(() => _toAccountId = v),
              ),
            ],
          ],
          const SizedBox(height: 16),
          TextField(
            controller: _amount,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(labelText: 'Amount ($currency)'),
          ),
          const SizedBox(height: 16),
          if (_type != 'transfer')
            DropdownButtonFormField<String>(
              value: _categories.contains(_category) ? _category : _categories.first,
              decoration: const InputDecoration(labelText: 'Category'),
              items: _categories.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              onChanged: (v) => setState(() => _category = v ?? _categories.first),
            )
          else
            const InputDecorator(
              decoration: InputDecoration(labelText: 'Category'),
              child: Text('Transfer'),
            ),
          const SizedBox(height: 16),
          TextField(
            controller: _description,
            decoration: const InputDecoration(labelText: 'Description (optional)'),
          ),
          const SizedBox(height: 8),
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text('Date: ${formatDate(_date)}'),
            trailing: const Icon(Icons.calendar_today),
            onTap: () async {
              final d = await showDatePicker(
                context: context,
                initialDate: _date,
                firstDate: DateTime(2000),
                lastDate: DateTime(2100),
              );
              if (d != null) setState(() => _date = d);
            },
          ),
          const SizedBox(height: 28),
          FilledButton(
            onPressed: _saving || accounts.isEmpty ? null : _save,
            child: _saving
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Text(_isEdit ? 'Update transaction' : 'Save transaction'),
          ),
        ],
      ),
    );
  }
}

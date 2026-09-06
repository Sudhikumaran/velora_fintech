import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../config/api_config.dart';
import '../core/api_client.dart';
import '../providers/auth_provider.dart';
import '../providers/velora_provider.dart';
import '../theme/app_colors.dart';
import '../utils/constants.dart';
import '../widgets/velora_logo.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  static Future<void> _editApiServer(BuildContext context) async {
    final ctrl = TextEditingController(text: ApiConfig.baseUrl);
    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('API server URL'),
        content: TextField(
          controller: ctrl,
          decoration: const InputDecoration(
            hintText: 'https://velora-fintech.onrender.com',
            labelText: 'Base URL (no /api suffix)',
          ),
          keyboardType: TextInputType.url,
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await ApiConfig.resetToDefault();
              ApiClient.instance.refreshBaseUrl();
              if (ctx.mounted) Navigator.pop(ctx, true);
            },
            child: const Text('Reset'),
          ),
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              await ApiConfig.setBaseUrl(ctrl.text);
              ApiClient.instance.refreshBaseUrl();
              if (ctx.mounted) Navigator.pop(ctx, true);
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (saved == true && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('API set to ${ApiConfig.baseUrl}')),
      );
    }
  }

  static Future<void> _editProfile(BuildContext context) async {
    final auth = context.read<AuthProvider>();
    final user = auth.user;
    final nameCtrl = TextEditingController(text: user?.name ?? '');
    final timezoneCtrl = TextEditingController(text: user?.timezone ?? '');
    var currency = user?.currency ?? 'USD';
    if (!currencies.contains(currency)) currency = currencies.first;

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => AlertDialog(
          title: const Text('Edit profile'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Name')),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: currency,
                  decoration: const InputDecoration(labelText: 'Currency'),
                  items: currencies.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                  onChanged: (v) => setS(() => currency = v ?? currency),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: timezoneCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Timezone (optional)',
                    hintText: 'Asia/Kolkata',
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                final ok = await auth.updateProfile(
                  name: nameCtrl.text.trim(),
                  currency: currency,
                  timezone: timezoneCtrl.text.trim().isEmpty ? null : timezoneCtrl.text.trim(),
                );
                if (ctx.mounted) Navigator.pop(ctx, ok);
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );

    if (!context.mounted) return;
    if (saved == true) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
    } else if (saved == false) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.error ?? 'Failed to update profile')),
      );
    }
  }

  static Future<void> _changePassword(BuildContext context) async {
    final auth = context.read<AuthProvider>();
    final currentCtrl = TextEditingController();
    final newCtrl = TextEditingController();

    final saved = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: currentCtrl,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Current password'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: newCtrl,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New password'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              final ok = await auth.updatePassword(
                currentPassword: currentCtrl.text,
                newPassword: newCtrl.text,
              );
              if (ctx.mounted) Navigator.pop(ctx, ok);
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );

    if (!context.mounted) return;
    if (saved == true) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password updated')));
    } else if (saved == false) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.error ?? 'Failed to change password')),
      );
    }
  }

  static Future<void> _exportData(BuildContext context) async {
    final p = context.read<VeloraProvider>();
    final ok = await p.exportAllData();
    if (!context.mounted) return;
    if (!ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(p.error ?? 'Export failed')),
      );
      return;
    }
    final keys = p.lastExport?.keys.length ?? 0;
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Export ready'),
        content: Text(
          keys > 0
              ? 'Data export saved ($keys sections). Ready for download or share.'
              : 'Export ready.',
        ),
        actions: [
          FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().user;
    final auth = context.read<AuthProvider>();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppColors.indigo.withValues(alpha: 0.15),
                  child: Text(
                    (user?.name.isNotEmpty == true ? user!.name[0] : 'V').toUpperCase(),
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.indigo),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user?.name ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      Text(user?.email ?? '', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      Text('Currency: ${user?.currency ?? 'USD'}',
                          style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                      if (user?.timezone != null && user!.timezone!.isNotEmpty)
                        Text('Timezone: ${user.timezone}',
                            style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Column(
            children: [
              ListTile(
                leading: const Icon(Icons.person_outline, color: AppColors.indigo),
                title: const Text('Edit profile'),
                subtitle: const Text('Name, currency, timezone'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _editProfile(context),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.lock_outline, color: AppColors.indigo),
                title: const Text('Change password'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _changePassword(context),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.download_outlined, color: AppColors.indigo),
                title: const Text('Export data'),
                subtitle: const Text('Download all your Velora data'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _exportData(context),
              ),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.cloud_outlined),
                title: const Text('API server'),
                subtitle: Text(ApiConfig.baseUrl, style: const TextStyle(fontSize: 11)),
                trailing: const Icon(Icons.edit_outlined, size: 18),
                onTap: () => _editApiServer(context),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        OutlinedButton.icon(
          onPressed: () async {
            await auth.logout();
            if (context.mounted) context.go('/login');
          },
          icon: const Icon(Icons.logout, color: AppColors.red),
          label: const Text('Sign out', style: TextStyle(color: AppColors.red)),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(double.infinity, 48),
            side: BorderSide(color: AppColors.red.withValues(alpha: 0.5)),
          ),
        ),
        const SizedBox(height: 32),
        const Center(child: VeloraLogo(size: 32, showLabel: true)),
        const SizedBox(height: 8),
        Center(child: Text('Velora Mobile v1.0.0', style: TextStyle(fontSize: 12, color: Colors.grey.shade500))),
      ],
    );
  }
}

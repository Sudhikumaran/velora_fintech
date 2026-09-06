import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../utils/color_utils.dart';
import 'glass_card.dart';

class PageHeader extends StatelessWidget {
  const PageHeader({super.key, required this.title, this.subtitle, this.trailing});
  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w800, color: Colors.white)),
                if (subtitle != null)
                  Text(subtitle!, style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.85))),
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

class GradientFab extends StatelessWidget {
  const GradientFab({super.key, required this.onPressed, required this.label, this.heroTag});
  final VoidCallback onPressed;
  final String label;
  final Object? heroTag;

  @override
  Widget build(BuildContext context) {
    return FloatingActionButton.extended(
      heroTag: heroTag ?? 'fab_${label.hashCode}',
      onPressed: onPressed,
      backgroundColor: AppColors.indigo,
      icon: const Icon(Icons.add_rounded, color: Colors.white),
      label: Text(label, style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white)),
    );
  }
}

class ColorProgressBar extends StatelessWidget {
  const ColorProgressBar({super.key, required this.percent, required this.color, this.height = 8});
  final double percent;
  final Color color;
  final double height;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(height),
      child: LinearProgressIndicator(
        value: (percent / 100).clamp(0.0, 1.0),
        minHeight: height,
        backgroundColor: color.withValues(alpha: 0.15),
        color: percent >= 100 ? AppColors.rose : color,
      ),
    );
  }
}

class FeatureListTile extends StatelessWidget {
  const FeatureListTile({
    super.key,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.colorHex,
    this.trailing,
    this.onDelete,
  });

  final String title;
  final String subtitle;
  final String amount;
  final String colorHex;
  final Widget? trailing;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final c = parseHexColor(colorHex);
    return GlassCard(
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: LinearGradient(colors: [c, c.withValues(alpha: 0.6)]),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.auto_awesome, color: Colors.white, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                const SizedBox(height: 2),
                Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(amount, style: TextStyle(fontWeight: FontWeight.w800, color: c, fontSize: 15)),
              if (trailing != null) trailing!,
            ],
          ),
          if (onDelete != null) ...[
            const SizedBox(width: 4),
            IconButton(icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.rose), onPressed: onDelete),
          ],
        ],
      ),
    );
  }
}

class EmptyFeature extends StatelessWidget {
  const EmptyFeature({super.key, required this.emoji, required this.message});
  final String emoji;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 48)),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: TextStyle(color: Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }
}

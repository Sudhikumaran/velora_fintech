import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class VeloraLogo extends StatelessWidget {
  const VeloraLogo({super.key, this.size = 40, this.showLabel = true, this.light = false});

  final double size;
  final bool showLabel;
  final bool light;

  @override
  Widget build(BuildContext context) {
    final textColor = light ? Colors.white : Theme.of(context).colorScheme.onSurface;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: AppColors.primaryGradient,
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(size * 0.35),
            boxShadow: [BoxShadow(color: AppColors.indigo.withValues(alpha: 0.35), blurRadius: 12, offset: const Offset(0, 4))],
          ),
          alignment: Alignment.center,
          child: Text('V', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: size * 0.45)),
        ),
        if (showLabel) ...[
          SizedBox(width: size * 0.25),
          Text('Velora', style: TextStyle(fontWeight: FontWeight.w800, fontSize: size * 0.5, color: textColor, letterSpacing: -0.5)),
        ],
      ],
    );
  }
}

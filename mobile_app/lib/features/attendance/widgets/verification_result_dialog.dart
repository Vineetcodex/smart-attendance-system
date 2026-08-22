import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class VerificationResultDialog extends StatelessWidget {
  final bool isSuccess;
  final String status;
  final String message;
  final Map<String, dynamic>? details;
  final VoidCallback onDismiss;

  const VerificationResultDialog({
    Key? key,
    required this.isSuccess,
    required this.status,
    required this.message,
    this.details,
    required this.onDismiss,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final bool isLate = status == 'LATE';
    final Color mainColor = isSuccess
        ? (isLate ? AppTheme.warning : AppTheme.primaryLight)
        : AppTheme.error;

    return Dialog(
      backgroundColor: AppTheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(24),
        side: BorderSide(color: mainColor.withOpacity(0.4), width: 1.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Status Icon
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: mainColor.withOpacity(0.15),
                shape: BoxShape.circle,
                border: BorderSide(color: mainColor.withOpacity(0.4), width: 2),
              ),
              child: Icon(
                isSuccess
                    ? (isLate ? Icons.access_time_rounded : Icons.check_circle_rounded)
                    : Icons.cancel_rounded,
                color: mainColor,
                size: 40,
              ),
            ),
            const SizedBox(height: 16),

            // Title
            Text(
              isSuccess
                  ? (isLate ? 'Late Arrival Marked' : 'Attendance Verified!')
                  : 'Verification Rejected',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 20,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),

            // Message
            Text(
              message,
              style: TextStyle(
                color: Colors.white.withOpacity(0.7),
                fontSize: 13,
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),

            // Details Breakdown (if available)
            if (details != null)
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.background,
                  borderRadius: BorderRadius.circular(16),
                  border: BorderSide(color: AppTheme.border),
                ),
                child: Column(
                  children: [
                    _buildFactorRow(
                      icon: Icons.qr_code_scanner_rounded,
                      label: 'Master QR Token',
                      isPass: details!['qrPassed'] == true,
                      value: details!['qrPassed'] == true ? 'Valid Signature' : 'Invalid',
                    ),
                    const Divider(color: AppTheme.border, height: 16),
                    _buildFactorRow(
                      icon: Icons.location_on_rounded,
                      label: 'GPS Geofence',
                      isPass: details!['geofencePassed'] == true,
                      value: details!['distanceMeters'] != null
                          ? '${(details!['distanceMeters'] as num).toStringAsFixed(1)}m away'
                          : 'In Range',
                    ),
                    const Divider(color: AppTheme.border, height: 16),
                    _buildFactorRow(
                      icon: Icons.face_rounded,
                      label: 'Face Match',
                      isPass: details!['facePassed'] == true,
                      value: details!['faceSimilarityScore'] != null
                          ? '${((details!['faceSimilarityScore'] as num) * 100).toStringAsFixed(1)}%'
                          : 'Matched',
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 24),

            // Dismiss Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: mainColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                onPressed: onDismiss,
                child: const Text(
                  'Continue',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFactorRow({
    required IconData icon,
    required String label,
    required bool isPass,
    required String value,
  }) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Colors.white70),
        const SizedBox(width: 10),
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 12),
        ),
        const Spacer(),
        Text(
          value,
          style: TextStyle(
            color: isPass ? AppTheme.primaryLight : AppTheme.error,
            fontSize: 12,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }
}

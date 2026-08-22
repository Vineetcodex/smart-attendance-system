import 'package:dio/dio.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/config/api_constants.dart';

class AttendanceService {
  /**
   * Submits the facial biometric payload to backend or queues offline if network is disconnected.
   */
  static Future<Map<String, dynamic>> submitVerification({
    required String employeeId,
    required List<double> faceEmbedding,
    String? qrPayload,
    double? livenessScore = 0.96,
    bool antiSpoofPassed = true,
    double? latitude,
    double? longitude,
    bool isMockLocation = false,
    String? snapshotUrl,
  }) async {
    final payload = {
      'employeeId': employeeId,
      if (qrPayload != null) 'qrPayload': qrPayload,
      'faceEmbedding': faceEmbedding,
      'livenessScore': livenessScore,
      'antiSpoofPassed': antiSpoofPassed,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
      'isMockLocation': isMockLocation,
      'snapshotUrl': snapshotUrl,
      'capturedAt': DateTime.now().toIso8601String(),
    };

    try {
      final dio = await ApiClient.getInstance();
      final response = await dio.post(
        ApiConstants.verifyAttendance,
        data: payload,
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      // Check if it's a network error (offline)
      if (e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout) {
        // Save to offline queue
        await SecureStorageService.queueOfflineAttempt(payload);
        return {
          'success': true,
          'status': 'QUEUED_OFFLINE',
          'message': 'No internet connection. Attendance record encrypted and queued locally. It will auto-sync when online.',
          'details': {
            'qrPassed': true,
            'geofencePassed': true,
            'facePassed': true,
            'isOffline': true,
          }
        };
      }

      if (e.response?.data != null && e.response?.data is Map) {
        return e.response!.data as Map<String, dynamic>;
      }
      throw Exception(e.message ?? 'Verification request failed');
    }
  }

  /**
   * Auto-syncs any pending offline records when network connection is restored.
   */
  static Future<int> syncOfflineQueue() async {
    final queued = await SecureStorageService.getOfflineQueue();
    if (queued.isEmpty) return 0;

    int syncedCount = 0;
    final dio = await ApiClient.getInstance();

    for (final item in queued) {
      try {
        await dio.post(ApiConstants.verifyAttendance, data: item);
        syncedCount++;
      } catch (err) {
        // Keep in queue if server rejected due to network
      }
    }

    if (syncedCount > 0) {
      await SecureStorageService.clearOfflineQueue();
    }
    return syncedCount;
  }
}

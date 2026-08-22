import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/models/employee_model.dart';
import '../services/face_embedding_service.dart';
import '../../attendance/services/location_service.dart';
import '../../attendance/services/attendance_service.dart';
import '../../attendance/widgets/verification_result_dialog.dart';

class DualCameraViewfinderScreen extends StatefulWidget {
  final EmployeeModel employee;

  const DualCameraViewfinderScreen({Key? key, required this.employee}) : super(key: key);

  @override
  State<DualCameraViewfinderScreen> createState() => _DualCameraViewfinderScreenState();
}

class _DualCameraViewfinderScreenState extends State<DualCameraViewfinderScreen> {
  CameraController? _cameraController;
  List<CameraDescription> _cameras = [];
  bool _isCameraInitialized = false;

  // Detection Status
  bool _faceDetected = false;
  bool _qrDetected = false;
  String? _detectedQrPayload;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _initCamera();
  }

  Future<void> _initCamera() async {
    try {
      _cameras = await availableCameras();
      if (_cameras.isEmpty) {
        setState(() => _isCameraInitialized = false);
        return;
      }

      // Prefer front-facing selfie camera
      final frontCamera = _cameras.firstWhere(
        (cam) => cam.lensDirection == CameraLensDirection.front,
        orElse: () => _cameras.first,
      );

      _cameraController = CameraController(
        frontCamera,
        ResolutionPreset.high,
        enableAudio: false,
        imageFormatGroup: ImageFormatGroup.yuv420,
      );

      await _cameraController!.initialize();
      if (!mounted) return;

      setState(() => _isCameraInitialized = true);

      // Start live detection stream
      _startOpticalStream();
    } catch (e) {
      debugPrint('Camera initialization error: $e');
    }
  }

  void _startOpticalStream() {
    if (_cameraController == null || !_cameraController!.value.isInitialized) return;

    // Simulate active optical lock in UI
    setState(() {
      _faceDetected = true;
      _qrDetected = true;
      _detectedQrPayload = 'QR-ATTEND-V1:simulated_optical_payload';
    });
  }

  Future<void> _captureAndVerify() async {
    if (_isSubmitting) return;

    setState(() => _isSubmitting = true);

    try {
      // 1. Fetch GPS location with anti-mock check
      final position = await LocationService.getVerifiedLocation();

      // 2. Extract facial embedding vector for current employee
      final faceVector = FaceEmbeddingService.extractFaceEmbedding(
        employeeSeed: '${widget.employee.employeeCode}-${widget.employee.fullName}',
      );

      // 3. QR Payload (from optical stream or simulated default)
      final qrPayload = _detectedQrPayload ?? 'QR-ATTEND-V1:mock_qr_payload';

      // 4. Submit Triple-Factor payload
      final result = await AttendanceService.submitVerification(
        employeeId: widget.employee.id,
        qrPayload: qrPayload,
        faceEmbedding: faceVector,
        latitude: position.latitude,
        longitude: position.longitude,
        isMockLocation: position.isMocked,
      );

      if (!mounted) return;

      final isSuccess = result['success'] == true;
      final status = result['status'] ?? (isSuccess ? 'PRESENT' : 'REJECTED');
      final message = result['message'] ?? (isSuccess ? 'Attendance recorded successfully!' : 'Verification rejected');
      final details = result['details'] as Map<String, dynamic>?;

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => VerificationResultDialog(
          isSuccess: isSuccess,
          status: status,
          message: message,
          details: details,
          onDismiss: () {
            Navigator.of(ctx).pop();
            Navigator.of(context).pop(true); // Return to home
          },
        ),
      );
    } catch (e) {
      if (!mounted) return;
      showDialog(
        context: context,
        builder: (ctx) => VerificationResultDialog(
          isSuccess: false,
          status: 'REJECTED',
          message: e.toString().replaceAll('Exception: ', ''),
          onDismiss: () => Navigator.of(ctx).pop(),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  void dispose() {
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bool isReady = _faceDetected && _qrDetected;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // 1. Camera Viewfinder or Placeholder
          if (_isCameraInitialized && _cameraController != null)
            CameraPreview(_cameraController!)
          else
            Container(
              color: AppTheme.background,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.camera_front_rounded, size: 64, color: AppTheme.primaryLight),
                    SizedBox(height: 16),
                    Text(
                      'Initializing Optical Viewfinder...',
                      style: TextStyle(color: Colors.white70, fontSize: 14),
                    ),
                  ],
                ),
              ),
            ),

          // 2. Viewfinder Guides (Oval Face Frame + QR Target)
          SafeArea(
            child: Column(
              children: [
                // Top Bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.between,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white24),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: isReady ? AppTheme.primaryLight : AppTheme.warning,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              isReady ? 'Multi-Target Locked' : 'Aligning Targets...',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 48), // Balance spacing
                    ],
                  ),
                ),

                const Spacer(),

                // Face Alignment Oval
                Container(
                  width: 260,
                  height: 320,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(160),
                    border: Border.all(
                      color: isReady ? AppTheme.primaryLight : Colors.white38,
                      width: 3,
                    ),
                    boxShadow: isReady
                        ? [
                            BoxShadow(
                              color: AppTheme.primaryLight.withOpacity(0.3),
                              blurRadius: 20,
                              spreadRadius: 2,
                            ),
                          ]
                        : null,
                  ),
                  child: Center(
                    child: Text(
                      'Position Face in Oval\nWall QR in Background',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        shadows: const [Shadow(blurRadius: 8, color: Colors.black)],
                      ),
                    ),
                  ),
                ),

                const Spacer(),

                // Status Pills
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _buildDetectionPill(
                        icon: Icons.face_rounded,
                        label: 'Face Locked',
                        isActive: _faceDetected,
                      ),
                      const SizedBox(width: 12),
                      _buildDetectionPill(
                        icon: Icons.qr_code_scanner_rounded,
                        label: 'Wall QR Detected',
                        isActive: _qrDetected,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Shutter Button
                Padding(
                  padding: const EdgeInsets.only(bottom: 32),
                  child: GestureDetector(
                    onTap: _isSubmitting ? null : _captureAndVerify,
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isReady ? AppTheme.primaryLight : Colors.white24,
                        border: Border.all(color: Colors.white, width: 4),
                        boxShadow: [
                          BoxShadow(
                            color: (isReady ? AppTheme.primaryLight : Colors.black).withOpacity(0.4),
                            blurRadius: 24,
                            spreadRadius: 4,
                          ),
                        ],
                      ),
                      child: _isSubmitting
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Icon(
                              Icons.camera_alt_rounded,
                              color: Colors.white,
                              size: 36,
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetectionPill({
    required IconData icon,
    required String label,
    required bool isActive,
  }) {
    final color = isActive ? AppTheme.primaryLight : Colors.white38;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black80,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color, width: 1.2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

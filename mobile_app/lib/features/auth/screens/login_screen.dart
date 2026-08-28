import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../../core/storage/secure_storage.dart';
import '../../../core/config/api_constants.dart';
import '../models/employee_model.dart';
import '../../home/screens/home_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _identifierController = TextEditingController(text: 'DRP01');
  final _passwordController = TextEditingController(text: 'password123');
  final _serverUrlController = TextEditingController(text: ApiConstants.defaultBaseUrl);
  bool _isLoading = false;
  String? _errorMessage;
  bool _showServerConfig = false;

  @override
  void initState() {
    super.initState();
    _loadSavedServerUrl();
  }

  Future<void> _loadSavedServerUrl() async {
    final saved = await SecureStorageService.getBaseUrl();
    if (saved != null && saved.isNotEmpty) {
      setState(() {
        _serverUrlController.text = saved;
      });
    }
  }

  Future<void> _handleLogin() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Save base URL if configured
      await SecureStorageService.saveBaseUrl(_serverUrlController.text.trim());
      ApiClient.reset();

      final dio = await ApiClient.getInstance();
      final response = await dio.post(
        ApiConstants.employeeLogin,
        data: {
          'identifier': _identifierController.text.trim(),
          'password': _passwordController.text.trim(),
        },
      );

      if (response.data['success'] == true) {
        final token = response.data['data']['token'];
        final empJson = response.data['data']['employee'];

        await SecureStorageService.saveToken(token);
        await SecureStorageService.saveEmployee(empJson);

        final employee = EmployeeModel.fromJson(empJson);

        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => HomeScreen(employee: employee)),
        );
      } else if (response.data['isPendingApproval'] == true) {
        setState(() {
          _errorMessage = '⏳ Account Pending Approval: Your registration is awaiting administrator review.';
        });
      } else {
        setState(() {
          _errorMessage = response.data['message'] ?? 'Authentication failed';
        });
      }
    } on DioException catch (e) {
      if (e.response?.data?['isPendingApproval'] == true) {
        setState(() {
          _errorMessage = '⏳ Account Pending Approval: You have successfully registered. Please wait for an administrator to approve your account before signing in.';
        });
      } else {
        setState(() {
          _errorMessage = e.response?.data?['message'] ??
              'Connection failed. Check server address: ${_serverUrlController.text}';
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error: $e';
      });
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // App Logo Badge
                Center(
                  child: Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppTheme.primary, AppTheme.accent],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(22),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primary.withOpacity(0.35),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.qr_code_scanner_rounded,
                      size: 42,
                      color: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // App Title
                const Text(
                  'DRP Technology Attendance',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Touchless QR & Biometric Presence Verification',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.white.withOpacity(0.6),
                  ),
                ),
                const SizedBox(height: 36),

                // Error Message Card
                if (_errorMessage != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppTheme.error.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppTheme.error.withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.error_outline_rounded, color: AppTheme.error, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(color: AppTheme.error, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Employee ID / Code
                Text(
                  'Employee Code / Email',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.8)),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _identifierController,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: 'e.g. DRP01 or DRP02',
                    hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                    filled: true,
                    fillColor: AppTheme.surface,
                    prefixIcon: const Icon(Icons.badge_outlined, color: AppTheme.primaryLight, size: 20),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppTheme.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppTheme.border),
                    ),
                  ),
                ),
                const SizedBox(height: 18),

                // Password
                Text(
                  'Password',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white.withOpacity(0.8)),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  style: const TextStyle(color: Colors.white, fontSize: 14),
                  decoration: InputDecoration(
                    hintText: '••••••••',
                    hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                    filled: true,
                    fillColor: AppTheme.surface,
                    prefixIcon: const Icon(Icons.lock_outline_rounded, color: AppTheme.primaryLight, size: 20),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppTheme.border),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: const BorderSide(color: AppTheme.border),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // Submit Button
                ElevatedButton(
                  onPressed: _isLoading ? null : _handleLogin,
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white),
                        )
                      : const Text('Sign In to Mobile Portal'),
                ),
                const SizedBox(height: 20),

                // Server URL Config Switcher
                Center(
                  child: TextButton.icon(
                    onPressed: () => setState(() => _showServerConfig = !_showServerConfig),
                    icon: const Icon(Icons.settings_ethernet_rounded, size: 16, color: AppTheme.accent),
                    label: Text(
                      _showServerConfig ? 'Hide Server Config' : 'Server Connection Config',
                      style: const TextStyle(color: AppTheme.accent, fontSize: 12),
                    ),
                  ),
                ),

                if (_showServerConfig) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.surfaceElevated,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Backend API Base URL',
                          style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 6),
                        TextField(
                          controller: _serverUrlController,
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontFamily: 'monospace'),
                          decoration: InputDecoration(
                            hintText: 'http://192.168.1.X:5000/api/v1',
                            filled: true,
                            fillColor: AppTheme.background,
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '• Emulator: http://10.0.2.2:5000/api/v1\n• Physical Phone: http://<YOUR_PC_IP>:5000/api/v1',
                          style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 10, height: 1.3),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

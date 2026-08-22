import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/theme/app_theme.dart';
import 'core/storage/secure_storage.dart';
import 'features/auth/models/employee_model.dart';
import 'features/auth/screens/login_screen.dart';
import 'features/home/screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set immersive status bar styling
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      systemNavigationBarColor: AppTheme.background,
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );

  // Check saved session
  final token = await SecureStorageService.getToken();
  final employeeJson = await SecureStorageService.getEmployee();

  Widget initialScreen = const LoginScreen();

  if (token != null && employeeJson != null) {
    try {
      final employee = EmployeeModel.fromJson(employeeJson);
      initialScreen = HomeScreen(employee: employee);
    } catch (_) {
      initialScreen = const LoginScreen();
    }
  }

  runApp(AeroVerifyApp(initialScreen: initialScreen));
}

class AeroVerifyApp extends StatelessWidget {
  final Widget initialScreen;

  const AeroVerifyApp({Key? key, required this.initialScreen}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'DRP Technology Attendance',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      home: initialScreen,
    );
  }
}

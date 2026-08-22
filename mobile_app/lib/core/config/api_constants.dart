class ApiConstants {
  // Default base URL (can be changed in app settings)
  // For Android Emulator use 10.0.2.2; for physical Android device on Wi-Fi use computer's IP (e.g. 192.168.1.X)
  static const String defaultBaseUrl = 'http://10.0.2.2:5000/api/v1';

  // Auth endpoints
  static const String employeeLogin = '/auth/employee-login';
  static const String profileMe = '/auth/me';

  // Attendance endpoints
  static const String verifyAttendance = '/attendance/verify';
  static const String attendanceLogs = '/attendance/logs';
  static const String organization = '/org';
}

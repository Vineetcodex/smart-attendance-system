class ApiConstants {
  // Default base URL (can be changed in app settings)
  // Default to 24/7 Global Cloud Backend on Render; can also use computer LAN IP for local testing
  static const String defaultBaseUrl = 'https://smart-attendance-system-sdnf.onrender.com/api/v1';

  // Auth endpoints
  static const String employeeLogin = '/auth/employee-login';
  static const String profileMe = '/auth/me';

  // Attendance endpoints
  static const String verifyAttendance = '/attendance/verify';
  static const String attendanceLogs = '/attendance/logs';
  static const String organization = '/org';
}

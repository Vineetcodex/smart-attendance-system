import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SecureStorageService {
  static const _storage = FlutterSecureStorage();
  static const String _keyToken = 'auth_jwt_token';
  static const String _keyEmployee = 'cached_employee_profile';
  static const String _keyBaseUrl = 'custom_base_url';
  static const String _keyOfflineQueue = 'offline_attendance_queue';

  // Save Token
  static Future<void> saveToken(String token) async {
    await _storage.write(key: _keyToken, value: token);
  }

  static Future<String?> getToken() async {
    return await _storage.read(key: _keyToken);
  }

  static Future<void> clearAuth() async {
    await _storage.delete(key: _keyToken);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyEmployee);
  }

  // Employee Profile
  static Future<void> saveEmployee(Map<String, dynamic> data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyEmployee, jsonEncode(data));
  }

  static Future<Map<String, dynamic>?> getEmployee() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_keyEmployee);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  // Base URL
  static Future<void> saveBaseUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyBaseUrl, url);
  }

  static Future<String?> getBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyBaseUrl);
  }

  // Offline Queue
  static Future<void> queueOfflineAttempt(Map<String, dynamic> payload) async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> list = prefs.getStringList(_keyOfflineQueue) ?? [];
    list.add(jsonEncode(payload));
    await prefs.setStringList(_keyOfflineQueue, list);
  }

  static Future<List<Map<String, dynamic>>> getOfflineQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final List<String> list = prefs.getStringList(_keyOfflineQueue) ?? [];
    return list.map((item) => jsonDecode(item) as Map<String, dynamic>).toList();
  }

  static Future<void> clearOfflineQueue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyOfflineQueue);
  }
}

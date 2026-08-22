import 'package:geolocator/geolocator.dart';

class LocationService {
  /**
   * Fetches high accuracy GPS position and inspects anti-spoofing flags.
   */
  static Future<Position> getVerifiedLocation() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw Exception('Location services are disabled on your device. Please turn on GPS.');
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw Exception('Location permissions are denied. Geofence verification required.');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw Exception('Location permissions are permanently denied. Enable in Android App Settings.');
    }

    // High accuracy GPS fix
    final Position position = await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
      timeLimit: const Duration(seconds: 10),
    );

    // Anti-Spoofing: Check if location originated from a mock provider
    if (position.isMocked) {
      throw Exception('Security Warning: Mock / Fake GPS application detected. Attendance rejected.');
    }

    return position;
  }

  /**
   * Computes approximate distance in meters to office coordinates.
   */
  static double getDistanceToOffice(
    double currentLat,
    double currentLng,
    double officeLat,
    double officeLng,
  ) {
    return Geolocator.distanceBetween(currentLat, currentLng, officeLat, officeLng);
  }
}

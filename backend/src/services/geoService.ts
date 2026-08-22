export class GeoService {
  private static readonly EARTH_RADIUS_METERS = 6371000; // Earth's mean radius in meters

  /**
   * Calculates the great-circle distance between two geographic coordinates using the Haversine formula.
   * Returns distance in meters.
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (deg: number) => (deg * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = this.EARTH_RADIUS_METERS * c;
    return parseFloat(distance.toFixed(1));
  }

  /**
   * Validates if a user's device location is within the office geofence radius.
   */
  static verifyGeofence(
    deviceLat: number,
    deviceLng: number,
    officeLat: number,
    officeLng: number,
    radiusMeters: number,
    isMockLocation: boolean = false
  ): {
    isInside: boolean;
    distanceMeters: number;
    error?: string;
  } {
    if (isMockLocation) {
      return {
        isInside: false,
        distanceMeters: 0,
        error: 'Security Alert: Mock location provider detected. Attendance rejected.',
      };
    }

    const distance = this.calculateDistance(deviceLat, deviceLng, officeLat, officeLng);

    if (distance > radiusMeters) {
      return {
        isInside: false,
        distanceMeters: distance,
        error: `Out of range. You are ${distance.toFixed(0)}m away (allowed radius: ${radiusMeters}m).`,
      };
    }

    return {
      isInside: true,
      distanceMeters: distance,
    };
  }
}

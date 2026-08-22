import { AttendanceLog } from '../db/database.js';

export class ExportService {
  /**
   * Generates formatted CSV string from attendance records.
   */
  static generateCsv(logs: AttendanceLog[]): string {
    const headers = [
      'Log ID',
      'Date & Time',
      'Employee Code',
      'Employee Name',
      'Department',
      'Status',
      'Anti-Spoof Liveness',
      'Face Similarity (%)',
      'GPS Distance (m)',
      'Latitude',
      'Longitude',
      'Mock GPS Flag',
      'Method',
    ];

    const rows = logs.map((log) => {
      return [
        `"${log.id}"`,
        `"${new Date(log.timestamp).toLocaleString()}"`,
        `"${log.employeeCode}"`,
        `"${log.employeeName}"`,
        `"${log.department}"`,
        `"${log.status}"`,
        `"${log.antiSpoofPassed !== false ? 'GENUINE_LIVE' : 'SPOOF_ALERT'}"`,
        `"${(log.faceSimilarityScore * 100).toFixed(1)}%"`,
        `"${log.distanceMeters != null ? log.distanceMeters.toFixed(1) : 'N/A'}"`,
        `"${log.latitude ?? ''}"`,
        `"${log.longitude ?? ''}"`,
        `"${log.isMockLocation ? 'YES (SPOOFED)' : 'NO'}"`,
        `"${log.verificationMethod}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }
}

import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  jwtSecret: process.env.JWT_SECRET || 'attendance_super_secret_jwt_key_2026_x89f_secure',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  masterQrSecretKey: process.env.MASTER_QR_SECRET_KEY || '32_char_master_qr_aes_secret_key!', // 32 bytes
  geofenceDefaultRadius: parseInt(process.env.GEOFENCE_RADIUS || '50', 10), // 50 meters
  faceSimilarityThreshold: parseFloat(process.env.FACE_THRESHOLD || '0.85'), // 85% match
  uploadsDir: path.join(process.cwd(), 'uploads'),
  dataDir: path.join(process.cwd(), 'data'),
};

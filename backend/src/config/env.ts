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
  supabaseUrl: process.env.SUPABASE_URL || 'https://tbwljslhmcgrxfbzddjg.supabase.co',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_1F37cUkr71KYkpdkWpM2Ig_DRajz0P-',
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || '',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'DRP Technology Security <no-reply@drptech.com>',
};


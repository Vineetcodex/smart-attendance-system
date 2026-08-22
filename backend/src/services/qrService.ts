import crypto from 'crypto';
import QRCode from 'qrcode';
import { config } from '../config/env.js';

export interface MasterQrPayload {
  orgId: string;
  version: number;
  lat: number;
  lng: number;
  radius: number;
  salt: string;
  generatedAt: number;
}

export class QrService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;

  // Derives a 32-byte key
  private static getKey(): Buffer {
    return crypto.scryptSync(config.masterQrSecretKey, 'attendance_salt_2026', 32);
  }

  /**
   * Generates an encrypted, signed Master QR payload string.
   */
  static generateMasterPayload(orgId: string, lat: number, lng: number, radius: number): {
    payloadString: string;
    salt: string;
  } {
    const salt = crypto.randomBytes(16).toString('hex');
    const data: MasterQrPayload = {
      orgId,
      version: 1,
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      radius,
      salt,
      generatedAt: Date.now(),
    };

    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.getKey(), iv);
    
    const jsonStr = JSON.stringify(data);
    let encrypted = cipher.update(jsonStr, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: "QR-ATTEND-V1:<iv>:<authTag>:<encryptedPayload>"
    const combined = `QR-ATTEND-V1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    
    return {
      payloadString: combined,
      salt,
    };
  }

  /**
   * Decrypts and validates the Master QR payload scanned by the mobile camera.
   */
  static verifyMasterPayload(scannedRawText: string, expectedOrgId: string): {
    isValid: boolean;
    data?: MasterQrPayload;
    error?: string;
  } {
    try {
      if (!scannedRawText.startsWith('QR-ATTEND-V1:')) {
        return { isValid: false, error: 'Invalid QR signature or unsupported QR format.' };
      }

      const parts = scannedRawText.split(':');
      if (parts.length !== 4) {
        return { isValid: false, error: 'Corrupted QR code payload structure.' };
      }

      const [, ivHex, authTagHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');

      const decipher = crypto.createDecipheriv(this.ALGORITHM, this.getKey(), iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      const parsed: MasterQrPayload = JSON.parse(decrypted);

      if (parsed.orgId !== expectedOrgId) {
        return { isValid: false, error: 'QR Code belongs to a different organization/branch.' };
      }

      return {
        isValid: true,
        data: parsed,
      };
    } catch (err: any) {
      return {
        isValid: false,
        error: `QR Decryption failed: ${err.message || 'Signature mismatch'}`,
      };
    }
  }

  /**
   * Generates a Data URL (PNG base64) for displaying in the web UI.
   */
  static async generateQrDataUrl(payload: string): Promise<string> {
    return QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 512,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  }

  /**
   * Generates an SVG string of the QR Code for crisp vector printing.
   */
  static async generateQrSvg(payload: string): Promise<string> {
    return QRCode.toString(payload, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  }
}

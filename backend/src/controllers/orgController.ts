import { Request, Response } from 'express';
import { db, Organization } from '../db/database.js';
import { QrService } from '../services/qrService.js';
import { AuthRequest } from '../middleware/authMiddleware.js';

export class OrgController {
  /**
   * Get primary Organization settings and current Master QR
   */
  static async getOrganization(req: Request, res: Response) {
    try {
      const org = db.getPrimaryOrganization();
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization not found. Please initialize settings.' });
      }

      return res.json({
        success: true,
        data: org,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Update Organization Settings (Coordinates, Geofence radius, Address)
   */
  static async updateOrganization(req: AuthRequest, res: Response) {
    try {
      const { name, address, latitude, longitude, geofenceRadiusMeters } = req.body;
      let org = db.getPrimaryOrganization();

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const radius = parseInt(geofenceRadiusMeters, 10) || 50;

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ success: false, message: 'Valid latitude and longitude are required.' });
      }

      const orgId = org ? org.id : 'org_default_hq_1';
      const { payloadString, salt } = QrService.generateMasterPayload(orgId, lat, lng, radius);
      const qrDataUrl = await QrService.generateQrDataUrl(payloadString);

      const updatedOrg: Organization = {
        id: orgId,
        name: name || org?.name || 'Main Office HQ',
        code: org?.code || 'HQ-01',
        address: address || org?.address || '100 Innovation Way, Tech Park',
        latitude: lat,
        longitude: lng,
        geofenceRadiusMeters: radius,
        masterQrPayload: payloadString,
        masterQrCodeDataUrl: qrDataUrl,
        qrSecretSalt: salt,
        updatedAt: new Date().toISOString(),
        createdAt: org?.createdAt || new Date().toISOString(),
      };

      db.upsertOrganization(updatedOrg);

      return res.json({
        success: true,
        message: 'Organization and Geofence updated successfully. Master QR regenerated.',
        data: updatedOrg,
      });
    } catch (err: any) {
      console.error('Update org error:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Regenerate Master QR code
   */
  static async regenerateMasterQr(req: AuthRequest, res: Response) {
    try {
      const org = db.getPrimaryOrganization();
      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }

      const { payloadString, salt } = QrService.generateMasterPayload(
        org.id,
        org.latitude,
        org.longitude,
        org.geofenceRadiusMeters
      );
      const qrDataUrl = await QrService.generateQrDataUrl(payloadString);

      org.masterQrPayload = payloadString;
      org.masterQrCodeDataUrl = qrDataUrl;
      org.qrSecretSalt = salt;
      org.updatedAt = new Date().toISOString();

      db.upsertOrganization(org);

      return res.json({
        success: true,
        message: 'New Master QR code generated successfully.',
        data: {
          masterQrPayload: org.masterQrPayload,
          masterQrCodeDataUrl: org.masterQrCodeDataUrl,
          updatedAt: org.updatedAt,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get SVG vector string for printing
   */
  static async getPrintableSvg(req: Request, res: Response) {
    try {
      const org = db.getPrimaryOrganization();
      if (!org) return res.status(404).send('Org not found');

      const svg = await QrService.generateQrSvg(org.masterQrPayload);
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(svg);
    } catch (err: any) {
      return res.status(500).send(err.message);
    }
  }
}

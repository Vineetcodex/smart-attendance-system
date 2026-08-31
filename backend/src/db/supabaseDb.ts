import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';
import { Organization, Employee, AttendanceLog, AdminUser } from './database.js';

export class SupabaseDbManager {
  private client: SupabaseClient | null = null;
  public isConnected = false;

  constructor() {
    if (config.supabaseUrl && config.supabaseSecretKey) {
      try {
        this.client = createClient(config.supabaseUrl, config.supabaseSecretKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      } catch (err) {
        console.warn('Failed to initialize Supabase client:', err);
      }
    }
  }

  /**
   * Test if Supabase tables exist and are accessible.
   */
  async checkConnection(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client.from('organizations').select('id').limit(1);
      if (!error) {
        this.isConnected = true;
        return true;
      }
      this.isConnected = false;
      return false;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  // -------------------------------------------------------------
  // ORGANIZATIONS
  // -------------------------------------------------------------
  async getOrganizations(): Promise<Organization[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client.from('organizations').select('*');
      if (error || !data) return [];
      return data.map((d: any) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        address: d.address,
        latitude: d.latitude,
        longitude: d.longitude,
        geofenceRadiusMeters: d.geofence_radius_meters,
        masterQrPayload: d.master_qr_payload,
        masterQrCodeDataUrl: d.master_qr_code_data_url,
        qrSecretSalt: d.qr_secret_salt,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      }));
    } catch {
      return [];
    }
  }

  async getPrimaryOrganization(): Promise<Organization | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.from('organizations').select('*').limit(1).single();
      if (error || !data) return null;
      return {
        id: data.id,
        name: data.name,
        code: data.code,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        geofenceRadiusMeters: data.geofence_radius_meters,
        masterQrPayload: data.master_qr_payload,
        masterQrCodeDataUrl: data.master_qr_code_data_url,
        qrSecretSalt: data.qr_secret_salt,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  async upsertOrganization(org: Organization): Promise<Organization | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client
        .from('organizations')
        .upsert(
          {
            id: org.id,
            name: org.name,
            code: org.code,
            address: org.address,
            latitude: org.latitude,
            longitude: org.longitude,
            geofence_radius_meters: org.geofenceRadiusMeters,
            master_qr_payload: org.masterQrPayload,
            master_qr_code_data_url: org.masterQrCodeDataUrl,
            qr_secret_salt: org.qrSecretSalt,
            created_at: org.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (error) {
        console.warn('Supabase upsert organization error:', error.message);
        return null;
      }
      return org;
    } catch (err) {
      console.warn('Supabase organization exception:', err);
      return null;
    }
  }


  // -------------------------------------------------------------
  // EMPLOYEES
  // -------------------------------------------------------------
  async getEmployees(orgId?: string): Promise<Employee[]> {
    if (!this.client) return [];
    try {
      let query = this.client.from('employees').select('*');
      if (orgId) {
        query = query.eq('org_id', orgId);
      }
      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((e: any) => {
        let mappedStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'APPROVED';
        if (e.approval_status === 'APPROVED' || e.approval_status === 'REJECTED' || e.approval_status === 'PENDING') {
          mappedStatus = e.approval_status;
        } else if (e.is_approved === true) {
          mappedStatus = 'APPROVED';
        } else if (e.rejection_reason) {
          mappedStatus = 'REJECTED';
        } else if (e.is_active === false) {
          mappedStatus = 'PENDING';
        } else {
          mappedStatus = 'APPROVED';
        }

        return {
          id: e.id,
          orgId: e.org_id,
          employeeCode: e.employee_code,
          fullName: e.full_name,
          email: e.email,
          phone: e.phone || '',
          department: e.department || 'Engineering',
          position: e.position || 'Software Engineer',
          passwordHash: e.password_hash || '',
          faceEmbedding: e.face_embedding || [],
          faceEmbeddings: e.face_embeddings || [],
          photoUrl: e.photo_url || '',
          isActive: e.is_active !== false && mappedStatus !== 'REJECTED',
          isApproved: mappedStatus === 'APPROVED',
          approvalStatus: mappedStatus,
          approvedAt: e.approved_at,
          approvedBy: e.approved_by,
          rejectionReason: e.rejection_reason,
          shiftStart: e.shift_start || '09:00',
          shiftEnd: e.shift_end || '18:00',
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        };
      });
    } catch {
      return [];
    }
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.from('employees').select('*').eq('id', id).single();
      if (error || !data) return null;

      let mappedStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'APPROVED';
      if (data.approval_status === 'APPROVED' || data.approval_status === 'REJECTED' || data.approval_status === 'PENDING') {
        mappedStatus = data.approval_status;
      } else if (data.is_approved === true) {
        mappedStatus = 'APPROVED';
      } else if (data.rejection_reason) {
        mappedStatus = 'REJECTED';
      } else if (data.is_active === false) {
        mappedStatus = 'PENDING';
      } else {
        mappedStatus = 'APPROVED';
      }

      return {
        id: data.id,
        orgId: data.org_id,
        employeeCode: data.employee_code,
        fullName: data.full_name,
        email: data.email,
        phone: data.phone || '',
        department: data.department || 'Engineering',
        position: data.position || 'Software Engineer',
        passwordHash: data.password_hash || '',
        faceEmbedding: data.face_embedding || [],
        faceEmbeddings: data.face_embeddings || [],
        photoUrl: data.photo_url || '',
        isActive: data.is_active !== false && mappedStatus !== 'REJECTED',
        isApproved: mappedStatus === 'APPROVED',
        approvalStatus: mappedStatus,
        approvedAt: data.approved_at,
        approvedBy: data.approved_by,
        rejectionReason: data.rejection_reason,
        shiftStart: data.shift_start || '09:00',
        shiftEnd: data.shift_end || '18:00',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  async getEmployeeByCode(code: string): Promise<Employee | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client
        .from('employees')
        .select('*')
        .ilike('employee_code', code)
        .single();
      if (error || !data) return null;

      let mappedStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'APPROVED';
      if (data.approval_status === 'APPROVED' || data.approval_status === 'REJECTED' || data.approval_status === 'PENDING') {
        mappedStatus = data.approval_status;
      } else if (data.is_approved === true) {
        mappedStatus = 'APPROVED';
      } else if (data.rejection_reason) {
        mappedStatus = 'REJECTED';
      } else if (data.is_active === false) {
        mappedStatus = 'PENDING';
      } else {
        mappedStatus = 'APPROVED';
      }

      return {
        id: data.id,
        orgId: data.org_id,
        employeeCode: data.employee_code,
        fullName: data.full_name,
        email: data.email,
        phone: data.phone || '',
        department: data.department || 'Engineering',
        position: data.position || 'Software Engineer',
        passwordHash: data.password_hash || '',
        faceEmbedding: data.face_embedding || [],
        faceEmbeddings: data.face_embeddings || [],
        photoUrl: data.photo_url || '',
        isActive: data.is_active !== false && mappedStatus !== 'REJECTED',
        isApproved: mappedStatus === 'APPROVED',
        approvalStatus: mappedStatus,
        approvedAt: data.approved_at,
        approvedBy: data.approved_by,
        rejectionReason: data.rejection_reason,
        shiftStart: data.shift_start || '09:00',
        shiftEnd: data.shift_end || '18:00',
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  }

  async upsertEmployee(emp: Employee): Promise<Employee | null> {
    if (!this.client) return null;
    try {
      const isApprovedClean = emp.approvalStatus === 'APPROVED' || (emp.isApproved === true && emp.approvalStatus !== 'PENDING' && emp.approvalStatus !== 'REJECTED');

      const payload: any = {
        id: emp.id,
        org_id: emp.orgId,
        employee_code: emp.employeeCode,
        full_name: emp.fullName,
        email: emp.email,
        phone: emp.phone || '',
        department: emp.department || 'Engineering',
        position: emp.position || 'Software Engineer',
        password_hash: emp.passwordHash || '',
        face_embedding: emp.faceEmbedding || [],
        face_embeddings: emp.faceEmbeddings || (emp.faceEmbedding ? [emp.faceEmbedding] : []),
        photo_url: emp.photoUrl || '',
        is_active: isApprovedClean && emp.isActive !== false,
        is_approved: isApprovedClean,
        approval_status: isApprovedClean ? 'APPROVED' : (emp.approvalStatus || 'PENDING'),
        approved_at: isApprovedClean ? (emp.approvedAt || new Date().toISOString()) : null,
        approved_by: isApprovedClean ? (emp.approvedBy || 'Admin') : null,
        rejection_reason: emp.approvalStatus === 'REJECTED' ? emp.rejectionReason : null,
        shift_start: emp.shiftStart || '09:00',
        shift_end: emp.shiftEnd || '18:00',
        created_at: emp.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      let { error } = await this.client.from('employees').upsert(payload, { onConflict: 'id' });

      if (error && error.message && error.message.toLowerCase().includes('column')) {
        // Fallback to core columns if extended columns (approval_status, etc.) are missing from Supabase schema
        const corePayload: any = {
          id: emp.id,
          org_id: emp.orgId,
          employee_code: emp.employeeCode,
          full_name: emp.fullName,
          email: emp.email,
          phone: emp.phone || '',
          department: emp.department || 'Engineering',
          position: emp.position || 'Software Engineer',
          password_hash: emp.passwordHash || '',
          face_embedding: emp.faceEmbedding || [],
          photo_url: emp.photoUrl || '',
          is_active: isApprovedClean && emp.isActive !== false,
          shift_start: emp.shiftStart || '09:00',
          shift_end: emp.shiftEnd || '18:00',
          created_at: emp.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const fallbackRes = await this.client.from('employees').upsert(corePayload, { onConflict: 'id' });
        error = fallbackRes.error;
      }

      if (error) {
        console.warn('Supabase upsert employee error:', error.message);
        return null;
      }
      return emp;
    } catch (err) {
      console.warn('Supabase employee exception:', err);
      return null;
    }
  }

  async deleteEmployee(idOrCode: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const { error } = await this.client
        .from('employees')
        .delete()
        .or(`id.eq.${idOrCode},employee_code.ilike.${idOrCode}`);
      if (error) {
        console.warn('Supabase delete employee error:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase delete employee exception:', err);
      return false;
    }
  }

  // -------------------------------------------------------------
  // ATTENDANCE LOGS
  // -------------------------------------------------------------
  async getAttendanceLogs(filter?: {
    orgId?: string;
    employeeId?: string;
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<AttendanceLog[]> {
    if (!this.client) return [];
    try {
      let query = this.client.from('attendance_logs').select('*');
      if (filter?.orgId) query = query.eq('org_id', filter.orgId);
      if (filter?.employeeId) query = query.eq('employee_id', filter.employeeId);
      if (filter?.department && filter.department !== 'ALL') {
        query = query.ilike('department', filter.department);
      }
      if (filter?.status && filter.status !== 'ALL') {
        query = query.eq('status', filter.status);
      }
      if (filter?.startDate) query = query.gte('timestamp', filter.startDate);
      if (filter?.endDate) query = query.lte('timestamp', filter.endDate);

      query = query.order('timestamp', { ascending: false });

      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((l: any) => ({
        id: l.id,
        employeeId: l.employee_id,
        employeeCode: l.employee_code,
        employeeName: l.employee_name,
        department: l.department,
        orgId: l.org_id,
        timestamp: l.timestamp,
        punchType: l.punch_type,
        workDurationMinutes: l.work_duration_minutes,
        status: l.status,
        qrMatchStatus: l.qr_match_status,
        faceSimilarityScore: l.face_similarity_score,
        livenessScore: l.liveness_score,
        antiSpoofPassed: l.anti_spoof_passed,
        latitude: l.latitude,
        longitude: l.longitude,
        distanceMeters: l.distance_meters,
        isMockLocation: l.is_mock_location,
        snapshotUrl: l.snapshot_url,
        failureReason: l.failure_reason,
        verificationMethod: l.verification_method,
        createdAt: l.created_at,
      }));
    } catch {
      return [];
    }
  }

  async createAttendanceLog(log: AttendanceLog): Promise<AttendanceLog | null> {
    if (!this.client) return null;
    try {
      const { error } = await this.client.from('attendance_logs').insert({
        id: log.id,
        employee_id: log.employeeId,
        employee_code: log.employeeCode,
        employee_name: log.employeeName,
        department: log.department,
        org_id: log.orgId,
        timestamp: log.timestamp,
        punch_type: log.punchType || 'CHECK_IN',
        work_duration_minutes: log.workDurationMinutes,
        status: log.status,
        qr_match_status: log.qrMatchStatus,
        face_similarity_score: log.faceSimilarityScore,
        liveness_score: log.livenessScore,
        anti_spoof_passed: log.antiSpoofPassed,
        latitude: log.latitude,
        longitude: log.longitude,
        distance_meters: log.distanceMeters,
        is_mock_location: log.isMockLocation,
        snapshot_url: log.snapshotUrl,
        failure_reason: log.failureReason,
        verification_method: log.verificationMethod,
        created_at: log.createdAt || new Date().toISOString(),
      });

      if (error) {
        console.warn('Supabase create log error:', error.message);
        return null;
      }
      return log;
    } catch (err) {
      console.warn('Supabase log exception:', err);
      return null;
    }
  }

  // -------------------------------------------------------------
  // ADMIN USERS
  // -------------------------------------------------------------
  async getAdminByEmail(email: string): Promise<AdminUser | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client
        .from('admin_users')
        .select('*')
        .ilike('email', email)
        .single();
      if (error || !data) return null;

      return {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        passwordHash: data.password_hash,
        role: data.role,
        orgId: data.org_id,
        createdAt: data.created_at,
      };
    } catch {
      return null;
    }
  }

  async getAdmins(): Promise<AdminUser[]> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client.from('admin_users').select('*');
      if (error || !data) return [];
      return data.map((d: any) => ({
        id: d.id,
        email: d.email,
        fullName: d.full_name,
        passwordHash: d.password_hash,
        role: d.role,
        orgId: d.org_id,
        createdAt: d.created_at,
      }));
    } catch {
      return [];
    }
  }

  async upsertAdmin(admin: AdminUser): Promise<AdminUser | null> {
    if (!this.client) return null;
    try {
      const { error } = await this.client.from('admin_users').upsert(
        {
          id: admin.id,
          email: admin.email,
          full_name: admin.fullName,
          password_hash: admin.passwordHash,
          role: admin.role,
          org_id: admin.orgId,
          created_at: admin.createdAt || new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.warn('Supabase upsert admin error:', error.message);
        return null;
      }
      return admin;
    } catch {
      return null;
    }
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }
}

export const supabaseDb = new SupabaseDbManager();


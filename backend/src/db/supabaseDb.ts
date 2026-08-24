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

      return data.map((e: any) => ({
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
        isActive: e.is_active !== false,
        shiftStart: e.shift_start || '09:00',
        shiftEnd: e.shift_end || '18:00',
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      }));
    } catch {
      return [];
    }
  }

  async getEmployeeById(id: string): Promise<Employee | null> {
    if (!this.client) return null;
    try {
      const { data, error } = await this.client.from('employees').select('*').eq('id', id).single();
      if (error || !data) return null;

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
        isActive: data.is_active !== false,
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
        isActive: data.is_active !== false,
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
      const { error } = await this.client.from('employees').upsert(
        {
          id: emp.id,
          org_id: emp.orgId,
          employee_code: emp.employeeCode,
          full_name: emp.fullName,
          email: emp.email,
          phone: emp.phone,
          department: emp.department,
          position: emp.position,
          password_hash: emp.passwordHash,
          face_embedding: emp.faceEmbedding,
          face_embeddings: emp.faceEmbeddings,
          photo_url: emp.photoUrl,
          is_active: emp.isActive,
          shift_start: emp.shiftStart,
          shift_end: emp.shiftEnd,
          created_at: emp.createdAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

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
}

export const supabaseDb = new SupabaseDbManager();

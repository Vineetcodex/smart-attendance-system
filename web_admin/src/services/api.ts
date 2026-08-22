import axios from 'axios';

// When running in dev, proxied or direct
export const API_BASE = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token') || localStorage.getItem('employee_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Organization {
  id: string;
  name: string;
  code: string;
  address: string;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  masterQrPayload: string;
  masterQrCodeDataUrl: string;
  qrSecretSalt: string;
  updatedAt: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  orgId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  password?: string;
  phone?: string;
  department: string;
  position: string;
  faceEmbedding: number[];
  faceEmbeddings?: number[][];
  photoUrl?: string;
  isActive: boolean;
  shiftStart?: string;
  shiftEnd?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  orgId: string;
  timestamp: string;
  status: 'PRESENT' | 'LATE' | 'REJECTED';
  faceSimilarityScore: number;
  livenessScore?: number;
  antiSpoofPassed?: boolean;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  isMockLocation?: boolean;
  snapshotUrl?: string;
  qrMatchStatus?: boolean;
  failureReason?: string;
  verificationMethod: 'FACIAL_BIOMETRIC' | 'DUAL_QR_FACE' | 'TRIPLE_FACTOR' | 'MANUAL_OVERRIDE';
  createdAt: string;
}

export interface AttendanceStats {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  rejectedAttemptsToday: number;
  averageConfidence: number;
  attendanceRate: number;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await apiClient.post('/auth/admin-login', { email, password });
    if (res.data.data?.token) {
      localStorage.setItem('admin_token', res.data.data.token);
      localStorage.setItem('admin_user', JSON.stringify(res.data.data.user));
    }
    return res.data;
  },

  async employeeLogin(identifier: string, password: string) {
    const res = await apiClient.post('/auth/employee-login', { identifier, password });
    if (res.data.data?.token) {
      localStorage.setItem('employee_token', res.data.data.token);
      localStorage.setItem('employee_user', JSON.stringify(res.data.data.employee));
    }
    return res.data;
  },

  async employeeSignup(data: {
    fullName: string;
    employeeCode?: string;
    email: string;
    password: string;
    phone?: string;
    department?: string;
    position?: string;
    shiftStart?: string;
    shiftEnd?: string;
    faceEmbedding?: number[];
    faceEmbeddings?: number[][];
    photoUrl?: string;
  }) {
    const res = await apiClient.post('/auth/employee-signup', data);
    if (res.data.data?.token) {
      localStorage.setItem('employee_token', res.data.data.token);
      localStorage.setItem('employee_user', JSON.stringify(res.data.data.employee));
    }
    return res.data;
  },

  async checkFaceDuplicate(faceEmbedding?: number[], faceEmbeddings?: number[][], excludeEmployeeId?: string) {
    const res = await apiClient.post('/auth/check-face-duplicate', {
      faceEmbedding,
      faceEmbeddings,
      excludeEmployeeId,
    });
    return res.data;
  },

  logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  },

  employeeLogout() {
    localStorage.removeItem('employee_token');
    localStorage.removeItem('employee_user');
  },

  getStoredUser() {
    const raw = localStorage.getItem('admin_user');
    return raw ? JSON.parse(raw) : null;
  },

  getStoredEmployee(): Employee | null {
    const raw = localStorage.getItem('employee_user');
    return raw ? JSON.parse(raw) : null;
  },

  // Org & Settings
  async getOrganization(): Promise<Organization> {
    const res = await apiClient.get('/org');
    return res.data.data;
  },

  async updateOrganization(data: Partial<Organization>): Promise<Organization> {
    const res = await apiClient.put('/org', data);
    return res.data.data;
  },

  async regenerateMasterQr() {
    const res = await apiClient.post('/org/regenerate-qr');
    return res.data.data;
  },

  // Employees
  async getEmployees(department?: string): Promise<Employee[]> {
    const res = await apiClient.get('/employees', { params: { department } });
    return res.data.data;
  },

  async createEmployee(data: Partial<Employee>): Promise<Employee> {
    const res = await apiClient.post('/employees', data);
    return res.data.data;
  },

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    const res = await apiClient.put(`/employees/${id}`, data);
    return res.data.data;
  },

  async deleteEmployee(id: string) {
    const res = await apiClient.delete(`/employees/${id}`);
    return res.data;
  },

  // Attendance
  async getAttendanceLogs(params?: {
    department?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    employeeId?: string;
  }): Promise<AttendanceLog[]> {
    const res = await apiClient.get('/attendance/logs', { params });
    return res.data.data;
  },

  async getStats(): Promise<AttendanceStats> {
    const res = await apiClient.get('/attendance/stats');
    return res.data.data;
  },

  getExportCsvUrl(): string {
    return `${API_BASE}/attendance/export/csv`;
  },

  // Facial Biometric & QR Attendance Verification
  async verifyAttendance(payload: {
    employeeId: string;
    qrPayload?: string;
    faceEmbedding: number[];
    livenessScore?: number;
    antiSpoofPassed?: boolean;
    antiSpoofVerdict?: string;
    latitude?: number;
    longitude?: number;
    isMockLocation?: boolean;
    snapshotUrl?: string;
    capturedAt?: string;
  }) {
    const res = await apiClient.post('/attendance/verify', payload);
    return res.data;
  },

  // Live Stream
  createEventSource(): EventSource {
    return new EventSource(`${API_BASE}/attendance/stream`);
  },
};

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  Camera,
  Sparkles,
  Mail,
  Briefcase,
  X,
} from 'lucide-react';
import { api, Employee } from '../services/api.js';
import { WebcamModal } from '../components/WebcamModal.js';
import { validateAndNormalizeEmployeeCode } from '../utils/codeValidator.js';

export const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isWebcamOpen, setIsWebcamOpen] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [position, setPosition] = useState('Software Engineer');
  const [password, setPassword] = useState('password123');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');
  const [photoUrl, setPhotoUrl] = useState('');
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const departments = ['ALL', 'Engineering', 'Product', 'Marketing', 'Sales', 'Human Resources', 'Operations'];

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const data = await api.getEmployees(selectedDept === 'ALL' ? undefined : selectedDept);
      setEmployees(data);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [selectedDept]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const codeValidation = validateAndNormalizeEmployeeCode(employeeCode);
      if (!codeValidation.isValid) {
        alert(codeValidation.error || 'Employee ID must be between DRP01 and DRP10 (e.g. DRP01, DRP02, ... DRP10).');
        setSaving(false);
        return;
      }
      const normalizedCode = codeValidation.normalizedCode;

      await api.createEmployee({
        fullName,
        employeeCode: normalizedCode,
        email,
        department,
        position,
        password,
        shiftStart,
        shiftEnd,
        photoUrl: photoUrl || undefined,
        faceEmbedding: faceEmbedding,
        isApproved: true,
        approvalStatus: 'APPROVED',
      });
      setIsAddModalOpen(false);
      resetForm();
      fetchEmployees();
    } catch (err: any) {
      alert('Error creating employee: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove employee "${name}"?`)) return;
    try {
      await api.deleteEmployee(id);
      fetchEmployees();
    } catch (err: any) {
      alert('Error deleting employee: ' + err.message);
    }
  };

  const resetForm = () => {
    setFullName('');
    setEmployeeCode('');
    setEmail('');
    setDepartment('Engineering');
    setPosition('Software Engineer');
    setPassword('password123');
    setShiftStart('09:00');
    setShiftEnd('18:00');
    setPhotoUrl('');
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto w-full">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
            Employee Directory & Facial Enrollment
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Manage employee credentials and register baseline facial embeddings for touchless verification.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setEmployeeCode(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
            setIsAddModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition w-full sm:w-auto self-stretch sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Onboard New Employee
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, code or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Department Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                selectedDept === dept
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Loading employee directory...</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm glass-panel rounded-2xl border border-slate-800">
          No employees found matching your filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredEmployees.map((emp) => (
            <div
              key={emp.id}
              className="glass-card p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        emp.photoUrl ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(emp.fullName)}`
                      }
                      alt={emp.fullName}
                      className="w-12 h-12 rounded-full bg-slate-800 border-2 border-emerald-500/40 object-cover"
                    />
                    <div>
                      <h4 className="font-semibold text-white text-sm">{emp.fullName}</h4>
                      <p className="text-xs font-mono text-emerald-400 font-semibold">{emp.employeeCode}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(emp.id, emp.fullName)}
                    title="Delete employee"
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>
                      {emp.position} • <span className="text-slate-300">{emp.department}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Shift: {emp.shiftStart || '09:00'} - {emp.shiftEnd || '18:00'}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px] font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  <Sparkles className="w-3 h-3" />
                  Face Enrolled
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Onboard Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-6 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 shrink-0">
              <h3 className="font-semibold text-white text-sm sm:text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                Register New Employee
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Photo & Webcam Enrollment Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center sm:text-left">
                <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-800 border-2 border-emerald-500/40 shrink-0">
                  {photoUrl ? (
                    <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <Users className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 flex-1">
                  <p className="font-semibold text-white">Facial Baseline Photo</p>
                  <p className="text-slate-400 text-[11px]">
                    Used to extract 192-d biometric vector embedding.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsWebcamOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium transition"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Capture via Webcam
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jordan Hayes"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Employee Code <span className="text-emerald-400 font-mono">(DRP01 - DRP10)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="e.g. DRP01 or DRP 01"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jordan@company.com"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Mobile Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  >
                    {departments.filter((d) => d !== 'ALL').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Position / Title</label>
                  <input
                    type="text"
                    required
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. Frontend Dev"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Shift Start Time</label>
                  <input
                    type="time"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Shift End Time</label>
                  <input
                    type="time"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition"
                >
                  {saving ? 'Registering...' : 'Enroll & Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Webcam Capture Modal */}
      <WebcamModal
        isOpen={isWebcamOpen}
        onClose={() => setIsWebcamOpen(false)}
        onCapture={(photoDataUrl, embedding) => {
          setPhotoUrl(photoDataUrl);
          if (embedding) setFaceEmbedding(embedding);
        }}
      />
    </div>
  );
};

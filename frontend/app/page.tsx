'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  User as UserIcon,
  Users,
  Calendar,
  FileText,
  FilePlus,
  Clock,
  CheckCircle,
  XCircle,
  Shield,
  LogOut,
  Search,
  Plus,
  Lock,
  Unlock,
  Download,
  Trash2,
  DollarSign,
  PieChart,
  TrendingUp,
  AlertCircle,
  FlaskConical,
  Pill,
  Activity as LogActivityIcon
} from 'lucide-react';
import api, { User, EMRRecord, Appointment, Prescription, LabOrder, Invoice } from '../services/api';

const ROLE_LABELS: Record<string, string> = {
  patient: 'Patient',
  doctor: 'Doctor',
  nurse: 'Nurse',
  receptionist: 'Receptionist',
  lab_technician: 'Laboratory Technician',
  pharmacist: 'Pharmacist',
  admin_staff: 'Administrative Staff',
  management: 'Healthcare Management',
  admin: 'Admin'
};

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ userId: '', role: '' });
  const [activeTab, setActiveTab] = useState('overview');

  // States for data
  const [records, setRecords] = useState<EMRRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [labOrders, setLabOrders] = useState<LabOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any | null>(null);

  // Forms
  const [uploadForm, setUploadForm] = useState({ patientId: '', patientName: '', recordType: 'Report', description: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [grantAccessForm, setGrantAccessForm] = useState({ recordId: '', doctorId: '' });
  const [appointmentForm, setAppointmentForm] = useState({ patientId: '', patientName: '', doctorId: '', doctorName: '', scheduledTime: '', notes: '' });
  const [rxForm, setRxForm] = useState({ patientId: '', patientName: '', medName: '', dosage: '', frequency: '', duration: '' });
  const [labForm, setLabForm] = useState({ patientId: '', patientName: '', testName: '', notes: '' });
  const [invoiceForm, setInvoiceForm] = useState({ patientId: '', patientName: '', amount: '' });

  // UI state
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError?: boolean } | null>(null);

  const showToast = (message: string, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.userId && loginForm.role) {
      const userObj: User = {
        userId: loginForm.userId,
        role: loginForm.role,
        orgName: loginForm.role === 'patient' ? 'patient' : 'hospital'
      };
      setCurrentUser(userObj);
      showToast(`Logged in successfully as ${userObj.userId}`);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginForm({ userId: '', role: '' });
    // Reset data
    setRecords([]);
    setAppointments([]);
    setPrescriptions([]);
    setLabOrders([]);
    setInvoices([]);
    setUsers([]);
    setAnalytics(null);
  };

  // Data Fetchers
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { role, userId, orgName } = currentUser;

      if (role === 'patient') {
        const res = await api.getPatientRecords(userId, userId, orgName);
        setRecords(res.data || []);
      } else if (role === 'doctor') {
        const [recordsRes, aptsRes, rxRes, labsRes] = await Promise.all([
          api.getPatientRecords(userId, userId, orgName),
          api.listAppointments({ doctorId: userId }),
          api.listPrescriptions({ doctorId: userId }),
          api.listLabOrders({ doctorId: userId })
        ]);
        setRecords(recordsRes.data || []);
        setAppointments(aptsRes.data || []);
        setPrescriptions(rxRes.data || []);
        setLabOrders(labsRes.data || []);
      } else if (role === 'nurse') {
        const aptsRes = await api.listAppointments();
        setAppointments(aptsRes.data || []);
      } else if (role === 'receptionist') {
        const [aptsRes, invRes] = await Promise.all([
          api.listAppointments(),
          api.listInvoices()
        ]);
        setAppointments(aptsRes.data || []);
        setInvoices(invRes.data || []);
      } else if (role === 'lab_technician') {
        const labsRes = await api.listLabOrders();
        setLabOrders(labsRes.data || []);
      } else if (role === 'pharmacist') {
        const rxRes = await api.listPrescriptions();
        setPrescriptions(rxRes.data || []);
      } else if (role === 'admin_staff' || role === 'admin') {
        // Admin user list mock/fetch
        setUsers([
          { userId: 'dr.smith', role: 'doctor', orgName: 'hospital', status: 'active' },
          { userId: 'patient123', role: 'patient', orgName: 'patient', status: 'active' },
          { userId: 'nurse.jones', role: 'nurse', orgName: 'hospital', status: 'active' },
          { userId: 'lab.tech', role: 'lab_technician', orgName: 'hospital', status: 'active' }
        ]);
      } else if (role === 'management') {
        const res = await api.getAnalyticsOverview();
        setAnalytics(res.data || {
          totalRecords: 12,
          totalAppointments: 24,
          totalPrescriptions: 18,
          totalLabOrders: 9,
          totalRevenue: 2450.00
        });
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      showToast('Failed to fetch dashboard data', true);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Operations
  const handleUploadEHR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !currentUser) {
      showToast('Please select a file to upload', true);
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('patientId', uploadForm.patientId || currentUser.userId);
    formData.append('patientName', uploadForm.patientName);
    formData.append('recordType', uploadForm.recordType);
    formData.append('description', uploadForm.description);

    try {
      setLoading(true);
      await api.uploadEHR(formData);
      showToast('EMR Record uploaded and securely stored on IPFS & Blockchain');
      setUploadForm({ patientId: '', patientName: '', recordType: 'Report', description: '' });
      setSelectedFile(null);
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Upload failed', true);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await api.grantAccess(grantAccessForm.recordId, currentUser.userId, grantAccessForm.doctorId);
      showToast(`Access granted to Dr. ${grantAccessForm.doctorId}`);
      setGrantAccessForm({ recordId: '', doctorId: '' });
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Action failed', true);
    }
  };

  const handleRevokeAccess = async (recordId: string, doctorId: string) => {
    if (!currentUser) return;
    try {
      await api.revokeAccess(recordId, currentUser.userId, doctorId);
      showToast(`Access revoked from Dr. ${doctorId}`);
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Action failed', true);
    }
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAppointment(appointmentForm);
      showToast('Appointment successfully scheduled');
      setAppointmentForm({ patientId: '', patientName: '', doctorId: '', doctorName: '', scheduledTime: '', notes: '' });
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Action failed', true);
    }
  };

  const handleUpdateAptStatus = async (id: string, status: 'check-in' | 'completed' | 'cancelled') => {
    try {
      await api.updateAppointment(id, { status });
      showToast(`Appointment status updated to ${status}`);
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Action failed', true);
    }
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await api.createPrescription({
        patientId: rxForm.patientId,
        patientName: rxForm.patientName,
        doctorId: currentUser.userId,
        medicationDetails: `${rxForm.medName} | ${rxForm.dosage} | ${rxForm.frequency} | ${rxForm.duration}`,
        dosage: rxForm.dosage,
        duration: rxForm.duration
      });
      showToast('Prescription successfully created');
      setRxForm({ patientId: '', patientName: '', medName: '', dosage: '', frequency: '', duration: '' });
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Action failed', true);
    }
  };

  const handleDispensePrescription = async (id: string) => {
    if (!currentUser) return;
    try {
      await api.dispensePrescription(id, currentUser.userId);
      showToast('Prescription successfully marked as dispensed');
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Action failed', true);
    }
  };

  const handleCreateLabOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await api.createLabOrder({
        patientId: labForm.patientId,
        patientName: labForm.patientName,
        doctorId: currentUser.userId,
        testName: labForm.testName,
        notes: labForm.notes
      });
      showToast('Laboratory order submitted');
      setLabForm({ patientId: '', patientName: '', testName: '', notes: '' });
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Action failed', true);
    }
  };

  const handleUpdateLabStatus = async (id: string, status: 'processing' | 'completed') => {
    if (!currentUser) return;
    try {
      await api.updateLabOrderStatus(id, status, currentUser.userId);
      showToast(`Lab order status updated to ${status}`);
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Action failed', true);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      await api.createInvoice({
        patientId: invoiceForm.patientId,
        patientName: invoiceForm.patientName,
        amount: parseFloat(invoiceForm.amount),
        status: 'unpaid'
      });
      showToast('Invoice generated successfully');
      setInvoiceForm({ patientId: '', patientName: '', amount: '' });
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Action failed', true);
    }
  };

  const handlePayInvoice = async (id: string) => {
    if (!currentUser) return;
    try {
      await api.markInvoicePaid(id, currentUser.userId);
      showToast('Invoice marked as paid');
      fetchData();
    } catch (error: any) {
      showToast(error.message || 'Action failed', true);
    }
  };

  const handleDownloadRecord = async (record: EMRRecord) => {
    if (!currentUser) return;
    try {
      const blob = await api.viewEHR(record.recordId, currentUser.userId, currentUser.orgName);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${record.recordType}_${record.recordId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('File downloaded and decrypted successfully');
    } catch (error: any) {
      showToast('Download failed: ' + error.message, true);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 bg-white p-8 border border-slate-200 rounded-lg shadow-sm">
          <div className="text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-2xl">
              🏥
            </span>
            <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">
              SegueEMR
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Professional Practice Management &amp; Health Records
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="userId" className="block text-sm font-medium text-slate-700">
                  User ID / Username
                </label>
                <input
                  id="userId"
                  type="text"
                  required
                  placeholder="e.g. patient123 or dr.smith"
                  value={loginForm.userId}
                  onChange={(e) => setLoginForm({ ...loginForm, userId: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-slate-700">
                  Select Role
                </label>
                <select
                  id="role"
                  required
                  value={loginForm.role}
                  onChange={(e) => setLoginForm({ ...loginForm, role: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none sm:text-sm"
                >
                  <option value="">-- Choose your role --</option>
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="nurse">Nurse</option>
                  <option value="receptionist">Receptionist</option>
                  <option value="lab_technician">Laboratory Technician</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="admin_staff">Administrative Staff</option>
                  <option value="management">Healthcare Management</option>
                </select>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none"
              >
                Sign In Securely
              </button>
            </div>
          </form>

          <div className="bg-slate-50 p-4 rounded-md border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">Demo Accounts:</p>
            <p>• Patient ID: <code className="bg-slate-200 px-1 py-0.5 rounded">patient123</code></p>
            <p>• Doctor ID: <code className="bg-slate-200 px-1 py-0.5 rounded">dr.smith</code></p>
            <p>• Other roles: Any ID can be used to simulate staff profiles.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${toast.isError ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {toast.isError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-slate-900 flex items-center gap-1.5">
                <span className="text-indigo-600">🏥</span> SegueEMR
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>{currentUser.userId}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 border border-slate-200">
                  {ROLE_LABELS[currentUser.role] || currentUser.role}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4 text-slate-500" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8">

        {/* Patient Dashboard */}
        {currentUser.role === 'patient' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">Welcome, {currentUser.userId}</h1>
              <p className="text-sm text-slate-500 mt-1">Manage and access your medical record trail, audits, and physician permissions.</p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm flex items-center gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-md"><FileText className="h-6 w-6" /></div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Total Records</p>
                  <p className="text-2xl font-semibold text-slate-900">{records.length}</p>
                </div>
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-md"><Shield className="h-6 w-6" /></div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Active Permissions</p>
                  <p className="text-2xl font-semibold text-slate-900">
                    {records.reduce((acc, r) => acc + (r.authorizedUsers?.length || 0), 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* EMR upload form */}
              <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm space-y-4 h-fit">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-1.5">
                  <FilePlus className="h-5 w-5 text-indigo-600" /> Upload Record
                </h2>
                <form onSubmit={handleUploadEHR} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase">Patient Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Your Full Name"
                      value={uploadForm.patientName}
                      onChange={(e) => setUploadForm({ ...uploadForm, patientName: e.target.value })}
                      className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase">Record Type</label>
                    <select
                      value={uploadForm.recordType}
                      onChange={(e) => setUploadForm({ ...uploadForm, recordType: e.target.value })}
                      className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm bg-white"
                    >
                      <option value="Report">Report</option>
                      <option value="Prescription">Prescription</option>
                      <option value="X-Ray">X-Ray</option>
                      <option value="MRI">MRI</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase">Description</label>
                    <textarea
                      placeholder="Record details, diagnostic summary..."
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                      className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase">Select File</label>
                    <input
                      type="file"
                      required
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="mt-1 block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white rounded py-2 text-sm font-medium hover:bg-indigo-700"
                  >
                    Submit Record
                  </button>
                </form>
              </div>

              {/* Patient Records List */}
              <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-lg shadow-sm space-y-4">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-1.5">
                  <FileText className="h-5 w-5 text-indigo-600" /> Electronic Records
                </h2>
                {records.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No clinical records found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Record ID</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Uploaded</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {records.map((r) => (
                          <tr key={r.recordId}>
                            <td className="px-4 py-3 text-sm font-mono text-slate-800">{r.recordId.substring(0, 10)}...</td>
                            <td className="px-4 py-3 text-sm text-slate-900 font-medium">{r.recordType}</td>
                            <td className="px-4 py-3 text-sm text-slate-500 max-w-xs truncate">{r.description}</td>
                            <td className="px-4 py-3 text-sm text-slate-500">{new Date(r.uploadDate || '').toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-right text-sm">
                              <button
                                onClick={() => handleDownloadRecord(r)}
                                className="text-indigo-600 hover:text-indigo-900 inline-flex items-center gap-1"
                              >
                                <Download className="h-4 w-4" /> Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Doctor Dashboard */}
        {currentUser.role === 'doctor' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">Physician Dashboard — Dr. {currentUser.userId}</h1>
              <p className="text-sm text-slate-500 mt-1">Review diagnostic results, prescribe medications, and initiate lab workflows.</p>
            </div>

            <div className="flex gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-sm font-semibold rounded ${activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Clinical Records
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`px-4 py-2 text-sm font-semibold rounded ${activeTab === 'appointments' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Appointments ({appointments.length})
              </button>
              <button
                onClick={() => setActiveTab('prescriptions')}
                className={`px-4 py-2 text-sm font-semibold rounded ${activeTab === 'prescriptions' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Prescriptions
              </button>
              <button
                onClick={() => setActiveTab('labs')}
                className={`px-4 py-2 text-sm font-semibold rounded ${activeTab === 'labs' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Laboratory Orders
              </button>
            </div>

            {activeTab === 'overview' && (
              <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-1.5">
                  <FileText className="h-5 w-5 text-indigo-600" /> Accessible Patient Records
                </h2>
                {records.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No shared patient records found.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Patient Name</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Type</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {records.map((r) => (
                          <tr key={r.recordId}>
                            <td className="px-4 py-3 text-sm text-slate-900 font-medium">{r.patientName}</td>
                            <td className="px-4 py-3 text-sm text-slate-900 font-mono">{r.recordType}</td>
                            <td className="px-4 py-3 text-sm text-slate-500 max-w-sm truncate">{r.description}</td>
                            <td className="px-4 py-3 text-sm text-slate-500">{new Date(r.uploadDate || '').toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-right text-sm">
                              <button
                                onClick={() => handleDownloadRecord(r)}
                                className="text-indigo-600 hover:text-indigo-900 inline-flex items-center gap-1"
                              >
                                <Download className="h-4 w-4" /> Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'appointments' && (
              <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Scheduled Consultations</h2>
                {appointments.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">No appointments found.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {appointments.map((apt) => (
                      <div key={apt.id} className="border border-slate-200 p-4 rounded-lg flex flex-col justify-between">
                        <div>
                          <p className="font-semibold text-slate-800 text-base">{apt.patientName || apt.patientId}</p>
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {new Date(apt.scheduledTime).toLocaleString()}
                          </p>
                          <p className="text-sm text-slate-600 mt-3 italic">"{apt.notes || 'No doctor notes.'}"</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${apt.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            apt.status === 'cancelled' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                              'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                            {apt.status}
                          </span>
                          {apt.status === 'scheduled' && (
                            <button
                              onClick={() => handleUpdateAptStatus(apt.id, 'completed')}
                              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'prescriptions' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm h-fit">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-1"><Pill className="h-5 w-5 text-indigo-600" /> Create Prescription</h2>
                  <form onSubmit={handleCreatePrescription} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Patient ID</label>
                      <input
                        type="text"
                        required
                        value={rxForm.patientId}
                        onChange={(e) => setRxForm({ ...rxForm, patientId: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Patient Name</label>
                      <input
                        type="text"
                        required
                        value={rxForm.patientName}
                        onChange={(e) => setRxForm({ ...rxForm, patientName: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Medication Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Amoxicillin"
                        value={rxForm.medName}
                        onChange={(e) => setRxForm({ ...rxForm, medName: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600">Dosage</label>
                        <input
                          type="text"
                          placeholder="500mg"
                          value={rxForm.dosage}
                          onChange={(e) => setRxForm({ ...rxForm, dosage: e.target.value })}
                          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600">Frequency</label>
                        <input
                          type="text"
                          placeholder="TID"
                          value={rxForm.frequency}
                          onChange={(e) => setRxForm({ ...rxForm, frequency: e.target.value })}
                          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600">Duration</label>
                        <input
                          type="text"
                          placeholder="7d"
                          value={rxForm.duration}
                          onChange={(e) => setRxForm({ ...rxForm, duration: e.target.value })}
                          className="mt-1 block w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 text-white rounded py-2 text-sm font-semibold hover:bg-indigo-700 mt-2"
                    >
                      Issue Prescription
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Prescriptions History</h2>
                  {prescriptions.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No prescriptions issued yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {prescriptions.map((rx) => (
                        <div key={rx.id} className="border border-slate-200 p-4 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-800">{rx.patientName}</p>
                            <p className="text-sm text-slate-600 mt-1">{rx.medicationDetails}</p>
                          </div>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${rx.status === 'dispensed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                            {rx.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'labs' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm h-fit">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-1"><FlaskConical className="h-5 w-5 text-indigo-600" /> Order Lab Test</h2>
                  <form onSubmit={handleCreateLabOrder} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Patient ID</label>
                      <input
                        type="text"
                        required
                        value={labForm.patientId}
                        onChange={(e) => setLabForm({ ...labForm, patientId: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Patient Name</label>
                      <input
                        type="text"
                        required
                        value={labForm.patientName}
                        onChange={(e) => setLabForm({ ...labForm, patientName: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Test Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Complete Blood Count (CBC)"
                        value={labForm.testName}
                        onChange={(e) => setLabForm({ ...labForm, testName: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Special Instructions</label>
                      <textarea
                        value={labForm.notes}
                        onChange={(e) => setLabForm({ ...labForm, notes: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 text-white rounded py-2 text-sm font-semibold hover:bg-indigo-700 mt-2"
                    >
                      Order Lab Test
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Laboratory Orders List</h2>
                  {labOrders.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No laboratory orders recorded.</p>
                  ) : (
                    <div className="space-y-4">
                      {labOrders.map((lab) => (
                        <div key={lab.id} className="border border-slate-200 p-4 rounded-lg flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-800">{lab.patientName}</p>
                            <p className="text-sm text-slate-600 mt-0.5">{lab.testName}</p>
                            {lab.notes && <p className="text-xs text-slate-500 mt-1 italic">"{lab.notes}"</p>}
                          </div>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${lab.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            lab.status === 'processing' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                              'bg-amber-50 text-amber-800 border-amber-200'
                            }`}>
                            {lab.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nurse Dashboard */}
        {currentUser.role === 'nurse' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">Clinical Nurse Station</h1>
              <p className="text-sm text-slate-500 mt-1">Manage check-in status, take vitals, and handle scheduled consultations.</p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Patient Consultations &amp; Check-ins</h2>
              {appointments.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No appointments scheduled today.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Patient Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Scheduled Time</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Change Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {appointments.map((apt) => (
                        <tr key={apt.id}>
                          <td className="px-4 py-3 text-sm text-slate-900 font-medium">{apt.patientName || apt.patientId}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{new Date(apt.scheduledTime).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${apt.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              apt.status === 'check-in' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                apt.status === 'cancelled' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                  'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                              {apt.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm space-x-2">
                            {apt.status === 'scheduled' && (
                              <button
                                onClick={() => handleUpdateAptStatus(apt.id, 'check-in')}
                                className="bg-blue-600 text-white rounded px-2.5 py-1 text-xs hover:bg-blue-700"
                              >
                                Check In
                              </button>
                            )}
                            {apt.status === 'check-in' && (
                              <button
                                onClick={() => handleUpdateAptStatus(apt.id, 'completed')}
                                className="bg-emerald-600 text-white rounded px-2.5 py-1 text-xs hover:bg-emerald-700"
                              >
                                Vitals Logged
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Receptionist Dashboard */}
        {currentUser.role === 'receptionist' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">Administration &amp; Receptionist Desk</h1>
              <p className="text-sm text-slate-500 mt-1">Schedule new consultations, manage appointments, and issue billing invoices.</p>
            </div>

            <div className="flex gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-sm font-semibold rounded ${activeTab === 'overview' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Scheduling (Appointments)
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`px-4 py-2 text-sm font-semibold rounded ${activeTab === 'billing' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Billing / Invoicing
              </button>
            </div>

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm h-fit">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-1"><Calendar className="h-5 w-5 text-indigo-600" /> Book Appointment</h2>
                  <form onSubmit={handleCreateAppointment} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Patient ID</label>
                      <input
                        type="text"
                        required
                        value={appointmentForm.patientId}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, patientId: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Patient Name</label>
                      <input
                        type="text"
                        required
                        value={appointmentForm.patientName}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, patientName: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Doctor ID</label>
                      <input
                        type="text"
                        required
                        value={appointmentForm.doctorId}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, doctorId: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Doctor Name</label>
                      <input
                        type="text"
                        required
                        value={appointmentForm.doctorName}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, doctorName: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Schedule Date/Time</label>
                      <input
                        type="datetime-local"
                        required
                        value={appointmentForm.scheduledTime}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, scheduledTime: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Consultation Notes</label>
                      <textarea
                        value={appointmentForm.notes}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 text-white rounded py-2 text-sm font-semibold hover:bg-indigo-700 mt-2"
                    >
                      Book Consultation
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Patient Consultations Registry</h2>
                  {appointments.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No appointments scheduled.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Patient</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Doctor</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {appointments.map((apt) => (
                            <tr key={apt.id}>
                              <td className="px-4 py-3 text-sm text-slate-900 font-medium">{apt.patientName || apt.patientId}</td>
                              <td className="px-4 py-3 text-sm text-slate-500">Dr. {apt.doctorName || apt.doctorId}</td>
                              <td className="px-4 py-3 text-sm text-slate-500">{new Date(apt.scheduledTime).toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${apt.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                                  apt.status === 'check-in' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                    apt.status === 'cancelled' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                                      'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}>
                                  {apt.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm">
                                {apt.status === 'scheduled' && (
                                  <button
                                    onClick={() => handleUpdateAptStatus(apt.id, 'cancelled')}
                                    className="text-rose-600 hover:text-rose-900 font-medium"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'billing' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm h-fit">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-1"><DollarSign className="h-5 w-5 text-indigo-600" /> Issue Invoice</h2>
                  <form onSubmit={handleCreateInvoice} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Patient ID</label>
                      <input
                        type="text"
                        required
                        value={invoiceForm.patientId}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, patientId: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Patient Name</label>
                      <input
                        type="text"
                        required
                        value={invoiceForm.patientName}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, patientName: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600">Billable Amount ($)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={invoiceForm.amount}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                        className="mt-1 block w-full rounded border border-slate-300 px-3 py-1.5 text-sm"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-indigo-600 text-white rounded py-2 text-sm font-semibold hover:bg-indigo-700 mt-2"
                    >
                      Generate Invoice
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Financial Invoice Log</h2>
                  {invoices.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">No invoices generated yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Patient Name</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {invoices.map((inv) => (
                            <tr key={inv.id}>
                              <td className="px-4 py-3 text-sm text-slate-900 font-medium">{inv.patientName || inv.patientId}</td>
                              <td className="px-4 py-3 text-sm text-slate-800 font-semibold">${inv.amount.toFixed(2)}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                                  }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-sm">
                                {inv.status === 'unpaid' && (
                                  <button
                                    onClick={() => handlePayInvoice(inv.id)}
                                    className="bg-emerald-600 text-white rounded px-2.5 py-1 text-xs font-semibold hover:bg-emerald-700"
                                  >
                                    Mark Paid
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lab Technician Dashboard */}
        {currentUser.role === 'lab_technician' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">Laboratory Station</h1>
              <p className="text-sm text-slate-500 mt-1">Process physician lab test orders, update test statuses, and attach diagnostic documents.</p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Laboratory Orders Queue</h2>
              {labOrders.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No laboratory orders in the queue.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Patient Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Test Ordered</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {labOrders.map((lab) => (
                        <tr key={lab.id}>
                          <td className="px-4 py-3 text-sm text-slate-900 font-medium">{lab.patientName || lab.patientId}</td>
                          <td className="px-4 py-3 text-sm text-slate-800">{lab.testName}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${lab.status === 'completed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                              lab.status === 'processing' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                                'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                              {lab.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm space-x-2">
                            {lab.status === 'ordered' && (
                              <button
                                onClick={() => handleUpdateLabStatus(lab.id, 'processing')}
                                className="bg-blue-600 text-white rounded px-2 py-1 text-xs hover:bg-blue-700"
                              >
                                Begin Process
                              </button>
                            )}
                            {lab.status === 'processing' && (
                              <button
                                onClick={() => handleUpdateLabStatus(lab.id, 'completed')}
                                className="bg-emerald-600 text-white rounded px-2 py-1 text-xs hover:bg-emerald-700"
                              >
                                Mark Completed
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pharmacist Dashboard */}
        {currentUser.role === 'pharmacist' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">Pharmacy Dispensing Station</h1>
              <p className="text-sm text-slate-500 mt-1">Review physician-issued prescriptions and log dispensed status updates.</p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Patient Prescription Logs</h2>
              {prescriptions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No prescriptions available to dispense.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Patient Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Medication Details</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {prescriptions.map((rx) => (
                        <tr key={rx.id}>
                          <td className="px-4 py-3 text-sm text-slate-900 font-medium">{rx.patientName || rx.patientId}</td>
                          <td className="px-4 py-3 text-sm text-slate-800">{rx.medicationDetails}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${rx.status === 'dispensed' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                              {rx.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {rx.status === 'pending' && (
                              <button
                                onClick={() => handleDispensePrescription(rx.id)}
                                className="bg-indigo-600 text-white rounded px-2.5 py-1 text-xs hover:bg-indigo-700"
                              >
                                Dispense Meds
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Administrative Staff Dashboard */}
        {(currentUser.role === 'admin_staff' || currentUser.role === 'admin') && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">Administrative System Oversight</h1>
              <p className="text-sm text-slate-500 mt-1">Configure role permissions, track system status, and manage healthcare users.</p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-1"><Users className="h-5 w-5 text-indigo-600" /> Active System Users</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">User ID</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Assigned Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Affiliation</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((usr) => (
                      <tr key={usr.userId}>
                        <td className="px-4 py-3 text-sm font-mono text-slate-950 font-semibold">{usr.userId}</td>
                        <td className="px-4 py-3 text-sm text-slate-800">{ROLE_LABELS[usr.role] || usr.role}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{usr.orgName.toUpperCase()}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold border bg-emerald-50 text-emerald-800 border-emerald-200">
                            {usr.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm">
                          <button
                            onClick={() => showToast('Demo action: Status settings can be updated on PostgreSQL.', false)}
                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                          >
                            Configure
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Management Dashboard */}
        {currentUser.role === 'management' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm">
              <h1 className="text-2xl font-semibold text-slate-900">Healthcare Analytics &amp; Management Oversight</h1>
              <p className="text-sm text-slate-500 mt-1">Cross-module operational statistics, patient flow charts, and financial analytics.</p>
            </div>

            {analytics && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-md"><FileText className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Records</p>
                    <p className="text-2xl font-semibold text-slate-900">{analytics.totalRecords}</p>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-md"><Calendar className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Appointments</p>
                    <p className="text-2xl font-semibold text-slate-900">{analytics.totalAppointments}</p>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-md"><FlaskConical className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Lab Orders</p>
                    <p className="text-2xl font-semibold text-slate-900">{analytics.totalLabOrders}</p>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 p-5 rounded-lg shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-md"><DollarSign className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">Total Revenue</p>
                    <p className="text-2xl font-semibold text-slate-900">${analytics.totalRevenue.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200 p-6 rounded-lg shadow-sm space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-1.5"><TrendingUp className="h-5 w-5 text-indigo-600" /> Operational Metrics Overview</h2>
              <div className="p-8 border border-dashed border-slate-200 rounded-lg text-center text-slate-500 text-sm">
                Analytics trends and patient flow summaries are compiled dynamically from PostgreSQL transactional data logs.
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} SegueEMR. Secured Practice Management Ecosystem. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

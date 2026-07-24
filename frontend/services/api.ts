import axios from 'axios';

const API_ROOT = 'http://localhost:3000/api';
const API_BASE_URL = `${API_ROOT}/ehr`;

export interface User {
  userId: string;
  role: string;
  orgName: string;
  name?: string;
  status?: string;
}

export interface EMRRecord {
  recordId: string;
  patientId: string;
  patientName: string;
  ipfsHash?: string;
  fileUrl?: string;
  recordType: string;
  description: string;
  fileSize: number;
  uploadedBy: string;
  uploadDate: string;
  createdAt?: string;
  authorizedUsers?: string[];
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  scheduledTime: string;
  status: 'scheduled' | 'check-in' | 'completed' | 'cancelled';
  notes?: string;
  createdAt?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  emrRecordId?: string;
  medicationDetails: string;
  dosage: string;
  duration: string;
  status: 'pending' | 'dispensed';
  dispensedBy?: string;
  createdAt: string;
}

export interface LabOrder {
  id: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName?: string;
  emrRecordId?: string;
  testName: string;
  notes?: string;
  status: 'ordered' | 'processing' | 'completed';
  resultsUrl?: string;
  processedBy?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  patientId: string;
  patientName?: string;
  amount: number;
  status: 'unpaid' | 'paid';
  generatedBy?: string;
  paidAt?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

const api = {
  // EHR records
  uploadEHR: async (formData: FormData): Promise<ApiResponse<EMRRecord>> => {
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  viewEHR: async (recordId: string, userId: string, orgName: string): Promise<Blob> => {
    const response = await axios.get(`${API_BASE_URL}/view`, {
      params: { recordId, userId, orgName },
      responseType: 'blob'
    });
    return response.data;
  },

  getRecordDetails: async (recordId: string, userId: string, orgName: string): Promise<ApiResponse<{ blockchain: any, metadata: EMRRecord }>> => {
    const response = await axios.get(`${API_BASE_URL}/details`, {
      params: { recordId, userId, orgName }
    });
    return response.data;
  },

  grantAccess: async (recordId: string, patientId: string, doctorId: string): Promise<ApiResponse<any>> => {
    const response = await axios.post(`${API_BASE_URL}/grant-access`, {
      recordId,
      patientId,
      doctorId
    });
    return response.data;
  },

  revokeAccess: async (recordId: string, patientId: string, doctorId: string): Promise<ApiResponse<any>> => {
    const response = await axios.post(`${API_BASE_URL}/revoke-access`, {
      recordId,
      patientId,
      doctorId
    });
    return response.data;
  },

  getAccessHistory: async (recordId: string, userId: string, orgName: string): Promise<ApiResponse<any>> => {
    const response = await axios.get(`${API_BASE_URL}/history`, {
      params: { recordId, userId, orgName }
    });
    return response.data;
  },

  getPatientRecords: async (patientId: string, userId: string, orgName: string): Promise<ApiResponse<EMMRRecord[]>> => {
    const response = await axios.get(`${API_BASE_URL}/patient-records`, {
      params: { patientId, userId, orgName }
    });
    return response.data;
  },

  registerUser: async (userId: string, orgName: string, role: string): Promise<ApiResponse<User>> => {
    const response = await axios.post(`${API_BASE_URL}/register-user`, {
      userId,
      orgName,
      role
    });
    return response.data;
  },

  // Appointments
  listAppointments: async (params: any = {}): Promise<ApiResponse<Appointment[]>> => {
    const response = await axios.get(`${API_ROOT}/appointments`, { params });
    return response.data;
  },

  createAppointment: async (payload: Partial<Appointment>): Promise<ApiResponse<Appointment>> => {
    const response = await axios.post(`${API_ROOT}/appointments`, payload);
    return response.data;
  },

  updateAppointment: async (appointmentId: string, payload: Partial<Appointment>): Promise<ApiResponse<Appointment>> => {
    const response = await axios.put(`${API_ROOT}/appointments/${appointmentId}`, payload);
    return response.data;
  },

  cancelAppointment: async (appointmentId: string, cancelledBy: string): Promise<ApiResponse<any>> => {
    const response = await axios.delete(`${API_ROOT}/appointments/${appointmentId}`, { data: { cancelledBy } });
    return response.data;
  },

  // Prescriptions
  listPrescriptions: async (params: any = {}): Promise<ApiResponse<Prescription[]>> => {
    const response = await axios.get(`${API_ROOT}/prescriptions`, { params });
    return response.data;
  },

  createPrescription: async (payload: Partial<Prescription>): Promise<ApiResponse<Prescription>> => {
    const response = await axios.post(`${API_ROOT}/prescriptions`, payload);
    return response.data;
  },

  dispensePrescription: async (prescriptionId: string, dispensedBy: string): Promise<ApiResponse<Prescription>> => {
    const response = await axios.put(`${API_ROOT}/prescriptions/${prescriptionId}/dispense`, { dispensedBy });
    return response.data;
  },

  // Lab
  listLabOrders: async (params: any = {}): Promise<ApiResponse<LabOrder[]>> => {
    const response = await axios.get(`${API_ROOT}/lab/orders`, { params });
    return response.data;
  },

  createLabOrder: async (payload: Partial<LabOrder>): Promise<ApiResponse<LabOrder>> => {
    const response = await axios.post(`${API_ROOT}/lab/orders`, payload);
    return response.data;
  },

  updateLabOrderStatus: async (labOrderId: string, status: string, processedBy: string): Promise<ApiResponse<LabOrder>> => {
    const response = await axios.put(`${API_ROOT}/lab/orders/${labOrderId}/status`, { status, processedBy });
    return response.data;
  },

  uploadLabResult: async (labOrderId: string, payload: any): Promise<ApiResponse<LabOrder>> => {
    const response = await axios.put(`${API_ROOT}/lab/orders/${labOrderId}/result`, payload);
    return response.data;
  },

  // Billing
  listInvoices: async (params: any = {}): Promise<ApiResponse<Invoice[]>> => {
    const response = await axios.get(`${API_ROOT}/billing/invoices`, { params });
    return response.data;
  },

  createInvoice: async (payload: Partial<Invoice>): Promise<ApiResponse<Invoice>> => {
    const response = await axios.post(`${API_ROOT}/billing/invoices`, payload);
    return response.data;
  },

  markInvoicePaid: async (invoiceId: string, updatedBy: string): Promise<ApiResponse<Invoice>> => {
    const response = await axios.put(`${API_ROOT}/billing/invoices/${invoiceId}/pay`, { updatedBy });
    return response.data;
  },

  // Analytics
  getAnalyticsOverview: async (): Promise<ApiResponse<any>> => {
    const response = await axios.get(`${API_ROOT}/analytics/overview`);
    return response.data;
  }
};

type EMMRRecord = EMRRecord; // Alias correction
export default api;

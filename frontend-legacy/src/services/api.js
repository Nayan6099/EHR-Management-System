import axios from 'axios';

const API_ROOT = 'http://localhost:3000/api';
const API_BASE_URL = `${API_ROOT}/ehr`;

const api = {
  // Upload EHR record
  uploadEHR: async (formData) => {
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // View/Download EHR record
  viewEHR: async (recordId, userId, orgName) => {
    const response = await axios.get(`${API_BASE_URL}/view`, {
      params: { recordId, userId, orgName },
      responseType: 'blob'
    });
    return response.data;
  },

  // Get record details (metadata only)
  getRecordDetails: async (recordId, userId, orgName) => {
    const response = await axios.get(`${API_BASE_URL}/details`, {
      params: { recordId, userId, orgName }
    });
    return response.data;
  },

  // Grant access to doctor
  grantAccess: async (recordId, patientId, doctorId) => {
    const response = await axios.post(`${API_BASE_URL}/grant-access`, {
      recordId,
      patientId,
      doctorId
    });
    return response.data;
  },

  // Revoke access from doctor
  revokeAccess: async (recordId, patientId, doctorId) => {
    const response = await axios.post(`${API_BASE_URL}/revoke-access`, {
      recordId,
      patientId,
      doctorId
    });
    return response.data;
  },

  // Get access history
  getAccessHistory: async (recordId, userId, orgName) => {
    const response = await axios.get(`${API_BASE_URL}/history`, {
      params: { recordId, userId, orgName }
    });
    return response.data;
  },

  // List all patient records
  getPatientRecords: async (patientId, userId, orgName) => {
    const response = await axios.get(`${API_BASE_URL}/patient-records`, {
      params: { patientId, userId, orgName }
    });
    return response.data;
  },

  // Register user (for demo)
  registerUser: async (userId, orgName, role) => {
    const response = await axios.post(`${API_BASE_URL}/register-user`, {
      userId,
      orgName,
      role
    });
    return response.data;
  },

  // ---- Appointments ----
  listAppointments: async (params = {}) => {
    const response = await axios.get(`${API_ROOT}/appointments`, { params });
    return response.data;
  },
  createAppointment: async (payload) => {
    const response = await axios.post(`${API_ROOT}/appointments`, payload);
    return response.data;
  },
  updateAppointment: async (appointmentId, payload) => {
    const response = await axios.put(`${API_ROOT}/appointments/${appointmentId}`, payload);
    return response.data;
  },
  cancelAppointment: async (appointmentId, cancelledBy) => {
    const response = await axios.delete(`${API_ROOT}/appointments/${appointmentId}`, { data: { cancelledBy } });
    return response.data;
  },

  // ---- Prescriptions ----
  listPrescriptions: async (params = {}) => {
    const response = await axios.get(`${API_ROOT}/prescriptions`, { params });
    return response.data;
  },
  createPrescription: async (payload) => {
    const response = await axios.post(`${API_ROOT}/prescriptions`, payload);
    return response.data;
  },
  dispensePrescription: async (prescriptionId, dispensedBy) => {
    const response = await axios.put(`${API_ROOT}/prescriptions/${prescriptionId}/dispense`, { dispensedBy });
    return response.data;
  },

  // ---- Lab ----
  listLabOrders: async (params = {}) => {
    const response = await axios.get(`${API_ROOT}/lab/orders`, { params });
    return response.data;
  },
  createLabOrder: async (payload) => {
    const response = await axios.post(`${API_ROOT}/lab/orders`, payload);
    return response.data;
  },
  updateLabOrderStatus: async (labOrderId, status, processedBy) => {
    const response = await axios.put(`${API_ROOT}/lab/orders/${labOrderId}/status`, { status, processedBy });
    return response.data;
  },
  uploadLabResult: async (labOrderId, payload) => {
    const response = await axios.put(`${API_ROOT}/lab/orders/${labOrderId}/result`, payload);
    return response.data;
  },

  // ---- Billing ----
  listInvoices: async (params = {}) => {
    const response = await axios.get(`${API_ROOT}/billing/invoices`, { params });
    return response.data;
  },
  createInvoice: async (payload) => {
    const response = await axios.post(`${API_ROOT}/billing/invoices`, payload);
    return response.data;
  },
  markInvoicePaid: async (invoiceId, updatedBy) => {
    const response = await axios.put(`${API_ROOT}/billing/invoices/${invoiceId}/pay`, { updatedBy });
    return response.data;
  },

  // ---- Analytics ----
  getAnalyticsOverview: async () => {
    const response = await axios.get(`${API_ROOT}/analytics/overview`);
    return response.data;
  }
};

export default api;
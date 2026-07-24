import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function ReceptionistDashboard({ user }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState('appointments');
  const [form, setForm] = useState({ patientId: '', patientName: '', doctorId: '', doctorName: '', department: 'General', scheduledAt: '', reason: '' });
  const [invoiceForm, setInvoiceForm] = useState({ patientId: '', patientName: '', description: '', amount: '' });
  const [invoices, setInvoices] = useState([]);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.listAppointments({});
      setAppointments(response.data || []);
    } catch (error) {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const response = await api.listInvoices({});
      setInvoices(response.data || []);
    } catch (error) {
      setInvoices([]);
    }
  }, []);

  useEffect(() => { fetchAppointments(); fetchInvoices(); }, [fetchAppointments, fetchInvoices]);

  const handleSchedule = async (e) => {
    e.preventDefault();
    try {
      await api.createAppointment({ ...form, createdBy: user.userId });
      showToast('Appointment scheduled successfully');
      setForm({ patientId: '', patientName: '', doctorId: '', doctorName: '', department: 'General', scheduledAt: '', reason: '' });
      fetchAppointments();
    } catch (error) {
      showToast('Error scheduling: ' + error.message, true);
    }
  };

  const handleCancel = async (appointmentId) => {
    try {
      await api.cancelAppointment(appointmentId, user.userId);
      showToast('Appointment cancelled');
      fetchAppointments();
    } catch (error) {
      showToast('Error cancelling: ' + error.message, true);
    }
  };

  const handleCheckIn = async (appointmentId) => {
    try {
      await api.updateAppointment(appointmentId, { status: 'checked-in', updatedBy: user.userId });
      showToast('Patient checked in');
      fetchAppointments();
    } catch (error) {
      showToast('Error checking in: ' + error.message, true);
    }
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      await api.createInvoice({
        patientId: invoiceForm.patientId,
        patientName: invoiceForm.patientName,
        items: [{ description: invoiceForm.description, amount: Number(invoiceForm.amount) }],
        createdBy: user.userId
      });
      showToast('Invoice generated successfully');
      setInvoiceForm({ patientId: '', patientName: '', description: '', amount: '' });
      fetchInvoices();
    } catch (error) {
      showToast('Error creating invoice: ' + error.message, true);
    }
  };

  return (
    <div className="dashboard">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999, background: toast.isError ? '#e74c3c' : '#27ae60', color: '#fff', padding: '14px 22px', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', fontWeight: 600, fontSize: 14, minWidth: 250 }}>
          {toast.isError ? '❌ ' : '✅ '}{toast.msg}
        </div>
      )}

      <div className="dashboard-header">
        <h1>🗂️ Welcome, {user.userId}</h1>
        <p>Manage patient registration, scheduling, check-in, and billing</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Appointments</h3>
          <div className="stat-value">{appointments.length}</div>
        </div>
        <div className="stat-card">
          <h3>Scheduled</h3>
          <div className="stat-value">{appointments.filter(a => a.status === 'scheduled').length}</div>
        </div>
        <div className="stat-card">
          <h3>Unpaid Invoices</h3>
          <div className="stat-value">{invoices.filter(i => i.status === 'unpaid').length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button className={tab === 'appointments' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('appointments')}>📅 Appointments</button>
        <button className={tab === 'billing' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('billing')}>🧾 Billing</button>
      </div>

      {tab === 'appointments' && (
        <>
          <div className="records-section" style={{ marginBottom: 24 }}>
            <h2>➕ Schedule New Appointment</h2>
            <form onSubmit={handleSchedule}>
              <div className="form-group">
                <label>Patient ID</label>
                <input value={form.patientId} onChange={e => setForm({ ...form, patientId: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Patient Name</label>
                <input value={form.patientName} onChange={e => setForm({ ...form, patientName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Doctor ID</label>
                <input value={form.doctorId} onChange={e => setForm({ ...form, doctorId: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Doctor Name</label>
                <input value={form.doctorName} onChange={e => setForm({ ...form, doctorName: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Department</label>
                <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Date &amp; Time</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Reason</label>
                <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
              </div>
              <button type="submit" className="btn-primary">Schedule Appointment</button>
            </form>
          </div>

          <div className="records-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2>📋 All Appointments</h2>
              <button className="btn-secondary" onClick={fetchAppointments}>🔄 Refresh</button>
            </div>
            {loading ? (
              <div className="empty-state"><p>⏳ Loading...</p></div>
            ) : appointments.length === 0 ? (
              <div className="empty-state"><p>📭 No appointments yet</p></div>
            ) : (
              <div className="records-grid">
                {appointments.map(apt => (
                  <div key={apt.appointmentId} className="record-card">
                    <div className="record-header">
                      <div className="record-title">{apt.patientName}</div>
                      <div className="record-type">{apt.status}</div>
                    </div>
                    <p><strong>Doctor:</strong> {apt.doctorName || apt.doctorId}</p>
                    <p><strong>Dept:</strong> {apt.department}</p>
                    <div className="record-meta">
                      🕒 {new Date(apt.scheduledAt).toLocaleString()}<br />
                      🆔 {apt.appointmentId}
                    </div>
                    {apt.status === 'scheduled' && (
                      <div className="record-actions">
                        <button className="btn-secondary btn-success" onClick={() => handleCheckIn(apt.appointmentId)}>✅ Check-In</button>
                        <button className="btn-secondary" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }} onClick={() => handleCancel(apt.appointmentId)}>✖ Cancel</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'billing' && (
        <>
          <div className="records-section" style={{ marginBottom: 24 }}>
            <h2>➕ Generate Invoice</h2>
            <form onSubmit={handleCreateInvoice}>
              <div className="form-group">
                <label>Patient ID</label>
                <input value={invoiceForm.patientId} onChange={e => setInvoiceForm({ ...invoiceForm, patientId: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Patient Name</label>
                <input value={invoiceForm.patientName} onChange={e => setInvoiceForm({ ...invoiceForm, patientName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Description</label>
                <input value={invoiceForm.description} onChange={e => setInvoiceForm({ ...invoiceForm, description: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input type="number" min="0" step="0.01" value={invoiceForm.amount} onChange={e => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} required />
              </div>
              <button type="submit" className="btn-primary">Generate Invoice</button>
            </form>
          </div>

          <div className="records-section">
            <h2>🧾 Invoices</h2>
            {invoices.length === 0 ? (
              <div className="empty-state"><p>📭 No invoices yet</p></div>
            ) : (
              <div className="records-grid">
                {invoices.map(inv => (
                  <div key={inv.invoiceId} className="record-card">
                    <div className="record-header">
                      <div className="record-title">{inv.patientName}</div>
                      <div className="record-type">{inv.status}</div>
                    </div>
                    <p><strong>Total:</strong> ₹{inv.totalAmount}</p>
                    <div className="record-meta">🆔 {inv.invoiceId}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ReceptionistDashboard;

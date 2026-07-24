import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function DoctorDashboard({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, record: null });
  const [tab, setTab] = useState('records');
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [rxForm, setRxForm] = useState({ patientId: '', patientName: '', diagnosis: '', medName: '', dosage: '', frequency: '', duration: '' });
  const [labForm, setLabForm] = useState({ patientId: '', patientName: '', testType: '' });

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchExtras = useCallback(async () => {
    try {
      const [apts, rxs, labs] = await Promise.all([
        api.listAppointments({ doctorId: user.userId }),
        api.listPrescriptions({ doctorId: user.userId }),
        api.listLabOrders({ doctorId: user.userId })
      ]);
      setAppointments(apts.data || []);
      setPrescriptions(rxs.data || []);
      setLabOrders(labs.data || []);
    } catch (error) {
      console.error('Error fetching doctor extras:', error);
    }
  }, [user]);

  useEffect(() => { fetchExtras(); }, [fetchExtras]);

  const handleCreatePrescription = async (e) => {
    e.preventDefault();
    try {
      await api.createPrescription({
        patientId: rxForm.patientId,
        patientName: rxForm.patientName,
        doctorId: user.userId,
        diagnosis: rxForm.diagnosis,
        medications: [{ name: rxForm.medName, dosage: rxForm.dosage, frequency: rxForm.frequency, duration: rxForm.duration }]
      });
      showToast('Prescription created');
      setRxForm({ patientId: '', patientName: '', diagnosis: '', medName: '', dosage: '', frequency: '', duration: '' });
      fetchExtras();
    } catch (error) {
      showToast('Error creating prescription: ' + error.message, true);
    }
  };

  const handleOrderLab = async (e) => {
    e.preventDefault();
    try {
      await api.createLabOrder({ patientId: labForm.patientId, patientName: labForm.patientName, doctorId: user.userId, testType: labForm.testType });
      showToast('Lab test ordered');
      setLabForm({ patientId: '', patientName: '', testType: '' });
      fetchExtras();
    } catch (error) {
      showToast('Error ordering lab test: ' + error.message, true);
    }
  };

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getPatientRecords(user.userId, user.userId, user.orgName);
      setRecords(response.data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleDelete = () => {
    const record = deleteModal.record;
    fetch(`http://localhost:3000/api/ehr/delete/${record.recordId}?userId=${user.userId}&orgName=${user.orgName}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRecords(prev => prev.filter(r => r.recordId !== record.recordId));
          showToast('Record deleted successfully');
        } else {
          showToast(data.error || 'Failed to delete', true);
        }
      })
      .catch(err => showToast('Error: ' + err.message, true))
      .finally(() => setDeleteModal({ open: false, record: null }));
  };

  const handleDownload = async (record) => {
    try {
      const blob = await api.viewEHR(record.recordId, user.userId, user.orgName);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${record.recordType}_${record.recordId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('File downloaded successfully');
    } catch (error) {
      showToast('Error downloading file: ' + error.message, true);
    }
  };

  return (
    <div className="dashboard">

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999, background: toast.isError ? '#e74c3c' : '#27ae60', color: '#fff', padding: '14px 22px', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', fontWeight: 600, fontSize: 14, minWidth: 250 }}>
          {toast.isError ? '❌ ' : '✅ '}{toast.msg}
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>🗑️ Delete Record</h3>
            <p>Are you sure you want to delete this record?</p>
            <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <p style={{ margin: '4px 0' }}><strong>Type:</strong> {deleteModal.record?.recordType}</p>
              <p style={{ margin: '4px 0' }}><strong>Patient:</strong> {deleteModal.record?.patientName}</p>
              <p style={{ margin: '4px 0' }}><strong>ID:</strong> <code>{deleteModal.record?.recordId}</code></p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setDeleteModal({ open: false, record: null })}>Cancel</button>
              <button className="btn-primary" style={{ background: '#e74c3c', border: 'none' }} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <h1>👨‍⚕️ Welcome, Dr. {user.userId}</h1>
        <p>Access and manage patient records securely via blockchain</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Records Available</h3>
          <div className="stat-value">{records.length}</div>
          <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>Records you can access</p>
        </div>
        <div className="stat-card">
          <h3>Patients</h3>
          <div className="stat-value">{[...new Set(records.map(r => r.patientId))].length}</div>
          <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>Patients who granted access</p>
        </div>
        <div className="stat-card">
          <h3>Record Types</h3>
          <div className="stat-value">{[...new Set(records.map(r => r.recordType))].length}</div>
          <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>Different record types</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <button className={tab === 'records' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('records')}>🔐 Records</button>
        <button className={tab === 'appointments' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('appointments')}>📅 My Appointments</button>
        <button className={tab === 'prescriptions' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('prescriptions')}>💊 Prescriptions</button>
        <button className={tab === 'lab' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('lab')}>🧪 Lab Orders</button>
      </div>

      {tab === 'appointments' && (
        <div className="records-section" style={{ marginBottom: 24 }}>
          <h2>📅 My Appointments</h2>
          {appointments.length === 0 ? (
            <div className="empty-state"><p>📭 No appointments scheduled</p></div>
          ) : (
            <div className="records-grid">
              {appointments.map(apt => (
                <div key={apt.appointmentId} className="record-card">
                  <div className="record-header">
                    <div className="record-title">{apt.patientName}</div>
                    <div className="record-type">{apt.status}</div>
                  </div>
                  <p><strong>Reason:</strong> {apt.reason || 'Not specified'}</p>
                  <div className="record-meta">🕒 {new Date(apt.scheduledAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'prescriptions' && (
        <>
          <div className="records-section" style={{ marginBottom: 24 }}>
            <h2>➕ New Prescription</h2>
            <form onSubmit={handleCreatePrescription}>
              <div className="form-group">
                <label>Patient ID</label>
                <input value={rxForm.patientId} onChange={e => setRxForm({ ...rxForm, patientId: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Patient Name</label>
                <input value={rxForm.patientName} onChange={e => setRxForm({ ...rxForm, patientName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Diagnosis</label>
                <input value={rxForm.diagnosis} onChange={e => setRxForm({ ...rxForm, diagnosis: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Medication Name</label>
                <input value={rxForm.medName} onChange={e => setRxForm({ ...rxForm, medName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Dosage</label>
                <input value={rxForm.dosage} onChange={e => setRxForm({ ...rxForm, dosage: e.target.value })} placeholder="e.g. 500mg" />
              </div>
              <div className="form-group">
                <label>Frequency</label>
                <input value={rxForm.frequency} onChange={e => setRxForm({ ...rxForm, frequency: e.target.value })} placeholder="e.g. Twice daily" />
              </div>
              <div className="form-group">
                <label>Duration</label>
                <input value={rxForm.duration} onChange={e => setRxForm({ ...rxForm, duration: e.target.value })} placeholder="e.g. 7 days" />
              </div>
              <button type="submit" className="btn-primary">Create Prescription</button>
            </form>
          </div>
          <div className="records-section">
            <h2>💊 Prescriptions Issued</h2>
            {prescriptions.length === 0 ? (
              <div className="empty-state"><p>📭 No prescriptions yet</p></div>
            ) : (
              <div className="records-grid">
                {prescriptions.map(rx => (
                  <div key={rx.prescriptionId} className="record-card">
                    <div className="record-header">
                      <div className="record-title">{rx.patientName}</div>
                      <div className="record-type">{rx.status}</div>
                    </div>
                    <p><strong>Diagnosis:</strong> {rx.diagnosis || 'Not specified'}</p>
                    <div className="record-meta">🆔 {rx.prescriptionId}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'lab' && (
        <>
          <div className="records-section" style={{ marginBottom: 24 }}>
            <h2>➕ Order Lab Test</h2>
            <form onSubmit={handleOrderLab}>
              <div className="form-group">
                <label>Patient ID</label>
                <input value={labForm.patientId} onChange={e => setLabForm({ ...labForm, patientId: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Patient Name</label>
                <input value={labForm.patientName} onChange={e => setLabForm({ ...labForm, patientName: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Test Type</label>
                <input value={labForm.testType} onChange={e => setLabForm({ ...labForm, testType: e.target.value })} placeholder="e.g. Complete Blood Count" required />
              </div>
              <button type="submit" className="btn-primary">Order Test</button>
            </form>
          </div>
          <div className="records-section">
            <h2>🧪 Lab Orders</h2>
            {labOrders.length === 0 ? (
              <div className="empty-state"><p>📭 No lab orders yet</p></div>
            ) : (
              <div className="records-grid">
                {labOrders.map(order => (
                  <div key={order.labOrderId} className="record-card">
                    <div className="record-header">
                      <div className="record-title">{order.testType}</div>
                      <div className="record-type">{order.status}</div>
                    </div>
                    <p><strong>Patient:</strong> {order.patientName}</p>
                    {order.resultSummary && <p><strong>Result:</strong> {order.resultSummary}</p>}
                    <div className="record-meta">🆔 {order.labOrderId}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'records' && (
      <div className="records-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>🔐 Patient Records</h2>
          <button className="btn-secondary" onClick={fetchRecords}>🔄 Refresh</button>
        </div>

        {loading ? (
          <div className="empty-state"><p>⏳ Loading records...</p></div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <p>📭 No records available</p>
            <p>Patients must grant you access to view their records</p>
          </div>
        ) : (
          <div className="records-grid">
            {records.map(record => (
              <div key={record.recordId} className="record-card">
                <div className="record-header">
                  <div className="record-title">{record.recordType}</div>
                  <div className="record-type">{record.recordType}</div>
                </div>
                <p><strong>Patient:</strong> {record.patientName}</p>
                <p><strong>Description:</strong> {record.description || 'No description'}</p>
                <div className="record-meta">
                  📅 {new Date(record.uploadDate).toLocaleDateString()}<br />
                  💾 {(record.fileSize / 1024 / 1024).toFixed(2)} MB<br />
                  🆔 {record.recordId}
                </div>
                <div className="record-actions">
                  <button onClick={() => handleDownload(record)} className="btn-secondary btn-success">
                    ⬇️ Download
                  </button>
                  <button
                    onClick={() => setDeleteModal({ open: true, record })}
                    className="btn-secondary"
                    style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      <div className="alert alert-info" style={{ marginTop: 20 }}>
        <strong>ℹ️ How it works:</strong><br />
        1. Patient uploads their medical record to blockchain<br />
        2. Patient grants you access using your doctor ID: <code>{user.userId}</code><br />
        3. You can view, download, or delete authorized records<br />
        4. All actions are logged on the blockchain for transparency
      </div>
    </div>
  );
}

export default DoctorDashboard;

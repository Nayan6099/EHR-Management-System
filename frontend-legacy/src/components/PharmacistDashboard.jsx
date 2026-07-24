import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function PharmacistDashboard({ user }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.listPrescriptions({});
      setPrescriptions(response.data || []);
    } catch (error) {
      setPrescriptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  const dispense = async (prescriptionId) => {
    try {
      await api.dispensePrescription(prescriptionId, user.userId);
      showToast('Prescription dispensed');
      fetchPrescriptions();
    } catch (error) {
      showToast('Error dispensing: ' + error.message, true);
    }
  };

  const pending = prescriptions.filter(p => p.status === 'pending');
  const dispensed = prescriptions.filter(p => p.status === 'dispensed');

  return (
    <div className="dashboard">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999, background: toast.isError ? '#e74c3c' : '#27ae60', color: '#fff', padding: '14px 22px', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', fontWeight: 600, fontSize: 14, minWidth: 250 }}>
          {toast.isError ? '❌ ' : '✅ '}{toast.msg}
        </div>
      )}

      <div className="dashboard-header">
        <h1>💊 Welcome, {user.userId}</h1>
        <p>Review prescriptions and dispense medications</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Pending</h3>
          <div className="stat-value">{pending.length}</div>
        </div>
        <div className="stat-card">
          <h3>Dispensed</h3>
          <div className="stat-value">{dispensed.length}</div>
        </div>
        <div className="stat-card">
          <h3>Total Prescriptions</h3>
          <div className="stat-value">{prescriptions.length}</div>
        </div>
      </div>

      <div className="records-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>💊 Prescriptions</h2>
          <button className="btn-secondary" onClick={fetchPrescriptions}>🔄 Refresh</button>
        </div>

        {loading ? (
          <div className="empty-state"><p>⏳ Loading prescriptions...</p></div>
        ) : prescriptions.length === 0 ? (
          <div className="empty-state"><p>📭 No prescriptions yet</p></div>
        ) : (
          <div className="records-grid">
            {prescriptions.map(rx => (
              <div key={rx.prescriptionId} className="record-card">
                <div className="record-header">
                  <div className="record-title">{rx.patientName}</div>
                  <div className="record-type">{rx.status}</div>
                </div>
                <p><strong>Doctor:</strong> {rx.doctorName || rx.doctorId}</p>
                <p><strong>Diagnosis:</strong> {rx.diagnosis || 'Not specified'}</p>
                <p><strong>Medications:</strong></p>
                <ul style={{ margin: '4px 0 8px 18px', fontSize: 13 }}>
                  {rx.medications.map((m, i) => (
                    <li key={i}>{m.name} — {m.dosage} — {m.frequency} — {m.duration}</li>
                  ))}
                </ul>
                <div className="record-meta">🆔 {rx.prescriptionId}</div>
                {rx.status === 'pending' && (
                  <div className="record-actions">
                    <button className="btn-secondary btn-success" onClick={() => dispense(rx.prescriptionId)}>✅ Dispense</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PharmacistDashboard;

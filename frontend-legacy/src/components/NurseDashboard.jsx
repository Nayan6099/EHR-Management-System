import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function NurseDashboard({ user }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchToday = useCallback(async () => {
    try {
      setLoading(true);
      const from = new Date(); from.setHours(0, 0, 0, 0);
      const to = new Date(); to.setHours(23, 59, 59, 999);
      const response = await api.listAppointments({ from: from.toISOString(), to: to.toISOString() });
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  const updateStatus = async (appointmentId, status) => {
    try {
      await api.updateAppointment(appointmentId, { status, updatedBy: user.userId });
      showToast(`Marked as ${status}`);
      fetchToday();
    } catch (error) {
      showToast('Error updating status: ' + error.message, true);
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
        <h1>🩺 Welcome, Nurse {user.userId}</h1>
        <p>Coordinate patient vitals, admissions, and today's schedule</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Today's Appointments</h3>
          <div className="stat-value">{appointments.length}</div>
          <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>Across all doctors</p>
        </div>
        <div className="stat-card">
          <h3>Checked In</h3>
          <div className="stat-value">{appointments.filter(a => a.status === 'checked-in').length}</div>
          <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>Ready for consultation</p>
        </div>
        <div className="stat-card">
          <h3>Completed</h3>
          <div className="stat-value">{appointments.filter(a => a.status === 'completed').length}</div>
          <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>Seen today</p>
        </div>
      </div>

      <div className="records-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>📋 Today's Patient Schedule</h2>
          <button className="btn-secondary" onClick={fetchToday}>🔄 Refresh</button>
        </div>

        {loading ? (
          <div className="empty-state"><p>⏳ Loading schedule...</p></div>
        ) : appointments.length === 0 ? (
          <div className="empty-state"><p>📭 No appointments scheduled today</p></div>
        ) : (
          <div className="records-grid">
            {appointments.map(apt => (
              <div key={apt.appointmentId} className="record-card">
                <div className="record-header">
                  <div className="record-title">{apt.patientName}</div>
                  <div className="record-type">{apt.status}</div>
                </div>
                <p><strong>Doctor:</strong> {apt.doctorName || apt.doctorId}</p>
                <p><strong>Reason:</strong> {apt.reason || 'Not specified'}</p>
                <div className="record-meta">
                  🕒 {new Date(apt.scheduledAt).toLocaleTimeString()}<br />
                  🆔 {apt.appointmentId}
                </div>
                <div className="record-actions">
                  {apt.status === 'scheduled' && (
                    <button className="btn-secondary btn-success" onClick={() => updateStatus(apt.appointmentId, 'checked-in')}>
                      ✅ Check In
                    </button>
                  )}
                  {apt.status === 'checked-in' && (
                    <button className="btn-secondary btn-success" onClick={() => updateStatus(apt.appointmentId, 'completed')}>
                      ✔️ Mark Completed
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default NurseDashboard;

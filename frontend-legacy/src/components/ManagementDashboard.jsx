import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function ManagementDashboard({ user }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getAnalyticsOverview();
      setOverview(response.data);
    } catch (error) {
      console.error('Error fetching analytics overview:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  const countFor = (arr, key) => (arr || []).find(x => x._id === key)?.count || 0;

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>📊 Welcome, {user.userId}</h1>
        <p>Organization-wide performance, compliance, and staff oversight</p>
      </div>

      {loading || !overview ? (
        <div className="empty-state"><p>⏳ Loading analytics...</p></div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Appointments Today</h3>
              <div className="stat-value">{overview.appointmentsToday}</div>
            </div>
            <div className="stat-card">
              <h3>Revenue Collected</h3>
              <div className="stat-value">₹{overview.revenueCollected}</div>
              <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>From paid invoices</p>
            </div>
            <div className="stat-card">
              <h3>Unpaid Invoices</h3>
              <div className="stat-value">{overview.unpaidInvoices}</div>
            </div>
            <div className="stat-card">
              <h3>Activity (24h)</h3>
              <div className="stat-value">{overview.recentActivityCount}</div>
              <p style={{ fontSize: '12px', marginTop: '10px', color: '#666' }}>Audit log events</p>
            </div>
          </div>

          <div className="records-section" style={{ marginBottom: 24 }}>
            <h2>📅 Appointments by Status</h2>
            <div className="stats-grid">
              {['scheduled', 'checked-in', 'completed', 'cancelled', 'no-show'].map(status => (
                <div className="stat-card" key={status}>
                  <h3 style={{ textTransform: 'capitalize' }}>{status}</h3>
                  <div className="stat-value">{countFor(overview.appointmentsByStatus, status)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="records-section" style={{ marginBottom: 24 }}>
            <h2>🧪 Lab Orders by Status</h2>
            <div className="stats-grid">
              {['ordered', 'sample-collected', 'in-progress', 'completed', 'cancelled'].map(status => (
                <div className="stat-card" key={status}>
                  <h3 style={{ textTransform: 'capitalize' }}>{status}</h3>
                  <div className="stat-value">{countFor(overview.labOrdersByStatus, status)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="records-section" style={{ marginBottom: 24 }}>
            <h2>💊 Prescriptions</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Pending</h3>
                <div className="stat-value">{overview.prescriptions.pending}</div>
              </div>
              <div className="stat-card">
                <h3>Dispensed</h3>
                <div className="stat-value">{overview.prescriptions.dispensed}</div>
              </div>
            </div>
          </div>

          <div className="records-section">
            <h2>👥 Staff by Role</h2>
            <div className="stats-grid">
              {(overview.staffByRole || []).map(r => (
                <div className="stat-card" key={r._id}>
                  <h3 style={{ textTransform: 'capitalize' }}>{(r._id || 'unknown').replace('_', ' ')}</h3>
                  <div className="stat-value">{r.count}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="alert alert-info" style={{ marginTop: 20 }}>
            <strong>ℹ️ Compliance &amp; Audit:</strong><br />
            All record access, prescriptions, lab results, and billing events are logged to the audit trail.
            Core patient records remain immutable on the blockchain layer for full traceability.
          </div>
        </>
      )}
    </div>
  );
}

export default ManagementDashboard;

import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

function LabTechnicianDashboard({ user }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [resultModal, setResultModal] = useState({ open: false, order: null, summary: '' });

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.listLabOrders({});
      setOrders(response.data || []);
    } catch (error) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const advanceStatus = async (labOrderId, status) => {
    try {
      await api.updateLabOrderStatus(labOrderId, status, user.userId);
      showToast(`Marked as ${status}`);
      fetchOrders();
    } catch (error) {
      showToast('Error updating: ' + error.message, true);
    }
  };

  const submitResult = async () => {
    try {
      await api.uploadLabResult(resultModal.order.labOrderId, {
        resultSummary: resultModal.summary,
        processedBy: user.userId
      });
      showToast('Result uploaded, order marked completed');
      setResultModal({ open: false, order: null, summary: '' });
      fetchOrders();
    } catch (error) {
      showToast('Error uploading result: ' + error.message, true);
    }
  };

  const pending = orders.filter(o => o.status === 'ordered' || o.status === 'sample-collected' || o.status === 'in-progress');
  const completed = orders.filter(o => o.status === 'completed');

  return (
    <div className="dashboard">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999, background: toast.isError ? '#e74c3c' : '#27ae60', color: '#fff', padding: '14px 22px', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', fontWeight: 600, fontSize: 14, minWidth: 250 }}>
          {toast.isError ? '❌ ' : '✅ '}{toast.msg}
        </div>
      )}

      {resultModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0 }}>🧪 Upload Result — {resultModal.order?.testType}</h3>
            <div className="form-group">
              <label>Result Summary</label>
              <textarea
                rows={5}
                style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
                value={resultModal.summary}
                onChange={e => setResultModal({ ...resultModal, summary: e.target.value })}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setResultModal({ open: false, order: null, summary: '' })}>Cancel</button>
              <button className="btn-primary" onClick={submitResult}>Submit Result</button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-header">
        <h1>🔬 Welcome, {user.userId}</h1>
        <p>Process incoming test orders and publish results</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Pending Orders</h3>
          <div className="stat-value">{pending.length}</div>
        </div>
        <div className="stat-card">
          <h3>Completed</h3>
          <div className="stat-value">{completed.length}</div>
        </div>
        <div className="stat-card">
          <h3>Total Orders</h3>
          <div className="stat-value">{orders.length}</div>
        </div>
      </div>

      <div className="records-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>🧪 Lab Test Orders</h2>
          <button className="btn-secondary" onClick={fetchOrders}>🔄 Refresh</button>
        </div>

        {loading ? (
          <div className="empty-state"><p>⏳ Loading orders...</p></div>
        ) : orders.length === 0 ? (
          <div className="empty-state"><p>📭 No lab orders yet</p></div>
        ) : (
          <div className="records-grid">
            {orders.map(order => (
              <div key={order.labOrderId} className="record-card">
                <div className="record-header">
                  <div className="record-title">{order.testType}</div>
                  <div className="record-type">{order.status}</div>
                </div>
                <p><strong>Patient:</strong> {order.patientName}</p>
                <p><strong>Ordered by:</strong> {order.doctorId}</p>
                {order.resultSummary && <p><strong>Result:</strong> {order.resultSummary}</p>}
                <div className="record-meta">🆔 {order.labOrderId}</div>
                <div className="record-actions">
                  {order.status === 'ordered' && (
                    <button className="btn-secondary" onClick={() => advanceStatus(order.labOrderId, 'sample-collected')}>🧫 Sample Collected</button>
                  )}
                  {order.status === 'sample-collected' && (
                    <button className="btn-secondary" onClick={() => advanceStatus(order.labOrderId, 'in-progress')}>⚙️ Start Processing</button>
                  )}
                  {order.status === 'in-progress' && (
                    <button className="btn-secondary btn-success" onClick={() => setResultModal({ open: true, order, summary: '' })}>📤 Upload Result</button>
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

export default LabTechnicianDashboard;

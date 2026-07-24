import React, { useState, useEffect } from 'react';
import api from '../services/api';

function ManageAccess({ user }) {
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [loadingAction, setLoadingAction] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const response = await api.getPatientRecords(user.userId, user.userId, user.orgName);
      setRecords(response.data);
    } catch (error) {
      console.error('Error fetching records:', error);
    }
  };

  const handleGrantAccess = async (e) => {
    e.preventDefault();
    if (!selectedRecord || !doctorId) {
      setMessage({ type: 'error', text: 'Please select a record and enter doctor ID' });
      return;
    }

    setLoadingAction('grant');
    setMessage(null);

    try {
      await api.grantAccess(selectedRecord, user.userId, doctorId);
      setMessage({ type: 'success', text: `✅ Access granted to ${doctorId} successfully!` });
      setDoctorId('');
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Failed to grant access: ${error.response?.data?.details || error.message}` });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRevokeAccess = async (e) => {
    e.preventDefault();
    if (!selectedRecord || !doctorId) {
      setMessage({ type: 'error', text: 'Please select a record and enter doctor ID' });
      return;
    }

    if (!window.confirm(`Are you sure you want to revoke access from ${doctorId}?`)) {
      return;
    }

    setLoadingAction('revoke');
    setMessage(null);

    try {
      await api.revokeAccess(selectedRecord, user.userId, doctorId);
      setMessage({ type: 'success', text: `✅ Access revoked from ${doctorId} successfully!` });
      setDoctorId('');
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Failed to revoke access: ${error.response?.data?.details || error.message}` });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="records-section">
      <h2>🔐 Manage Access Control</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Grant or revoke doctor access to your medical records
      </p>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {message.text}
        </div>
      )}

      {records.length === 0 ? (
        <div className="empty-state">
          <p>📭 No records found</p>
          <p>Upload a medical record first to manage access</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr 1fr' }}>
          {/* Grant Access Form */}
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginBottom: '20px', color: '#4caf50' }}>✅ Grant Access</h3>
            <form onSubmit={handleGrantAccess}>
              <div className="form-group">
                <label>Select Record</label>
                <select
                  value={selectedRecord}
                  onChange={(e) => setSelectedRecord(e.target.value)}
                  required
                >
                  <option value="">Choose a record...</option>
                  {records.map((record) => (
                    <option key={record.recordId} value={record.recordId}>
                      {record.recordType} - {new Date(record.uploadDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Doctor ID</label>
                <input
                  type="text"
                  placeholder="e.g., dr.smith"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary btn-success"
                disabled={loadingAction !== null}
                style={{ width: '100%' }}
              >
                {loadingAction === 'grant' ? '⏳ Processing...' : '✅ Grant Access'}
              </button>
            </form>
          </div>

          {/* Revoke Access Form */}
          <div style={{ background: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <h3 style={{ marginBottom: '20px', color: '#f44336' }}>❌ Revoke Access</h3>
            <form onSubmit={handleRevokeAccess}>
              <div className="form-group">
                <label>Select Record</label>
                <select
                  value={selectedRecord}
                  onChange={(e) => setSelectedRecord(e.target.value)}
                  required
                >
                  <option value="">Choose a record...</option>
                  {records.map((record) => (
                    <option key={record.recordId} value={record.recordId}>
                      {record.recordType} - {new Date(record.uploadDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Doctor ID</label>
                <input
                  type="text"
                  placeholder="e.g., dr.smith"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn-primary btn-danger"
                disabled={loadingAction !== null}
                style={{ width: '100%' }}
              >
                {loadingAction === 'revoke' ? '⏳ Processing...' : '❌ Revoke Access'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="alert alert-info" style={{ marginTop: '30px' }}>
        <strong>ℹ️ How Access Control Works:</strong><br />
        • When you <strong>grant access</strong>, the doctor's ID is added to the blockchain record's authorized users list<br />
        • The doctor can then view and download your record<br />
        • When you <strong>revoke access</strong>, the doctor's ID is removed from the authorized users list<br />
        • All access grants and revocations are permanently logged on the blockchain<br />
        • You can view the complete access history for each record from the "View Records" page
      </div>

      <div className="records-section" style={{ marginTop: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>📋 Your Records</h3>
        <div className="records-grid">
          {records.map((record) => (
            <div key={record.recordId} className="record-card">
              <div className="record-header">
                <div className="record-title">{record.recordType}</div>
                <div className="record-type">{record.recordType}</div>
              </div>
              <p>{record.description || 'No description'}</p>
              <div className="record-meta">
                📅 {new Date(record.uploadDate).toLocaleDateString()}<br />
                🆔 {record.recordId}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ManageAccess;
import React, { useState, useEffect } from 'react';
import api from '../services/api';

function ViewEHR({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [accessHistory, setAccessHistory] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      // For patients, show their own records
      // For doctors, this would show records they have access to
      const patientId = user.role === 'patient' ? user.userId : user.userId;
      const response = await api.getPatientRecords(patientId, user.userId, user.orgName);
      setRecords(response.data);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
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
      alert('✅ File downloaded successfully!');
    } catch (error) {
      alert('❌ Error downloading file: ' + error.message);
    }
  };

  const handleViewHistory = async (record) => {
    try {
      setViewingHistory(true);
      setSelectedRecord(record);
      const response = await api.getAccessHistory(record.recordId, user.userId, user.orgName);
      setAccessHistory(response.data);
    } catch (error) {
      alert('❌ Error fetching history: ' + error.message);
      setViewingHistory(false);
    }
  };

  const closeHistory = () => {
    setViewingHistory(false);
    setSelectedRecord(null);
    setAccessHistory(null);
  };

  if (loading) {
    return (
      <div className="loading">
        <p>⏳ Loading records...</p>
      </div>
    );
  }

  if (viewingHistory && accessHistory) {
    return (
      <div className="records-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>📜 Access History - {selectedRecord.recordType}</h2>
          <button onClick={closeHistory} className="btn-secondary">← Back</button>
        </div>

        <div className="alert alert-info">
          <strong>Record ID:</strong> {selectedRecord.recordId}<br />
          <strong>Patient:</strong> {selectedRecord.patientName}<br />
          <strong>Type:</strong> {selectedRecord.recordType}
        </div>

        <h3 style={{ marginTop: '20px', marginBottom: '15px' }}>🕒 Timeline</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {accessHistory.accessHistory.map((event, index) => (
            <div key={index} className="record-card">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{event.action}</strong>
                  {event.grantedTo && <p style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                    To: {event.grantedTo}
                  </p>}
                  {event.userId && event.action === 'READ' && <p style={{ color: '#666', fontSize: '14px', marginTop: '5px' }}>
                    By: {event.userId}
                  </p>}
                </div>
                <div style={{ textAlign: 'right', fontSize: '13px', color: '#999' }}>
                  {new Date(event.timestamp).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="records-section">
      <h2>📁 View Medical Records</h2>
      
      {records.length === 0 ? (
        <div className="empty-state">
          <p>📭 No records found</p>
          {user.role === 'patient' ? (
            <p>Upload your first medical record to get started</p>
          ) : (
            <p>No patient has granted you access yet</p>
          )}
        </div>
      ) : (
        <div className="records-grid" style={{ marginTop: '20px' }}>
          {records.map((record) => (
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
                <button 
                  onClick={() => handleDownload(record)} 
                  className="btn-secondary btn-success"
                >
                  ⬇️ Download
                </button>
                <button 
                  onClick={() => handleViewHistory(record)} 
                  className="btn-secondary"
                >
                  📜 View History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ViewEHR;
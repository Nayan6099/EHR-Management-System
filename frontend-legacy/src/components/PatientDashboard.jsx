import React, { useState, useEffect } from 'react';
import api from '../services/api';

function PatientDashboard({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, xray: 0, mri: 0, reports: 0 });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await api.getPatientRecords(user.userId, user.userId, user.orgName);
      setRecords(response.data);
      
      // Calculate stats
      const total = response.data.length;
      const xray = response.data.filter(r => r.recordType === 'X-Ray').length;
      const mri = response.data.filter(r => r.recordType === 'MRI').length;
      const reports = response.data.filter(r => r.recordType === 'Report').length;
      
      setStats({ total, xray, mri, reports });
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>👋 Welcome, {user.userId}</h1>
        <p>Manage your health records securely on the blockchain</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Records</h3>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <h3>X-Ray Scans</h3>
          <div className="stat-value">{stats.xray}</div>
        </div>
        <div className="stat-card">
          <h3>MRI Scans</h3>
          <div className="stat-value">{stats.mri}</div>
        </div>
        <div className="stat-card">
          <h3>Reports</h3>
          <div className="stat-value">{stats.reports}</div>
        </div>
      </div>

      <div className="records-section">
        <h2>📋 Recent Records</h2>
        
        {loading ? (
          <div className="loading">
            <p>⏳ Loading your records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <p>📭 No records found</p>
            <p>Upload your first medical record to get started</p>
          </div>
        ) : (
          <div className="records-grid">
            {records.slice(0, 5).map((record) => (
              <div key={record.recordId} className="record-card">
                <div className="record-header">
                  <div className="record-title">{record.patientName}'s {record.recordType}</div>
                  <div className="record-type">{record.recordType}</div>
                </div>
                <p>{record.description || 'No description provided'}</p>
                <div className="record-meta">
                  📅 {new Date(record.uploadDate).toLocaleDateString()}<br />
                  💾 {(record.fileSize / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="alert alert-info">
        <strong>ℹ️ Blockchain Security:</strong> All your records are encrypted and stored securely. 
        You have full control over who can access your data.
      </div>
    </div>
  );
}

export default PatientDashboard;
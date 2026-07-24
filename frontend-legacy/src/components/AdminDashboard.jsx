import React, { useState, useEffect, useCallback } from 'react';
import '../AdminDashboard.css';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const API_BASE = 'http://localhost:3000/api/admin';
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function AdminDashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activities, setActivities] = useState([]);
  const [users, setUsers] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, recordId: null });
  const [deleteReason, setDeleteReason] = useState('');
  const [revokeModal, setRevokeModal] = useState({ open: false, recordId: null });
  const [revokeUserId, setRevokeUserId] = useState('');
  const [revokeReason, setRevokeReason] = useState('');

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, ac, u, r] = await Promise.all([
        fetch(`${API_BASE}/dashboard/stats`).then(r => r.json()),
        fetch(`${API_BASE}/dashboard/analytics?days=7`).then(r => r.json()),
        fetch(`${API_BASE}/activity-logs?limit=20`).then(r => r.json()),
        fetch(`${API_BASE}/users`).then(r => r.json()),
        fetch(`${API_BASE}/records?limit=50`).then(r => r.json()),
      ]);
      setStats(s.data);
      setAnalytics(a.data);
      setActivities(ac.data || []);
      setUsers(u.data || []);
      setRecords(r.data || []);
    } catch (err) {
      showToast('Failed to load data: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const updateUserStatus = (userId, newStatus) => {
    fetch(`${API_BASE}/users/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status: newStatus })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUsers(prev => prev.map(u => u.userId === userId ? { ...u, status: newStatus } : u));
          showToast('User "' + userId + '" status changed to ' + newStatus);
        } else {
          showToast(data.error || 'Failed', true);
        }
      })
      .catch(err => showToast('Error: ' + err.message, true));
  };

  const deleteRecord = () => {
    fetch(`${API_BASE}/records/${deleteModal.recordId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: deleteReason })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRecords(prev => prev.map(r => r.recordId === deleteModal.recordId ? { ...r, status: 'deleted' } : r));
          showToast('Record deleted successfully');
        } else {
          showToast(data.error || 'Failed to delete', true);
        }
      })
      .catch(err => showToast('Error: ' + err.message, true))
      .finally(() => { setDeleteModal({ open: false, recordId: null }); setDeleteReason(''); });
  };

  const revokeAccess = () => {
    fetch(`${API_BASE}/permissions/revoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recordId: revokeModal.recordId, userId: revokeUserId, reason: revokeReason })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) showToast('Access revoked for "' + revokeUserId + '"');
        else showToast(data.error || 'Failed', true);
      })
      .catch(err => showToast('Error: ' + err.message, true))
      .finally(() => { setRevokeModal({ open: false, recordId: null }); setRevokeUserId(''); setRevokeReason(''); });
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}><h2>Loading...</h2></div>;

  return (
    <div className="admin-dashboard">
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999, background: toast.isError ? '#e74c3c' : '#27ae60', color: '#fff', padding: '14px 22px', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.25)', fontWeight: 600, fontSize: 14, minWidth: 250 }}>
          {toast.isError ? '❌ ' : '✅ '}{toast.msg}
        </div>
      )}

      {deleteModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420 }}>
            <h3 style={{ marginTop: 0 }}>Delete Record</h3>
            <p>Record: <code>{deleteModal.recordId}</code></p>
            <textarea placeholder="Reason (optional)" value={deleteReason} onChange={e => setDeleteReason(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', minHeight: 70, boxSizing: 'border-box' }} />
            <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-sm" onClick={() => setDeleteModal({ open: false, recordId: null })}>Cancel</button>
              <button className="btn-sm danger" onClick={deleteRecord}>Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {revokeModal.open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420 }}>
            <h3 style={{ marginTop: 0 }}>Force Revoke Access</h3>
            <p>Record: <code>{revokeModal.recordId}</code></p>
            <input placeholder="User ID to revoke *" value={revokeUserId} onChange={e => setRevokeUserId(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #ddd', boxSizing: 'border-box' }} />
            <textarea placeholder="Reason (optional)" value={revokeReason} onChange={e => setRevokeReason(e.target.value)} style={{ width: '100%', marginTop: 8, padding: 8, borderRadius: 6, border: '1px solid #ddd', minHeight: 60, boxSizing: 'border-box' }} />
            <div style={{ marginTop: 16, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-sm" onClick={() => setRevokeModal({ open: false, recordId: null })}>Cancel</button>
              <button className="btn-sm danger" onClick={revokeAccess} disabled={!revokeUserId}>Revoke</button>
            </div>
          </div>
        </div>
      )}

      <div className="admin-header">
        <h1>🗃️ Administrative Control Panel</h1>
        <p>Logged in as: <strong>{user?.userId}</strong> &nbsp;
          <button className="btn-sm" onClick={fetchDashboardData}>Refresh</button>
        </p>
      </div>

      <div className="admin-tabs">
        {[['overview','Overview'],['analytics','Analytics'],['users','Users'],['records','Records'],['activity','Activity Logs']].map(([key, label]) => (
          <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => setActiveTab(key)}>{label}</button>
        ))}
      </div>

      {activeTab === 'overview' && stats && (
        <div>
          <div className="stats-grid">
            <div className="stat-card blue"><div className="stat-icon">📊</div><div className="stat-details"><h3>Total Records</h3><div className="stat-value">{stats.overview.totalRecords}</div><p>+{stats.overview.recentUploads} this week</p></div></div>
            <div className="stat-card green"><div className="stat-icon">👥</div><div className="stat-details"><h3>Total Users</h3><div className="stat-value">{stats.overview.totalUsers}</div><p>{stats.overview.totalPatients} patients, {stats.overview.totalDoctors} doctors</p></div></div>
            <div className="stat-card orange"><div className="stat-icon">⚡</div><div className="stat-details"><h3>Activity (24h)</h3><div className="stat-value">{stats.overview.recentActivity}</div><p>User actions</p></div></div>
            <div className="stat-card purple"><div className="stat-icon">💾</div><div className="stat-details"><h3>Storage Used</h3><div className="stat-value">{stats.overview.totalStorage} MB</div><p>Across all records</p></div></div>
          </div>
          <div className="chart-container">
            <h3>Records by Type</h3>
            {stats.recordsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart><Pie data={stats.recordsByType} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={100} label>{stats.recordsByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
              </ResponsiveContainer>
            ) : <p>No records yet.</p>}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && analytics && (
        <div>
          <div className="chart-container">
            <h3>Daily Activity (Last 7 Days)</h3>
            {analytics.dailyActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.dailyActivity}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} /></LineChart>
              </ResponsiveContainer>
            ) : <p>No activity data yet.</p>}
          </div>
          <div className="chart-container">
            <h3>Activity by Type</h3>
            {analytics.activityByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.activityByType}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="action" angle={-45} textAnchor="end" height={100} /><YAxis /><Tooltip /><Bar dataKey="count" fill="#82ca9d" /></BarChart>
              </ResponsiveContainer>
            ) : <p>No activity data yet.</p>}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="admin-section">
          <h3>User Management ({users.length} users)</h3>
          <table className="admin-table">
            <thead><tr><th>User ID</th><th>Name</th><th>Role</th><th>Status</th><th>Registered</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.userId}>
                  <td><strong>{u.userId}</strong></td>
                  <td>{u.name}</td>
                  <td><span className={'badge ' + u.role}>{u.role}</span></td>
                  <td><span className={'status ' + u.status}>{u.status}</span></td>
                  <td>{new Date(u.registeredAt).toLocaleDateString()}</td>
                  <td>
                    {u.status !== 'active' && <button className="btn-sm" style={{ background: '#d1fae5', color: '#065f46', marginRight: 4 }} onClick={() => updateUserStatus(u.userId, 'active')}>Activate</button>}
                    {u.status !== 'suspended' && <button className="btn-sm danger" style={{ marginRight: 4 }} onClick={() => updateUserStatus(u.userId, 'suspended')}>Suspend</button>}
                    {u.status !== 'inactive' && <button className="btn-sm" style={{ background: '#e5e7eb', marginRight: 4 }} onClick={() => updateUserStatus(u.userId, 'inactive')}>Deactivate</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'records' && (
        <div className="admin-section">
          <h3>Record Management ({records.length} records)</h3>
          {records.length === 0 ? <p>No records found.</p> : (
            <table className="admin-table">
              <thead><tr><th>Record ID</th><th>Patient</th><th>Type</th><th>Date</th><th>Size</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.recordId}>
                    <td><code>{record.recordId?.slice(0, 12)}...</code></td>
                    <td>{record.patientName}</td>
                    <td>{record.recordType}</td>
                    <td>{new Date(record.uploadDate).toLocaleDateString()}</td>
                    <td>{(record.fileSize / 1024 / 1024).toFixed(2)} MB</td>
                    <td><span className={'status ' + record.status}>{record.status}</span></td>
                    <td>
                      {record.status !== 'deleted' ? (
                        <>
                          <button className="btn-sm danger" style={{ marginRight: 4 }} onClick={() => setDeleteModal({ open: true, recordId: record.recordId })}>Delete</button>
                          <button className="btn-sm" style={{ background: '#fef3c7', color: '#92400e' }} onClick={() => setRevokeModal({ open: true, recordId: record.recordId })}>Revoke</button>
                        </>
                      ) : <span style={{ color: '#e74c3c', fontSize: 12 }}>Deleted</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'activity' && (
        <div className="admin-section">
          <h3>Activity Logs</h3>
          {activities.length === 0 ? <p>No activity logs yet.</p> : (
            <table className="admin-table">
              <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Record</th><th>IP</th></tr></thead>
              <tbody>
                {activities.map(a => (
                  <tr key={a._id}>
                    <td>{new Date(a.timestamp).toLocaleString()}</td>
                    <td>{a.userId}</td>
                    <td><span className="badge">{a.action}</span></td>
                    <td><code>{a.recordId || '-'}</code></td>
                    <td>{a.ipAddress || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

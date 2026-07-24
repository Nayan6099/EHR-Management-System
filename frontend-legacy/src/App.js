import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PatientDashboard from './components/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard';
import NurseDashboard from './components/NurseDashboard';
import ReceptionistDashboard from './components/ReceptionistDashboard';
import LabTechnicianDashboard from './components/LabTechnicianDashboard';
import PharmacistDashboard from './components/PharmacistDashboard';
import AdminDashboard from './components/AdminDashboard';
import ManagementDashboard from './components/ManagementDashboard';
import UploadEHR from './components/UploadEHR';
import ViewEHR from './components/ViewEHR';
import ManageAccess from './components/ManageAccess';
import './App.css';

const ROLE_LABELS = {
  patient: 'Patient',
  doctor: 'Doctor',
  nurse: 'Nurse',
  receptionist: 'Receptionist',
  lab_technician: 'Laboratory Technician',
  pharmacist: 'Pharmacist',
  admin_staff: 'Administrative Staff',
  management: 'Healthcare Management',
  admin: 'Admin'
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ userId: '', role: '' });

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginForm.userId && loginForm.role) {
      setCurrentUser({
        userId: loginForm.userId,
        role: loginForm.role,
        orgName: loginForm.role === 'patient' ? 'patient' : 'hospital'
      });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginForm({ userId: '', role: '' });
  };

  if (!currentUser) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h1>🏥 SegueEMR</h1>
          <p className="subtitle">Unified Electronic Medical Records &amp; Practice Management</p>

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>User ID</label>
              <input
                type="text"
                placeholder="e.g., patient123 or dr.smith"
                value={loginForm.userId}
                onChange={(e) => setLoginForm({...loginForm, userId: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Role</label>
              <select
                value={loginForm.role}
                onChange={(e) => setLoginForm({...loginForm, role: e.target.value})}
                required
              >
                <option value="">Select Role</option>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="receptionist">Receptionist</option>
                <option value="lab_technician">Laboratory Technician</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="admin_staff">Administrative Staff</option>
                <option value="management">Healthcare Management</option>
              </select>
            </div>

            <button type="submit" className="btn-primary">
              🔐 Login
            </button>
          </form>

          <div className="info-box">
            <p><strong>Demo Credentials:</strong></p>
            <p>Patient: <code>patient123</code></p>
            <p>Doctor: <code>dr.smith</code></p>
            <p>Any other role: enter any User ID and select the role</p>
          </div>
        </div>
      </div>
    );
  }

  const role = currentUser.role;

  const renderDashboard = () => {
    switch (role) {
      case 'patient': return <PatientDashboard user={currentUser} />;
      case 'doctor': return <DoctorDashboard user={currentUser} />;
      case 'nurse': return <NurseDashboard user={currentUser} />;
      case 'receptionist': return <ReceptionistDashboard user={currentUser} />;
      case 'lab_technician': return <LabTechnicianDashboard user={currentUser} />;
      case 'pharmacist': return <PharmacistDashboard user={currentUser} />;
      case 'admin_staff':
      case 'admin': return <AdminDashboard user={currentUser} />;
      case 'management': return <ManagementDashboard user={currentUser} />;
      default: return <DoctorDashboard user={currentUser} />;
    }
  };

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <h2>🏥 SegueEMR</h2>
          </div>
          <div className="nav-links">
            <Link to="/">Dashboard</Link>
            {role === 'patient' && (
              <>
                <Link to="/upload">Upload Record</Link>
                <Link to="/manage-access">Manage Access</Link>
              </>
            )}
            {(role === 'doctor' || role === 'patient') && (
              <Link to="/view">View Records</Link>
            )}
          </div>
          <div className="nav-user">
            <span>👤 {currentUser.userId} ({ROLE_LABELS[role] || role})</span>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </div>
        </nav>

        <div className="main-content">
          <Routes>
            <Route path="/" element={renderDashboard()} />
            {role === 'patient' && (
              <>
                <Route path="/upload" element={<UploadEHR user={currentUser} />} />
                <Route path="/manage-access" element={<ManageAccess user={currentUser} />} />
              </>
            )}
            {(role === 'doctor' || role === 'patient') && (
              <Route path="/view" element={<ViewEHR user={currentUser} />} />
            )}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;

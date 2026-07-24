/**
 * Simple React Component for Uploading EHR
 * 
 * Place in: frontend/src/components/UploadEHR.jsx
 */

import React, { useState } from 'react';
import api from '../services/api';

function UploadEHR({ user }) {
    const [formData, setFormData] = useState({
        file: null,
        patientId: user.userId,
        patientName: user.userId,
        recordType: 'X-Ray',
        description: ''
    });
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        setFormData({ ...formData, file: e.target.files[0] });
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            // Create FormData for multipart upload
            const data = new FormData();
            data.append('file', formData.file);
            data.append('patientId', formData.patientId);
            data.append('patientName', formData.patientName);
            data.append('recordType', formData.recordType);
            data.append('description', formData.description);

            // Send to backend
            const response = await api.uploadEHR(data);

            setResult(response);
            setFormData({ 
                file: null, 
                patientId: user.userId, 
                patientName: user.userId, 
                recordType: 'X-Ray', 
                description: '' 
            });
            // Reset file input
            document.querySelector('input[type="file"]').value = null;

        } catch (err) {
            setError(err.response?.data?.details || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h2>📤 Upload EHR Record</h2>

            <form onSubmit={handleSubmit}>
                {/* Patient ID */}
                <div style={{ marginBottom: '15px' }}>
                    <label>Patient ID *</label>
                    <input
                        type="text"
                        name="patientId"
                        value={formData.patientId}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., patient123"
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                </div>

                {/* Patient Name */}
                <div style={{ marginBottom: '15px' }}>
                    <label>Patient Name *</label>
                    <input
                        type="text"
                        name="patientName"
                        value={formData.patientName}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., John Doe"
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                </div>

                {/* Record Type */}
                <div style={{ marginBottom: '15px' }}>
                    <label>Record Type *</label>
                    <select
                        name="recordType"
                        value={formData.recordType}
                        onChange={handleInputChange}
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    >
                        <option value="X-Ray">X-Ray</option>
                        <option value="MRI">MRI</option>
                        <option value="Blood Test">Blood Test</option>
                        <option value="CT Scan">CT Scan</option>
                        <option value="Prescription">Prescription</option>
                        <option value="Report">Report</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                {/* Description */}
                <div style={{ marginBottom: '15px' }}>
                    <label>Description</label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Brief description of the record..."
                        rows="3"
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                </div>

                {/* File Upload */}
                <div style={{ marginBottom: '15px' }}>
                    <label>Medical File *</label>
                    <input
                        type="file"
                        onChange={handleFileChange}
                        required
                        style={{ width: '100%', padding: '8px', marginTop: '5px' }}
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: loading ? '#ccc' : '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '16px'
                    }}
                >
                    {loading ? '⏳ Uploading...' : '📤 Upload Record'}
                </button>
            </form>

            {/* Success Message */}
            {result && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px' }}>
                    <h3 style={{ color: '#155724' }}>✅ Success!</h3>
                    <p><strong>Record ID:</strong> {result.data.recordId}</p>
                    <p><strong>IPFS Hash:</strong> {result.data.ipfsHash}</p>
                    <p><strong>File Size:</strong> {(result.data.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                    <p><strong>Upload Date:</strong> {new Date(result.data.uploadDate).toLocaleString()}</p>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px' }}>
                    <h3 style={{ color: '#721c24' }}>❌ Error</h3>
                    <p>{error}</p>
                </div>
            )}

            {/* Info Box */}
            <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#d1ecf1', border: '1px solid #bee5eb', borderRadius: '4px', fontSize: '14px' }}>
                <strong>ℹ️ How it works:</strong>
                <ol style={{ marginTop: '10px', paddingLeft: '20px' }}>
                    <li>File uploaded to IPFS (gets unique hash)</li>
                    <li>Hash stored on blockchain (immutable)</li>
                    <li>Metadata saved in MongoDB (fast queries)</li>
                    <li>Patient gets full control over access</li>
                </ol>
            </div>
        </div>
    );
}

export default UploadEHR;
/**
 * EHR Routes - API endpoints
 */

const express = require('express');
const multer = require('multer');
const ehrController = require('../controllers/ehrController');
const User = require('../models/User');

const router = express.Router();

// Configure file upload (stores in memory temporarily)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024  // 100 MB limit
    }
});

/**
 * @route   POST /api/ehr/upload
 * @desc    Upload new EHR record
 * @body    file (multipart), patientId, patientName, recordType, description
 */
router.post('/upload', upload.single('file'), ehrController.uploadEHR);

/**
 * @route   GET /api/ehr/view
 * @desc    View/download EHR record
 * @query   recordId, userId, orgName
 */
router.get('/view', ehrController.viewEHR);

/**
 * @route   GET /api/ehr/details
 * @desc    Get record details (metadata only)
 * @query   recordId, userId, orgName
 */
router.get('/details', ehrController.getRecordDetails);

/**
 * @route   POST /api/ehr/grant-access
 * @desc    Grant access to doctor
 * @body    recordId, patientId, doctorId
 */
router.post('/grant-access', ehrController.grantAccess);

/**
 * @route   POST /api/ehr/revoke-access
 * @desc    Revoke access from doctor
 * @body    recordId, patientId, doctorId
 */
router.post('/revoke-access', ehrController.revokeAccess);

/**
 * @route   GET /api/ehr/history
 * @desc    Get access history (audit trail)
 * @query   recordId, userId, orgName
 */
router.get('/history', ehrController.getAccessHistory);

/**
 * @route   GET /api/ehr/patient-records
 * @desc    List all records for a patient
 * @query   patientId, userId, orgName
 */
router.get('/patient-records', ehrController.listPatientRecords);
router.post('/register-user', async (req, res) => {
  try {
    const { userId, name, orgName, role } = req.body;

    if (!userId || !name || !orgName || !role) {
      return res.status(400).json({ error: 'userId, name, orgName, and role are required' });
    }

    const existing = await User.findOne({ userId });
    if (existing) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const newUser = await User.create({
      userId,
      name,
      orgName,
      role,
      status: 'active',
      registeredAt: new Date()
    });

    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
// Doctor delete patient record
router.delete('/delete/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { userId, orgName } = req.query;

    if (!userId || !orgName) {
      return res.status(400).json({ error: 'userId and orgName are required' });
    }

    const EHRMetadata = require('../models/EHRMetadata');
    const record = await EHRMetadata.findOne({ recordId });

    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Allow doctor or patient owner to delete
    if (record.patientId !== userId && !record.authorizedUsers.includes(userId)) {
      return res.status(403).json({ error: 'Access denied. You are not authorized to delete this record.' });
    }

    await EHRMetadata.findOneAndUpdate(
      { recordId },
      { status: 'deleted', deletedAt: new Date(), deletedBy: userId }
    );

    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

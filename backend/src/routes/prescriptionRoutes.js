/**
 * Prescription Routes
 */

const express = require('express');
const prescriptionController = require('../controllers/prescriptionController');

const router = express.Router();

// @route   POST /api/prescriptions
// @desc    Issue a new prescription (Doctor)
router.post('/', prescriptionController.createPrescription);

// @route   GET /api/prescriptions
// @desc    List prescriptions, filter by patientId/doctorId/status
router.get('/', prescriptionController.listPrescriptions);

// @route   PUT /api/prescriptions/:prescriptionId/dispense
// @desc    Mark a prescription as dispensed (Pharmacist)
router.put('/:prescriptionId/dispense', prescriptionController.dispensePrescription);

module.exports = router;

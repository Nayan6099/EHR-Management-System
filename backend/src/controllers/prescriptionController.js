/**
 * Prescription Controller
 *
 * Features:
 * - Doctor: create prescriptions
 * - Pharmacist: view pending prescriptions, dispense, track history
 */

const crypto = require('crypto');
const Prescription = require('../models/Prescription');
const { logActivity } = require('../services/activityLogger');

const genId = () => `RX-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

class PrescriptionController {
    // Doctor: issue a new prescription
    async createPrescription(req, res) {
        try {
            const { patientId, patientName, doctorId, doctorName, medications, diagnosis } = req.body;

            if (!patientId || !patientName || !doctorId || !medications || !medications.length) {
                return res.status(400).json({
                    success: false,
                    error: 'patientId, patientName, doctorId, and at least one medication are required'
                });
            }

            const prescription = await Prescription.create({
                prescriptionId: genId(),
                patientId,
                patientName,
                doctorId,
                doctorName: doctorName || '',
                medications,
                diagnosis: diagnosis || ''
            });

            await logActivity('PRESCRIPTION_CREATED', doctorId, { prescriptionId: prescription.prescriptionId, patientId });

            return res.status(201).json({ success: true, data: prescription });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // Pharmacist: mark a prescription as dispensed
    async dispensePrescription(req, res) {
        try {
            const { prescriptionId } = req.params;
            const { dispensedBy } = req.body;

            if (!dispensedBy) {
                return res.status(400).json({ success: false, error: 'dispensedBy is required' });
            }

            const prescription = await Prescription.findOneAndUpdate(
                { prescriptionId, status: 'pending' },
                { status: 'dispensed', dispensedBy, dispensedAt: new Date() },
                { new: true }
            );

            if (!prescription) {
                return res.status(404).json({ success: false, error: 'Pending prescription not found' });
            }

            await logActivity('PRESCRIPTION_DISPENSED', dispensedBy, { prescriptionId });

            return res.json({ success: true, data: prescription });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // List prescriptions, filterable by patientId, doctorId, or status
    async listPrescriptions(req, res) {
        try {
            const { patientId, doctorId, status } = req.query;
            const filter = {};
            if (patientId) filter.patientId = patientId;
            if (doctorId) filter.doctorId = doctorId;
            if (status) filter.status = status;

            const prescriptions = await Prescription.find(filter).sort({ createdAt: -1 });
            return res.json({ success: true, data: prescriptions });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = new PrescriptionController();

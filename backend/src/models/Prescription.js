/**
 * Prescription Model - Stores prescriptions issued by doctors
 * and tracks pharmacist dispensing status.
 */

const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema({
    name: { type: String, required: true },
    dosage: { type: String, default: '' },
    frequency: { type: String, default: '' },
    duration: { type: String, default: '' }
}, { _id: false });

const PrescriptionSchema = new mongoose.Schema({
    prescriptionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    patientId: {
        type: String,
        required: true,
        index: true
    },
    patientName: {
        type: String,
        required: true
    },
    doctorId: {
        type: String,
        required: true,
        index: true
    },
    doctorName: {
        type: String,
        default: ''
    },
    medications: {
        type: [MedicationSchema],
        default: []
    },
    diagnosis: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'dispensed', 'cancelled'],
        default: 'pending',
        index: true
    },
    dispensedBy: {
        type: String,
        default: null
    },
    dispensedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const Prescription = mongoose.model('Prescription', PrescriptionSchema);

module.exports = Prescription;

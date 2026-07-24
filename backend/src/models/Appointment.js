/**
 * Appointment Model - Stores appointment scheduling data
 */

const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
    appointmentId: {
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
    department: {
        type: String,
        default: 'General'
    },
    scheduledAt: {
        type: Date,
        required: true
    },
    reason: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['scheduled', 'checked-in', 'completed', 'cancelled', 'no-show'],
        default: 'scheduled',
        index: true
    },
    createdBy: {
        type: String,
        required: true
    },
    notes: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

AppointmentSchema.index({ scheduledAt: 1, status: 1 });

const Appointment = mongoose.model('Appointment', AppointmentSchema);

module.exports = Appointment;

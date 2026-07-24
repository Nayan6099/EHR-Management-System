/**
 * Appointment Controller
 *
 * Features:
 * - Receptionist: schedule, reschedule, cancel, check-in patients
 * - Doctor / Nurse: view their schedule, mark completed / no-show
 */

const crypto = require('crypto');
const Appointment = require('../models/Appointment');
const { logActivity } = require('../services/activityLogger');

const genId = () => `APT-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

class AppointmentController {
    // Receptionist: create a new appointment
    async createAppointment(req, res) {
        try {
            const { patientId, patientName, doctorId, doctorName, department, scheduledAt, reason, createdBy } = req.body;

            if (!patientId || !patientName || !doctorId || !scheduledAt || !createdBy) {
                return res.status(400).json({
                    success: false,
                    error: 'patientId, patientName, doctorId, scheduledAt, and createdBy are required'
                });
            }

            const appointment = await Appointment.create({
                appointmentId: genId(),
                patientId,
                patientName,
                doctorId,
                doctorName: doctorName || '',
                department: department || 'General',
                scheduledAt: new Date(scheduledAt),
                reason: reason || '',
                createdBy
            });

            await logActivity('APPOINTMENT_CREATED', createdBy, { appointmentId: appointment.appointmentId, patientId, doctorId });

            return res.status(201).json({ success: true, data: appointment });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // Receptionist: reschedule
    async updateAppointment(req, res) {
        try {
            const { appointmentId } = req.params;
            const { scheduledAt, status, notes, updatedBy } = req.body;

            const update = {};
            if (scheduledAt) update.scheduledAt = new Date(scheduledAt);
            if (status) update.status = status;
            if (notes !== undefined) update.notes = notes;

            const appointment = await Appointment.findOneAndUpdate({ appointmentId }, update, { new: true });
            if (!appointment) {
                return res.status(404).json({ success: false, error: 'Appointment not found' });
            }

            await logActivity('APPOINTMENT_UPDATED', updatedBy || 'unknown', { appointmentId, update });

            return res.json({ success: true, data: appointment });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // Receptionist: cancel
    async cancelAppointment(req, res) {
        try {
            const { appointmentId } = req.params;
            const { cancelledBy } = req.body;

            const appointment = await Appointment.findOneAndUpdate(
                { appointmentId },
                { status: 'cancelled' },
                { new: true }
            );
            if (!appointment) {
                return res.status(404).json({ success: false, error: 'Appointment not found' });
            }

            await logActivity('APPOINTMENT_CANCELLED', cancelledBy || 'unknown', { appointmentId });

            return res.json({ success: true, data: appointment });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // List appointments, filterable by doctorId, patientId, or date range
    async listAppointments(req, res) {
        try {
            const { doctorId, patientId, status, from, to } = req.query;
            const filter = {};
            if (doctorId) filter.doctorId = doctorId;
            if (patientId) filter.patientId = patientId;
            if (status) filter.status = status;
            if (from || to) {
                filter.scheduledAt = {};
                if (from) filter.scheduledAt.$gte = new Date(from);
                if (to) filter.scheduledAt.$lte = new Date(to);
            }

            const appointments = await Appointment.find(filter).sort({ scheduledAt: 1 });
            return res.json({ success: true, data: appointments });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = new AppointmentController();

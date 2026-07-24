/**
 * Analytics Controller
 *
 * Features:
 * - Healthcare Management Teams: organization-wide operational metrics
 *   spanning appointments, prescriptions, lab orders, billing, and users.
 */

const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const LabOrder = require('../models/LabOrder');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

class AnalyticsController {
    async getOverview(req, res) {
        try {
            const [
                appointmentsToday,
                appointmentsByStatus,
                pendingPrescriptions,
                dispensedPrescriptions,
                labOrdersByStatus,
                revenueAgg,
                unpaidInvoices,
                staffByRole,
                recentActivityCount
            ] = await Promise.all([
                Appointment.countDocuments({
                    scheduledAt: {
                        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                        $lte: new Date(new Date().setHours(23, 59, 59, 999))
                    }
                }),
                Appointment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
                Prescription.countDocuments({ status: 'pending' }),
                Prescription.countDocuments({ status: 'dispensed' }),
                LabOrder.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
                Invoice.aggregate([
                    { $match: { status: 'paid' } },
                    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
                ]),
                Invoice.countDocuments({ status: 'unpaid' }),
                User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
                ActivityLog.countDocuments({
                    timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                })
            ]);

            return res.json({
                success: true,
                data: {
                    appointmentsToday,
                    appointmentsByStatus,
                    prescriptions: { pending: pendingPrescriptions, dispensed: dispensedPrescriptions },
                    labOrdersByStatus,
                    revenueCollected: revenueAgg.length ? revenueAgg[0].total : 0,
                    unpaidInvoices,
                    staffByRole,
                    recentActivityCount
                }
            });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = new AnalyticsController();

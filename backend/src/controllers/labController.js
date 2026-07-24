/**
 * Lab Controller
 *
 * Features:
 * - Doctor: order lab tests
 * - Lab Technician: view incoming orders, update status, upload results
 */

const crypto = require('crypto');
const LabOrder = require('../models/LabOrder');
const { logActivity } = require('../services/activityLogger');

const genId = () => `LAB-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

class LabController {
    // Doctor: order a lab test
    async createLabOrder(req, res) {
        try {
            const { patientId, patientName, doctorId, testType } = req.body;

            if (!patientId || !patientName || !doctorId || !testType) {
                return res.status(400).json({
                    success: false,
                    error: 'patientId, patientName, doctorId, and testType are required'
                });
            }

            const labOrder = await LabOrder.create({
                labOrderId: genId(),
                patientId,
                patientName,
                doctorId,
                testType
            });

            await logActivity('LAB_ORDER_CREATED', doctorId, { labOrderId: labOrder.labOrderId, patientId, testType });

            return res.status(201).json({ success: true, data: labOrder });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // Lab Technician: update sample/test status
    async updateLabOrderStatus(req, res) {
        try {
            const { labOrderId } = req.params;
            const { status, processedBy } = req.body;

            if (!status || !processedBy) {
                return res.status(400).json({ success: false, error: 'status and processedBy are required' });
            }

            const labOrder = await LabOrder.findOneAndUpdate(
                { labOrderId },
                { status, processedBy },
                { new: true }
            );

            if (!labOrder) {
                return res.status(404).json({ success: false, error: 'Lab order not found' });
            }

            await logActivity('LAB_ORDER_UPDATED', processedBy, { labOrderId, status });

            return res.json({ success: true, data: labOrder });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // Lab Technician: upload results / summary and mark completed
    async uploadResult(req, res) {
        try {
            const { labOrderId } = req.params;
            const { resultSummary, resultFileId, processedBy } = req.body;

            if (!resultSummary || !processedBy) {
                return res.status(400).json({ success: false, error: 'resultSummary and processedBy are required' });
            }

            const labOrder = await LabOrder.findOneAndUpdate(
                { labOrderId },
                {
                    resultSummary,
                    resultFileId: resultFileId || null,
                    processedBy,
                    status: 'completed',
                    completedAt: new Date()
                },
                { new: true }
            );

            if (!labOrder) {
                return res.status(404).json({ success: false, error: 'Lab order not found' });
            }

            await logActivity('LAB_RESULT_UPLOADED', processedBy, { labOrderId });

            return res.json({ success: true, data: labOrder });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // List lab orders, filterable by patientId, doctorId, or status
    async listLabOrders(req, res) {
        try {
            const { patientId, doctorId, status } = req.query;
            const filter = {};
            if (patientId) filter.patientId = patientId;
            if (doctorId) filter.doctorId = doctorId;
            if (status) filter.status = status;

            const labOrders = await LabOrder.find(filter).sort({ createdAt: -1 });
            return res.json({ success: true, data: labOrders });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = new LabController();

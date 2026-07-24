/**
 * Billing Controller
 *
 * Features:
 * - Receptionist / Administrative Staff: generate invoices, record payments
 */

const crypto = require('crypto');
const Invoice = require('../models/Invoice');
const { logActivity } = require('../services/activityLogger');

const genId = () => `INV-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

class BillingController {
    // Create a new invoice
    async createInvoice(req, res) {
        try {
            const { patientId, patientName, items, createdBy } = req.body;

            if (!patientId || !patientName || !items || !items.length || !createdBy) {
                return res.status(400).json({
                    success: false,
                    error: 'patientId, patientName, items, and createdBy are required'
                });
            }

            const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);

            const invoice = await Invoice.create({
                invoiceId: genId(),
                patientId,
                patientName,
                items,
                totalAmount,
                createdBy
            });

            await logActivity('INVOICE_CREATED', createdBy, { invoiceId: invoice.invoiceId, patientId, totalAmount });

            return res.status(201).json({ success: true, data: invoice });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // Mark an invoice as paid
    async markPaid(req, res) {
        try {
            const { invoiceId } = req.params;
            const { updatedBy } = req.body;

            const invoice = await Invoice.findOneAndUpdate(
                { invoiceId },
                { status: 'paid', paidAt: new Date() },
                { new: true }
            );

            if (!invoice) {
                return res.status(404).json({ success: false, error: 'Invoice not found' });
            }

            await logActivity('INVOICE_PAID', updatedBy || 'unknown', { invoiceId });

            return res.json({ success: true, data: invoice });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }

    // List invoices, filterable by patientId or status
    async listInvoices(req, res) {
        try {
            const { patientId, status } = req.query;
            const filter = {};
            if (patientId) filter.patientId = patientId;
            if (status) filter.status = status;

            const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
            return res.json({ success: true, data: invoices });
        } catch (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = new BillingController();

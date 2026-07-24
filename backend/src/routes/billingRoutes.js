/**
 * Billing Routes
 */

const express = require('express');
const billingController = require('../controllers/billingController');

const router = express.Router();

// @route   POST /api/billing/invoices
// @desc    Create a new invoice (Receptionist / Admin Staff)
router.post('/invoices', billingController.createInvoice);

// @route   GET /api/billing/invoices
// @desc    List invoices, filter by patientId/status
router.get('/invoices', billingController.listInvoices);

// @route   PUT /api/billing/invoices/:invoiceId/pay
// @desc    Mark an invoice as paid
router.put('/invoices/:invoiceId/pay', billingController.markPaid);

module.exports = router;

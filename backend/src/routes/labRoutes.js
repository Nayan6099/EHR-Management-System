/**
 * Lab Routes
 */

const express = require('express');
const labController = require('../controllers/labController');

const router = express.Router();

// @route   POST /api/lab/orders
// @desc    Order a lab test (Doctor)
router.post('/orders', labController.createLabOrder);

// @route   GET /api/lab/orders
// @desc    List lab orders, filter by patientId/doctorId/status
router.get('/orders', labController.listLabOrders);

// @route   PUT /api/lab/orders/:labOrderId/status
// @desc    Update sample/test status (Lab Technician)
router.put('/orders/:labOrderId/status', labController.updateLabOrderStatus);

// @route   PUT /api/lab/orders/:labOrderId/result
// @desc    Upload result and mark completed (Lab Technician)
router.put('/orders/:labOrderId/result', labController.uploadResult);

module.exports = router;

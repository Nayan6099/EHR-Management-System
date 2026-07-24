/**
 * Analytics Routes
 */

const express = require('express');
const analyticsController = require('../controllers/analyticsController');

const router = express.Router();

// @route   GET /api/analytics/overview
// @desc    Organization-wide operational metrics (Healthcare Management Teams)
router.get('/overview', analyticsController.getOverview);

module.exports = router;

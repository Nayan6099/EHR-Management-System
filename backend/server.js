/**
 * Backend Server - Express.js API server
 * 
 * Connects frontend to:
 * - PostgreSQL relational database
 * - Azure Blob Storage
 * - Azure Dataverse
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const activityLoggerMiddleware = require('./src/middleware/activityLogger');
const ehrRoutes = require('./src/routes/ehrRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const appointmentRoutes = require('./src/routes/appointmentRoutes');
const prescriptionRoutes = require('./src/routes/prescriptionRoutes');
const labRoutes = require('./src/routes/labRoutes');
const billingRoutes = require('./src/routes/billingRoutes');
const analyticsRoutes = require('./src/routes/analyticsRoutes');

const app = express();
const db = require('./src/config/db');

// Test database connection on startup
db.query('SELECT NOW()')
  .then(() => console.log('✓ Connected to PostgreSQL database successfully.'))
  .catch(err => console.error('✗ Failed to connect to PostgreSQL database:', err.message));

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());  // Allow cross-origin requests
app.use(express.json());  // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded bodies
app.use(morgan('dev'));  // HTTP request logging
app.use(activityLoggerMiddleware); // Log every write operation
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'SegueEMR Backend Server is running',
        timestamp: new Date().toISOString()
    });
});

// API Routes
app.use('/api/ehr', ehrRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        availableEndpoints: [
            'POST /api/ehr/upload',
            'POST /api/ehr/register-user',
            'GET /api/ehr/view',
            'GET /api/ehr/details',
            'POST /api/ehr/grant-access',
            'POST /api/ehr/revoke-access',
            'GET /api/ehr/history',
            'GET /api/ehr/patient-records'
        ]
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║   SegueEMR Backend Server                              ║
║   Status: RUNNING                                 ║
║   Port: ${PORT}                                      ║
║   API Base: http://localhost:${PORT}/api/ehr         ║
╚═══════════════════════════════════════════════════╝
    `);
});
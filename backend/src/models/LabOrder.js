/**
 * LabOrder Model - Stores laboratory test orders and results
 */

const mongoose = require('mongoose');

const LabOrderSchema = new mongoose.Schema({
    labOrderId: {
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
        required: true
    },
    testType: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['ordered', 'sample-collected', 'in-progress', 'completed', 'cancelled'],
        default: 'ordered',
        index: true
    },
    resultSummary: {
        type: String,
        default: ''
    },
    resultFileId: {
        type: String,
        default: null
    },
    processedBy: {
        type: String,
        default: null
    },
    completedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const LabOrder = mongoose.model('LabOrder', LabOrderSchema);

module.exports = LabOrder;

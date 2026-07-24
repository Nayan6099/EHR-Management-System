/**
 * Activity Log Model - Tracks all user actions
 */

const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'LOGIN',
            'LOGOUT',
            'RECORD_UPLOADED',
            'RECORD_VIEWED',
            'RECORD_DOWNLOADED',
            'ACCESS_GRANTED',
            'ACCESS_REVOKED',
            'RECORD_DELETED',
            'USER_CREATED',
            'USER_UPDATED',
            'USER_STATUS_UPDATED',
            'ADMIN_FORCE_REVOKE',
            'PERMISSION_CHANGED',
            'APPOINTMENT_CREATED',
            'APPOINTMENT_UPDATED',
            'APPOINTMENT_CANCELLED',
            'PRESCRIPTION_CREATED',
            'PRESCRIPTION_DISPENSED',
            'LAB_ORDER_CREATED',
            'LAB_ORDER_UPDATED',
            'LAB_RESULT_UPLOADED',
            'INVOICE_CREATED',
            'INVOICE_PAID',
            'SYSTEM_ERROR'
        ],
        index: true
    },
    recordId: {
        type: String,
        default: null
    },
    targetUserId: {
        type: String,
        default: null
    },
    details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    ipAddress: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    status: {
        type: String,
        enum: ['success', 'failed', 'pending'],
        default: 'success'
    },
    errorMessage: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ action: 1, timestamp: -1 });
ActivityLogSchema.index({ recordId: 1 });

// Static method to log activity
ActivityLogSchema.statics.logActivity = async function(data) {
    try {
        return await this.create(data);
    } catch (error) {
        console.error('Error logging activity:', error);
    }
};

// Get activity summary for a user
ActivityLogSchema.statics.getUserSummary = async function(userId, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return await this.aggregate([
        { $match: { userId, timestamp: { $gte: startDate } } },
        {
            $group: {
                _id: '$action',
                count: { $sum: 1 }
            }
        }
    ]);
};

const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);

module.exports = ActivityLog;
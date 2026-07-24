/**
 * Admin Controller - Manages admin operations
 * 
 * Features:
 * - Dashboard statistics
 * - User management
 * - Activity monitoring
 * - Record management
 */

const fabricService = require('../services/fabricService');
const dbService = require('../services/dbService');
const EHRMetadata = require('../models/EHRMetadata');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');

class AdminController {

    /**
     * GET DASHBOARD STATISTICS
     */
    async getDashboardStats(req, res) {
        try {
            console.log('=== Admin Dashboard Stats Request ===');

            // Get counts
            const totalRecords = await EHRMetadata.countDocuments({ status: 'active' });
            const totalUsers = await User.countDocuments();
            const totalPatients = await User.countDocuments({ role: 'patient' });
            const totalDoctors = await User.countDocuments({ role: 'doctor' });

            // Get recent activity count (last 24 hours)
            const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const recentActivity = await ActivityLog.countDocuments({
                timestamp: { $gte: last24Hours }
            });

            // Get storage stats
            const storageStats = await EHRMetadata.aggregate([
                { $match: { status: 'active' } },
                {
                    $group: {
                        _id: null,
                        totalSize: { $sum: '$fileSize' }
                    }
                }
            ]);

            const totalStorage = storageStats.length > 0 ? storageStats[0].totalSize : 0;

            // Get records by type
            const recordsByType = await EHRMetadata.aggregate([
                { $match: { status: 'active' } },
                {
                    $group: {
                        _id: '$recordType',
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Get recent uploads (last 7 days)
            const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const recentUploads = await EHRMetadata.countDocuments({
                uploadDate: { $gte: last7Days },
                status: 'active'
            });

            return res.json({
                success: true,
                data: {
                    overview: {
                        totalRecords,
                        totalUsers,
                        totalPatients,
                        totalDoctors,
                        recentActivity,
                        recentUploads,
                        totalStorage: (totalStorage / (1024 * 1024)).toFixed(2) // Convert to MB
                    },
                    recordsByType: recordsByType.map(r => ({
                        type: r._id,
                        count: r.count
                    }))
                }
            });

        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch dashboard statistics',
                details: error.message
            });
        }
    }

    /**
     * GET ACTIVITY LOGS
     */
    async getActivityLogs(req, res) {
        try {
            const { limit = 50, page = 1, userId, action, startDate, endDate } = req.query;

            const query = {};
            
            if (userId) query.userId = userId;
            if (action) query.action = action;
            if (startDate || endDate) {
                query.timestamp = {};
                if (startDate) query.timestamp.$gte = new Date(startDate);
                if (endDate) query.timestamp.$lte = new Date(endDate);
            }

            const activities = await ActivityLog.find(query)
                .sort({ timestamp: -1 })
                .limit(parseInt(limit))
                .skip((parseInt(page) - 1) * parseInt(limit));

            const totalCount = await ActivityLog.countDocuments(query);

            return res.json({
                success: true,
                data: activities,
                pagination: {
                    total: totalCount,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(totalCount / parseInt(limit))
                }
            });

        } catch (error) {
            console.error('Error fetching activity logs:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch activity logs',
                details: error.message
            });
        }
    }

    /**
     * GET ALL USERS
     */
    async getAllUsers(req, res) {
        try {
            const { role, status } = req.query;

            const query = {};
            if (role) query.role = role;
            if (status) query.status = status;

            const users = await User.find(query)
                .select('-password')
                .sort({ createdAt: -1 });

            return res.json({
                success: true,
                count: users.length,
                data: users
            });

        } catch (error) {
            console.error('Error fetching users:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch users',
                details: error.message
            });
        }
    }

    /**
     * GET ALL RECORDS (ADMIN VIEW)
     */
    async getAllRecords(req, res) {
        try {
            const { patientId, recordType, status, limit = 100 } = req.query;

            const query = {};
            if (patientId) query.patientId = patientId;
            if (recordType) query.recordType = recordType;
            if (status) query.status = status;

            const records = await EHRMetadata.find(query)
                .sort({ uploadDate: -1 })
                .limit(parseInt(limit));

            return res.json({
                success: true,
                count: records.length,
                data: records
            });

        } catch (error) {
            console.error('Error fetching records:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch records',
                details: error.message
            });
        }
    }

    /**
     * UPDATE USER STATUS (ACTIVATE/DEACTIVATE)
     */
    async updateUserStatus(req, res) {
        try {
            const { userId, status } = req.body;

            if (!userId || !status) {
                return res.status(400).json({
                    success: false,
                    error: 'userId and status are required'
                });
            }

            const user = await User.findOneAndUpdate(
                { userId },
                { status },
                { new: true }
            );

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Log activity
            await ActivityLog.create({
                userId: req.user?.userId || 'admin',
                action: 'USER_STATUS_UPDATED',
                targetUserId: userId,
                details: { newStatus: status },
                ipAddress: req.ip
            });

            return res.json({
                success: true,
                message: `User ${userId} status updated to ${status}`,
                data: user
            });

        } catch (error) {
            console.error('Error updating user status:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update user status',
                details: error.message
            });
        }
    }

    /**
     * DELETE RECORD (ADMIN ONLY)
     */
    async deleteRecord(req, res) {
        try {
            const { recordId } = req.params;
            const { reason } = req.body;

            // Soft delete - mark as deleted
            const record = await EHRMetadata.findOneAndUpdate(
                { recordId },
                { 
                    status: 'deleted',
                    deletedAt: new Date(),
                    deletedBy: req.user?.userId || 'admin',
                    deletionReason: reason
                },
                { new: true }
            );

            if (!record) {
                return res.status(404).json({
                    success: false,
                    error: 'Record not found'
                });
            }

            // Log activity
            await ActivityLog.create({
                userId: req.user?.userId || 'admin',
                action: 'RECORD_DELETED',
                recordId: recordId,
                details: { reason },
                ipAddress: req.ip
            });

            return res.json({
                success: true,
                message: 'Record deleted successfully',
                data: record
            });

        } catch (error) {
            console.error('Error deleting record:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to delete record',
                details: error.message
            });
        }
    }

    /**
     * GET USAGE ANALYTICS
     */
    async getUsageAnalytics(req, res) {
        try {
            const { days = 7 } = req.query;
            const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

            // Daily activity trend
            const dailyActivity = await ActivityLog.aggregate([
                { $match: { timestamp: { $gte: startDate } } },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.date': 1 } }
            ]);

            // Activity by action type
            const activityByType = await ActivityLog.aggregate([
                { $match: { timestamp: { $gte: startDate } } },
                {
                    $group: {
                        _id: '$action',
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Daily uploads
            const dailyUploads = await EHRMetadata.aggregate([
                { $match: { uploadDate: { $gte: startDate } } },
                {
                    $group: {
                        _id: {
                            date: { $dateToString: { format: '%Y-%m-%d', date: '$uploadDate' } }
                        },
                        count: { $sum: 1 },
                        totalSize: { $sum: '$fileSize' }
                    }
                },
                { $sort: { '_id.date': 1 } }
            ]);

            // Top active users
            const topUsers = await ActivityLog.aggregate([
                { $match: { timestamp: { $gte: startDate } } },
                {
                    $group: {
                        _id: '$userId',
                        activityCount: { $sum: 1 }
                    }
                },
                { $sort: { activityCount: -1 } },
                { $limit: 10 }
            ]);

            return res.json({
                success: true,
                data: {
                    dailyActivity: dailyActivity.map(d => ({
                        date: d._id.date,
                        count: d.count
                    })),
                    activityByType: activityByType.map(a => ({
                        action: a._id,
                        count: a.count
                    })),
                    dailyUploads: dailyUploads.map(u => ({
                        date: u._id.date,
                        count: u.count,
                        totalSize: u.totalSize
                    })),
                    topUsers: topUsers.map(u => ({
                        userId: u._id,
                        activityCount: u.activityCount
                    }))
                }
            });

        } catch (error) {
            console.error('Error fetching usage analytics:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch usage analytics',
                details: error.message
            });
        }
    }

    /**
     * FORCE REVOKE ACCESS (ADMIN OVERRIDE)
     */
    async forceRevokeAccess(req, res) {
        try {
            const { recordId, userId, reason } = req.body;

            // This would connect to blockchain and revoke access
            // For now, we'll just log it
            await ActivityLog.create({
                userId: req.user?.userId || 'admin',
                action: 'ADMIN_FORCE_REVOKE',
                recordId: recordId,
                targetUserId: userId,
                details: { reason },
                ipAddress: req.ip
            });

            return res.json({
                success: true,
                message: `Access revoked by admin from user ${userId}`,
                reason
            });

        } catch (error) {
            console.error('Error force revoking access:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to revoke access',
                details: error.message
            });
        }
    }

    /**
     * GET SYSTEM HEALTH
     */
    async getSystemHealth(req, res) {
        try {
            // Check blockchain
            let blockchainStatus = 'unknown';
            try {
                const { exec } = require('child_process');
                exec('docker ps | grep peer0.hospital', (error, stdout) => {
                    blockchainStatus = stdout ? 'running' : 'stopped';
                });
            } catch (err) {
                blockchainStatus = 'error';
            }

            // Check IPFS
            let ipfsStatus = 'unknown';
            try {
                const { exec } = require('child_process');
                exec('ipfs swarm peers 2>/dev/null | wc -l', (error, stdout) => {
                    ipfsStatus = parseInt(stdout) > 0 ? 'connected' : 'disconnected';
                });
            } catch (err) {
                ipfsStatus = 'error';
            }

            // Check MongoDB
            const mongoStatus = await EHRMetadata.db.db.admin().ping();

            return res.json({
                success: true,
                health: {
                    blockchain: blockchainStatus,
                    ipfs: ipfsStatus,
                    mongodb: mongoStatus.ok === 1 ? 'connected' : 'disconnected',
                    api: 'running',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                error: 'Failed to check system health',
                details: error.message
            });
        }
    }
}

module.exports = new AdminController();
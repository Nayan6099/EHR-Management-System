const { logActivity } = require('../services/activityLogger');

/**
 * Express middleware to automatically log all write operations (POST, PUT, DELETE)
 */
function activityLoggerMiddleware(req, res, next) {
  // Capture response finish event to ensure we only log completed operations
  res.on('finish', () => {
    const isWriteOperation = ['POST', 'PUT', 'DELETE'].includes(req.method);
    
    if (isWriteOperation) {
      // Determine user ID from authenticated request if available, default to 'anonymous'
      const userId = req.user?.userId || req.body?.userId || req.query?.userId || 'anonymous';
      
      // Determine action based on HTTP method and path
      let action = 'SYSTEM_UPDATE';
      if (req.method === 'POST') action = 'RECORD_UPLOADED';
      if (req.method === 'PUT') action = 'USER_UPDATED';
      if (req.method === 'DELETE') action = 'RECORD_DELETED';

      // Parse metadata from request
      const recordId = req.body?.recordId || req.query?.recordId || req.params?.recordId || null;
      const targetUserId = req.body?.targetUserId || null;

      const logData = {
        userId,
        action,
        recordId,
        targetUserId,
        details: {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
        },
        ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        status: res.statusCode >= 200 && res.statusCode < 300 ? 'success' : 'failed',
        errorMessage: res.statusCode >= 400 ? res.statusMessage : null,
      };

      logActivity(logData);
    }
  });

  next();
}

module.exports = activityLoggerMiddleware;

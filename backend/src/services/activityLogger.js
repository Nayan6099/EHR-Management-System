const db = require('../config/db');

/**
 * Inserts an activity log record into the PostgreSQL database.
 *
 * @param {Object} logData
 * @param {string} logData.userId
 * @param {string} logData.action
 * @param {string} [logData.recordId]
 * @param {string} [logData.targetUserId]
 * @param {Object} [logData.details]
 * @param {string} [logData.ipAddress]
 * @param {string} [logData.userAgent]
 * @param {string} [logData.status] - 'success' | 'failed' | 'pending'
 * @param {string} [logData.errorMessage]
 */
async function logActivity(logData) {
  const {
    userId,
    action,
    recordId = null,
    targetUserId = null,
    details = {},
    ipAddress = null,
    userAgent = null,
    status = 'success',
    errorMessage = null,
  } = logData;

  try {
    const queryText = `
      INSERT INTO activity_logs (
        user_id,
        action,
        record_id,
        target_user_id,
        details,
        ip_address,
        user_agent,
        status,
        error_message,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id;
    `;
    const values = [
      userId,
      action,
      recordId,
      targetUserId,
      JSON.stringify(details),
      ipAddress,
      userAgent,
      status,
      errorMessage,
    ];

    const res = await db.query(queryText, values);
    return res.rows[0].id;
  } catch (error) {
    console.error('Error inserting activity log to DB:', error);
    // Do not crash the app if logging fails
    return null;
  }
}

module.exports = {
  logActivity,
};

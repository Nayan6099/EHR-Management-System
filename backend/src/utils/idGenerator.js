const crypto = require('crypto');

/**
 * Generates a unique ID matching the SegueEMR convention:
 * PREFIX-${Date.now()}-${crypto.randomBytes(3).toString('hex')}
 * 
 * @param {string} prefix - The entity prefix (e.g., 'USR', 'APT', 'REC')
 * @returns {string} The generated unique ID
 */
function generateId(prefix) {
  if (!prefix) {
    throw new Error('Prefix is required for ID generation');
  }
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(3).toString('hex');
  return `${prefix}-${timestamp}-${randomBytes}`;
}

module.exports = {
  generateId,
};

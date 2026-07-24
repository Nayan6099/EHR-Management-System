/**
 * Authentication Middleware
 * 
 * This is a simple auth middleware for demo purposes.
 * In production, you would use JWT tokens or OAuth.
 */

/**
 * Validate user credentials
 * For demo: just check if userId and orgName are provided
 */
const validateUser = (req, res, next) => {
    const { userId, orgName } = req.body.userId 
        ? req.body 
        : req.query;

    if (!userId || !orgName) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required',
            message: 'userId and orgName must be provided'
        });
    }

    // Validate orgName
    if (!['patient', 'hospital'].includes(orgName)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid organization',
            message: 'orgName must be either "patient" or "hospital"'
        });
    }

    // Attach user info to request
    req.user = {
        userId,
        orgName
    };

    next();
};

/**
 * Check if user is a patient
 */
const isPatient = (req, res, next) => {
    if (req.user.orgName !== 'patient') {
        return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'This action requires patient role'
        });
    }
    next();
};

/**
 * Check if user is a doctor
 */
const isDoctor = (req, res, next) => {
    if (req.user.orgName !== 'hospital') {
        return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'This action requires doctor/hospital role'
        });
    }
    next();
};

/**
 * Generic role guard.
 * Usage: requireRole('doctor', 'nurse')
 * Reads role from req.body.role / req.query.role since Mongo User.role
 * carries the fine-grained staff role (Fabric identity is org-level only).
 */
const requireRole = (...allowedRoles) => (req, res, next) => {
    const role = req.body.role || req.query.role || (req.user && req.user.role);
    if (!role || !allowedRoles.includes(role)) {
        return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
        });
    }
    if (req.user) req.user.role = role;
    next();
};

/**
 * Log all requests (optional)
 */
const logRequest = (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path} - User: ${req.user?.userId || 'Anonymous'}`);
    next();
};

/**
 * Error handler for authentication errors
 */
const handleAuthError = (err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            error: 'Authentication failed',
            message: err.message
        });
    }
    next(err);
};

module.exports = {
    validateUser,
    isPatient,
    isDoctor,
    requireRole,
    logRequest,
    handleAuthError
};
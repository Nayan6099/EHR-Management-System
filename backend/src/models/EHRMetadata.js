/**
 * MongoDB Schema for EHR Metadata
 * 
 * This model stores searchable metadata for quick queries
 * The actual medical files are stored in IPFS
 * The blockchain stores the hash and access control
 */

const mongoose = require('mongoose');

const EHRMetadataSchema = new mongoose.Schema({
    // Unique record identifier (same as blockchain)
    recordId: {
        type: String,
        required: true,
        unique: true,
        index: true  // Index for fast lookup
    },

    // Patient information
    patientId: {
        type: String,
        required: true,
        index: true  // Allow quick search by patient
    },
    patientName: {
        type: String,
        required: true
    },

    // IPFS reference
    ipfsHash: {
        type: String,
        required: true
    },

    // Record type
    recordType: {
        type: String,
        required: true,
        enum: ['X-Ray', 'MRI', 'Blood Test', 'CT Scan', 'Prescription', 'Report', 'Other'],
        index: true  // Allow filtering by type
    },

    // Description
    description: {
        type: String,
        default: ''
    },

    // File metadata
    fileSize: {
        type: Number,  // in bytes
        required: true
    },
    fileName: {
        type: String,
        default: ''
    },
    mimeType: {
        type: String,
        default: 'application/octet-stream'
    },

    // Upload information
    uploadDate: {
        type: Date,
        default: Date.now,
        index: true  // Allow sorting by date
    },
    uploadedBy: {
        type: String,
        required: true
    },

    // Encryption key for IPFS file
    encryptionKey: {
        type: String,
        default: null
    },

    // Blockchain reference
    blockchainTxId: {
        type: String,
        default: null
    },
    blockNumber: {
        type: Number,
        default: null
    },

    // Access control metadata (for quick queries)
    authorizedUsers: {
        type: [String],
        default: []
    },

    // Status
    status: {
        type: String,
        enum: ['active', 'archived', 'deleted'],
        default: 'active'
    },

    // Additional metadata
    tags: {
        type: [String],
        default: []
    },
    notes: {
        type: String,
        default: ''
    }

}, {
    // Automatically add createdAt and updatedAt timestamps
    timestamps: true
});

// Create indexes for common queries
EHRMetadataSchema.index({ patientId: 1, uploadDate: -1 });
EHRMetadataSchema.index({ patientId: 1, recordType: 1 });
EHRMetadataSchema.index({ uploadDate: -1 });

// Instance methods

/**
 * Get human-readable file size
 */
EHRMetadataSchema.methods.getReadableFileSize = function() {
    const bytes = this.fileSize;
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Check if a user is authorized to access this record
 */
EHRMetadataSchema.methods.isAuthorized = function(userId) {
    return this.authorizedUsers.includes(userId) || this.patientId === userId;
};

/**
 * Get record summary for display
 */
EHRMetadataSchema.methods.getSummary = function() {
    return {
        recordId: this.recordId,
        patientName: this.patientName,
        recordType: this.recordType,
        uploadDate: this.uploadDate,
        fileSize: this.getReadableFileSize(),
        description: this.description
    };
};

// Static methods

/**
 * Find all records for a patient
 */
EHRMetadataSchema.statics.findByPatient = function(patientId, options = {}) {
    const query = { patientId, status: 'active' };
    
    // Optional filters
    if (options.recordType) {
        query.recordType = options.recordType;
    }
    
    if (options.startDate || options.endDate) {
        query.uploadDate = {};
        if (options.startDate) {
            query.uploadDate.$gte = new Date(options.startDate);
        }
        if (options.endDate) {
            query.uploadDate.$lte = new Date(options.endDate);
        }
    }
    
    return this.find(query)
        .sort({ uploadDate: -1 })
        .limit(options.limit || 100);
};

/**
 * Search records with text
 */
EHRMetadataSchema.statics.searchRecords = function(searchText, options = {}) {
    const query = {
        status: 'active',
        $or: [
            { patientName: { $regex: searchText, $options: 'i' } },
            { description: { $regex: searchText, $options: 'i' } },
            { recordType: { $regex: searchText, $options: 'i' } },
            { tags: { $in: [new RegExp(searchText, 'i')] } }
        ]
    };
    
    if (options.patientId) {
        query.patientId = options.patientId;
    }
    
    return this.find(query)
        .sort({ uploadDate: -1 })
        .limit(options.limit || 50);
};

/**
 * Get statistics for a patient
 */
EHRMetadataSchema.statics.getPatientStats = function(patientId) {
    return this.aggregate([
        { $match: { patientId, status: 'active' } },
        {
            $group: {
                _id: '$recordType',
                count: { $sum: 1 },
                totalSize: { $sum: '$fileSize' }
            }
        }
    ]);
};

/**
 * Archive old records
 */
EHRMetadataSchema.statics.archiveOldRecords = function(days = 365) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.updateMany(
        { uploadDate: { $lt: cutoffDate }, status: 'active' },
        { $set: { status: 'archived' } }
    );
};

// Virtual properties

/**
 * Get age of record in days
 */
EHRMetadataSchema.virtual('age').get(function() {
    const now = new Date();
    const diffTime = Math.abs(now - this.uploadDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Pre-save middleware

/**
 * Update uploadDate if not set
 */
EHRMetadataSchema.pre('save', function(next) {
    if (!this.uploadDate) {
        this.uploadDate = new Date();
    }
    next();
});

/**
 * Add patient to authorized users if not present
 */
EHRMetadataSchema.pre('save', function(next) {
    if (!this.authorizedUsers.includes(this.patientId)) {
        this.authorizedUsers.push(this.patientId);
    }
    next();
});

// Ensure virtuals are included when converting to JSON
EHRMetadataSchema.set('toJSON', { virtuals: true });
EHRMetadataSchema.set('toObject', { virtuals: true });

// Create and export the model
//const EHRMetadata = mongoose.model('EHRMetadata', EHRMetadataSchema);
const EHRMetadata = mongoose.models.EHRMetadata || mongoose.model('EHRMetadata', EHRMetadataSchema);
module.exports = EHRMetadata;
/**
 * User Model - Stores user information
 */

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        default: null
    },
    role: {
        type: String,
        required: true,
        enum: ['patient', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist', 'admin_staff', 'management', 'admin'],
        index: true
    },
    orgName: {
        type: String,
        required: true,
        enum: ['patient', 'hospital', 'admin']
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active',
        index: true
    },
    lastLogin: {
        type: Date,
        default: null
    },
    registeredAt: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Indexes
UserSchema.index({ role: 1, status: 1 });

// Update last login
UserSchema.methods.updateLastLogin = async function() {
    this.lastLogin = new Date();
    return await this.save();
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
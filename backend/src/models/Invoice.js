/**
 * Invoice Model - Stores billing & invoicing records
 */

const mongoose = require('mongoose');

const LineItemSchema = new mongoose.Schema({
    description: { type: String, required: true },
    amount: { type: Number, required: true }
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
    invoiceId: {
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
    items: {
        type: [LineItemSchema],
        default: []
    },
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['unpaid', 'paid', 'partially-paid', 'void'],
        default: 'unpaid',
        index: true
    },
    createdBy: {
        type: String,
        required: true
    },
    paidAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const Invoice = mongoose.model('Invoice', InvoiceSchema);

module.exports = Invoice;

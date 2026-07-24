const mongoose = require('mongoose');

const EHRMetadataSchema = new mongoose.Schema({
    recordId: { type: String, required: true, unique: true, index: true },
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    ipfsHash: { type: String, required: true },
    recordType: {
        type: String,
        required: true,
        enum: ['X-Ray', 'MRI', 'Blood Test', 'CT Scan', 'Prescription', 'Report', 'Other']
    },
    description: { type: String, default: '' },
    fileSize: { type: Number, required: true },
    uploadDate: { type: Date, default: Date.now, index: true },
    uploadedBy: { type: String, required: true },
    blockchainTxId: { type: String, default: null },
    encryptionKey: { type: String, default: null },
    authorizedUsers: { type: [String], default: [] }
}, { timestamps: true });

const EHRMetadata = mongoose.model('EHRMetadata', EHRMetadataSchema);

class DatabaseService {
    constructor() {
        this.isConnected = false;
    }

    async connect() {
        try {
            if (this.isConnected) return;
            await mongoose.connect('mongodb://localhost:27017/ehr_database', {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            this.isConnected = true;
            console.log('✓ Connected to MongoDB successfully');
        } catch (error) {
            console.error('MongoDB connection error:', error);
            throw error;
        }
    }

    async saveMetadata(metadata) {
        try {
            await this.connect();
            const ehrMetadata = new EHRMetadata({
                recordId: metadata.recordId,
                patientId: metadata.patientId,
                patientName: metadata.patientName,
                ipfsHash: metadata.ipfsHash,
                recordType: metadata.recordType,
                description: metadata.description || '',
                fileSize: metadata.fileSize,
                uploadedBy: metadata.uploadedBy,
                blockchainTxId: metadata.blockchainTxId || null,
                encryptionKey: metadata.encryptionKey || null,
                authorizedUsers: metadata.authorizedUsers || [metadata.patientId]
            });
            await ehrMetadata.save();
            console.log(`✓ Metadata saved for record ${metadata.recordId}`);
            return ehrMetadata;
        } catch (error) {
            console.error('Error saving metadata:', error);
            throw error;
        }
    }

    async getRecordsByPatient(patientId, options = {}) {
        try {
            await this.connect();
            const query = { patientId };
            if (options.recordType) query.recordType = options.recordType;
            if (options.startDate || options.endDate) {
                query.uploadDate = {};
                if (options.startDate) query.uploadDate.$gte = new Date(options.startDate);
                if (options.endDate) query.uploadDate.$lte = new Date(options.endDate);
            }
            const records = await EHRMetadata.find(query)
                .sort({ uploadDate: -1 })
                .limit(options.limit || 100);
            console.log(`✓ Found ${records.length} records for patient ${patientId}`);
            return records;
        } catch (error) {
            console.error('Error fetching records:', error);
            throw error;
        }
    }

    async getRecordById(recordId) {
        try {
            await this.connect();
            const record = await EHRMetadata.findOne({ recordId });
            if (!record) throw new Error(`Record ${recordId} not found in database`);
            return record;
        } catch (error) {
            console.error('Error fetching record:', error);
            throw error;
        }
    }

    async getRecordsAccessibleByUser(userId) {
        try {
            await this.connect();
            const records = await EHRMetadata.find({
                authorizedUsers: userId
            }).sort({ uploadDate: -1 }).limit(100);
            console.log(`✓ Found ${records.length} records accessible by ${userId}`);
            return records;
        } catch (error) {
            console.error('Error fetching accessible records:', error);
            throw error;
        }
    }

    async updateMetadata(recordId, updates) {
        try {
            await this.connect();
            const result = await EHRMetadata.findOneAndUpdate(
                { recordId },
                updates,
                { new: true }
            );
            if (!result) throw new Error(`Record ${recordId} not found`);
            console.log(`✓ Metadata updated for record ${recordId}`);
            return result;
        } catch (error) {
            console.error('Error updating metadata:', error);
            throw error;
        }
    }

    async getStatistics(patientId) {
        try {
            await this.connect();
            const stats = await EHRMetadata.aggregate([
                { $match: { patientId } },
                {
                    $group: {
                        _id: '$recordType',
                        count: { $sum: 1 },
                        totalSize: { $sum: '$fileSize' }
                    }
                }
            ]);
            return stats;
        } catch (error) {
            console.error('Error getting statistics:', error);
            throw error;
        }
    }
}

module.exports = new DatabaseService();

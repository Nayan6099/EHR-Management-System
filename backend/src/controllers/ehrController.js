/**
 * EHR Controller - Handles HTTP requests from frontend
 * 
 * This controller orchestrates the complete flow:
 * Frontend → Controller → IPFS + Blockchain + MongoDB
 */

const fabricService = require('../services/fabricService');
const ipfsService = require('../services/ipfsService');
const dbService = require('../services/dbService');
const crypto = require('crypto');
const ActivityLog = require('../models/ActivityLog');

class EHRController {

    /**
     * UPLOAD NEW EHR RECORD
     * 
     * Complete flow:
     * 1. Upload file to IPFS
     * 2. Create record on blockchain
     * 3. Save metadata to MongoDB
     * 
     * Request body:
     * - file: The medical file (multipart/form-data)
     * - patientId, patientName, recordType, description
     */
    async uploadEHR(req, res) {
        try {
            console.log('\n=== NEW EHR UPLOAD REQUEST ===');

            // STEP 1: Validate request
            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            const { patientId, patientName, recordType, description } = req.body;
            
            if (!patientId || !patientName || !recordType) {
                return res.status(400).json({ 
                    error: 'Missing required fields: patientId, patientName, recordType' 
                });
            }

            // STEP 2: Generate unique record ID
            const recordId = `EHR_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
            console.log(`Generated Record ID: ${recordId}`);

            // STEP 3: Generate encryption key
            const encryptionKey = crypto.randomBytes(32).toString('hex');
            console.log('Generated encryption key');

            // STEP 4: Upload file to IPFS
            console.log('\n--- Uploading to IPFS ---');
            const ipfsResult = await ipfsService.uploadFile(
                req.file.buffer, 
                encryptionKey
            );
            console.log(`IPFS Hash: ${ipfsResult.ipfsHash}`);

            // STEP 5: Connect to blockchain as patient
            console.log('\n--- Connecting to Blockchain ---');
            await fabricService.connectToNetwork(patientId, 'patient');

            // STEP 6: Create record on blockchain
            console.log('\n--- Creating Blockchain Record ---');
            const blockchainRecord = await fabricService.createEHR(
                recordId,
                patientId,
                patientName,
                ipfsResult.ipfsHash,
                encryptionKey,
                recordType,
                description || ''
            );

            // STEP 7: Save metadata to MongoDB
            console.log('\n--- Saving Metadata to MongoDB ---');
            await dbService.saveMetadata({
                recordId: recordId,
                patientId: patientId,
                patientName: patientName,
                ipfsHash: ipfsResult.ipfsHash,
                recordType: recordType,
                description: description || '',
                fileSize: req.file.size,
                uploadedBy: patientId,
                encryptionKey: encryptionKey
            });

            // STEP 8: Disconnect from blockchain
            await fabricService.disconnect();

            console.log('\n=== EHR UPLOAD COMPLETE ===\n');

            // STEP 9: Send response
            return res.status(201).json({
                success: true,
                message: 'EHR record created successfully',
                data: {
                    recordId: recordId,
                    ipfsHash: ipfsResult.ipfsHash,
                    fileSize: ipfsResult.fileSize,
                    uploadDate: blockchainRecord.createdAt,
                    blockchainRecord: blockchainRecord
                }
            });

            // Step 10: Log activity
            await ActivityLog.logActivity({
                userId: formData.patientId,
                action: 'RECORD_UPLOADED',
                recordId: recordId,
                details: { recordType, fileSize: req.file.size },
                ipAddress: req.ip
            });

        } catch (error) {
            console.error('Error in uploadEHR:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to upload EHR',
                details: error.message
            });
        }
    }

    /**
     * VIEW/DOWNLOAD EHR RECORD
     * 
     * Flow:
     * 1. Read record from blockchain (checks authorization)
     * 2. Download file from IPFS
     * 3. Return file to user
     * 
     * Query params:
     * - recordId: ID of the record
     * - userId: User requesting access
     * - orgName: User's organization (patient/hospital)
     */
    async viewEHR(req, res) {
        try {
            console.log('\n=== VIEW EHR REQUEST ===');

            const { recordId, userId, orgName } = req.query;

            if (!recordId || !userId || !orgName) {
                return res.status(400).json({
                    error: 'Missing required params: recordId, userId, orgName'
                });
            }

            // STEP 1: Connect to blockchain
            console.log(`User ${userId} requesting record ${recordId}`);
            await fabricService.connectToNetwork(userId, orgName);

            // STEP 2: Read record from blockchain (access control happens here)
            console.log('Checking authorization on blockchain...');
            const blockchainRecord = await fabricService.readEHR(recordId);
            
            console.log('✓ User is authorized to view this record');

            // STEP 3: Download file from IPFS
            console.log('Downloading file from IPFS...');
            const fileBuffer = await ipfsService.downloadFile(
                blockchainRecord.ipfsHash,
                blockchainRecord.encryptionKey
            );

            // STEP 4: Get metadata from MongoDB
            const metadata = await dbService.getRecordById(recordId);

            // STEP 5: Disconnect
            await fabricService.disconnect();

            console.log('=== VIEW EHR COMPLETE ===\n');

            // STEP 6: Send file
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${recordId}_${metadata.recordType}"`);
            return res.send(fileBuffer);

        } catch (error) {
            console.error('Error in viewEHR:', error);
            
            // Check if it's an authorization error
            if (error.message.includes('not authorized')) {
                return res.status(403).json({
                    success: false,
                    error: 'Access Denied',
                    details: 'You are not authorized to view this record'
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Failed to retrieve EHR',
                details: error.message
            });
        }
    }

    /**
     * GET RECORD DETAILS (metadata only, no file download)
     * 
     * Returns record information from both blockchain and MongoDB
     */
    async getRecordDetails(req, res) {
        try {
            const { recordId, userId, orgName } = req.query;

            if (!recordId || !userId || !orgName) {
                return res.status(400).json({
                    error: 'Missing required params: recordId, userId, orgName'
                });
            }

            // Connect and read from blockchain
            await fabricService.connectToNetwork(userId, orgName);
            const blockchainRecord = await fabricService.readEHR(recordId);
            
            // Get metadata from MongoDB
            const metadata = await dbService.getRecordById(recordId);

            await fabricService.disconnect();

            return res.json({
                success: true,
                data: {
                    blockchain: blockchainRecord,
                    metadata: metadata
                }
            });

        } catch (error) {
            console.error('Error in getRecordDetails:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get record details',
                details: error.message
            });
        }
    }

    /**
     * GRANT ACCESS TO DOCTOR
     * 
     * Patient shares their record with a doctor
     */
    async grantAccess(req, res) {
        try {
            console.log('\n=== GRANT ACCESS REQUEST ===');

            const { recordId, patientId, doctorId } = req.body;

            if (!recordId || !patientId || !doctorId) {
                return res.status(400).json({
                    error: 'Missing required fields: recordId, patientId, doctorId'
                });
            }

            console.log(`Patient ${patientId} granting access to ${doctorId} for record ${recordId}`);

            // Connect as patient
            await fabricService.connectToNetwork(patientId, 'patient');

            // Grant access on blockchain
            const result = await fabricService.grantAccess(recordId, doctorId);
            await dbService.updateMetadata(recordId, { $addToSet: { authorizedUsers: doctorId } });
            await fabricService.disconnect();

            console.log('=== ACCESS GRANTED ===\n');

            return res.json({
                success: true,
                message: `Access granted to ${doctorId}`,
                data: result
            });

        } catch (error) {
            console.error('Error in grantAccess:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to grant access',
                details: error.message
            });
        }
    }

    /**
     * REVOKE ACCESS FROM DOCTOR
     */
    async revokeAccess(req, res) {
        try {
            console.log('\n=== REVOKE ACCESS REQUEST ===');

            const { recordId, patientId, doctorId } = req.body;

            if (!recordId || !patientId || !doctorId) {
                return res.status(400).json({
                    error: 'Missing required fields: recordId, patientId, doctorId'
                });
            }

            console.log(`Patient ${patientId} revoking access from ${doctorId} for record ${recordId}`);

            await fabricService.connectToNetwork(patientId, 'patient');
            const result = await fabricService.revokeAccess(recordId, doctorId);
            await fabricService.disconnect();

            console.log('=== ACCESS REVOKED ===\n');

            return res.json({
                success: true,
                message: `Access revoked from ${doctorId}`,
                data: result
            });

        } catch (error) {
            console.error('Error in revokeAccess:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to revoke access',
                details: error.message
            });
        }
    }

    /**
     * GET ACCESS HISTORY (AUDIT TRAIL)
     */
    async getAccessHistory(req, res) {
        try {
            const { recordId, userId, orgName } = req.query;

            if (!recordId || !userId || !orgName) {
                return res.status(400).json({
                    error: 'Missing required params: recordId, userId, orgName'
                });
            }

            await fabricService.connectToNetwork(userId, orgName);
            const history = await fabricService.getAccessHistory(recordId);
            await fabricService.disconnect();

            return res.json({
                success: true,
                data: history
            });

        } catch (error) {
            console.error('Error in getAccessHistory:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to get access history',
                details: error.message
            });
        }
    }

    /**
     * LIST ALL RECORDS FOR A PATIENT
     */
    async listPatientRecords(req, res) {
        try {
            const { patientId, userId, orgName } = req.query;

            if (!patientId || !userId || !orgName) {
                return res.status(400).json({
                    error: 'Missing required params: patientId, userId, orgName'
                });
            }

            // Get records from MongoDB (fast)
            let metadata;
            if (orgName === 'patient') {
                metadata = await dbService.getRecordsByPatient(patientId);
            } else {
                           metadata = await dbService.getRecordsAccessibleByUser(userId);
            }

            return res.json({
                success: true,
                count: metadata.length,
                data: metadata
            });

        } catch (error) {
            console.error('Error in listPatientRecords:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to list records',
                details: error.message
            });
        }
    }
}

module.exports = new EHRController();

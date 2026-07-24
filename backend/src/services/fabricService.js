/**
 * Fabric Service - Connects backend to Hyperledger Fabric blockchain
 * 
 * This service handles all interactions with the blockchain:
 * - Submitting transactions (create, grant access)
 * - Querying data (read records, get history)
 * - Managing user identities and certificates
 */

const { Gateway, Wallets } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const path = require('path');
const fs = require('fs');

class FabricService {
    constructor() {
        this.gateway = null;
        this.contract = null;
        this.wallet = null;
    }

    /**
     * CONNECT TO FABRIC NETWORK
     * 
     * @param {string} userId - User ID (e.g., "patient123" or "dr.smith")
     * @param {string} orgName - Organization ("hospital" or "patient")
     * 
     * PROCESS:
     * 1. Load user's identity from wallet (contains certificate)
     * 2. Connect to the Fabric network using connection profile
     * 3. Access the EHR channel and chaincode
     */
    async connectToNetwork(userId, orgName) {
        try {
            console.log(`=== Connecting to Fabric network as ${userId} ===`);

            // STEP 1: Create/load wallet (stores user identities)
            const walletPath = path.join(__dirname, '../../wallet');
            this.wallet = await Wallets.newFileSystemWallet(walletPath);

            // Check if user identity exists in wallet
            const identity = await this.wallet.get(userId);
            if (!identity) {
                throw new Error(`Identity ${userId} does not exist in wallet. Please register first.`);
            }
            console.log(`✓ Using identity: ${userId}`);

            // STEP 2: Load connection profile (network configuration)
            const ccpPath = this.getConnectionProfile(orgName);
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            // STEP 3: Connect to gateway
            this.gateway = new Gateway();
            await this.gateway.connect(ccp, {
                wallet: this.wallet,
                identity: userId,
                discovery: { enabled: true, asLocalhost: true }
            });
            console.log('✓ Connected to Fabric gateway');

            // STEP 4: Access the EHR channel
            const network = await this.gateway.getNetwork('ehrchannel');
            console.log('✓ Joined channel: ehrchannel');

            // STEP 5: Get the EHR chaincode contract
            this.contract = network.getContract('ehr-chaincode');
            console.log('✓ Got contract: ehr-chaincode');

            console.log('=== Connection Complete ===');
            return this.contract;

        } catch (error) {
            console.error('Failed to connect to network:', error);
            throw error;
        }
    }

    /**
     * CREATE EHR RECORD ON BLOCKCHAIN
     * 
     * Calls the chaincode's createEHR function
     */
    async createEHR(recordId, patientId, patientName, ipfsHash, encryptionKey, recordType, description) {
        try {
            console.log(`=== Creating EHR record ${recordId} on blockchain ===`);

            // Submit transaction to blockchain
            const result = await this.contract.submitTransaction(
                'createEHR',
                recordId,
                patientId,
                patientName,
                ipfsHash,
                encryptionKey,
                recordType,
                description
            );

            const record = JSON.parse(result.toString());
            console.log('✓ EHR record created on blockchain');

            return record;

        } catch (error) {
            console.error('Error creating EHR:', error);
            throw new Error('Failed to create EHR on blockchain: ' + error.message);
        }
    }

    /**
     * READ EHR RECORD FROM BLOCKCHAIN
     * 
     * Calls the chaincode's readEHR function
     * This will fail if the user is not authorized!
     */
    async readEHR(recordId) {
        try {
            console.log(`=== Reading EHR record ${recordId} from blockchain ===`);

            const result = await this.contract.evaluateTransaction('readEHR', recordId);
            const record = JSON.parse(result.toString());

            console.log('✓ EHR record retrieved successfully');
            return record;

        } catch (error) {
            console.error('Error reading EHR:', error);
            
            // Check if it's an authorization error
            if (error.message.includes('Access Denied')) {
                throw new Error('You are not authorized to view this record');
            }
            
            throw new Error('Failed to read EHR: ' + error.message);
        }
    }

    /**
     * GRANT ACCESS TO DOCTOR
     * 
     * Patient grants a doctor access to their record
     */
    async grantAccess(recordId, doctorId) {
        try {
            console.log(`=== Granting access to ${doctorId} for record ${recordId} ===`);

            const result = await this.contract.submitTransaction(
                'grantAccess',
                recordId,
                doctorId
            );

            const record = JSON.parse(result.toString());
            console.log('✓ Access granted successfully');

            return record;

        } catch (error) {
            console.error('Error granting access:', error);
            throw new Error('Failed to grant access: ' + error.message);
        }
    }

    /**
     * REVOKE ACCESS FROM DOCTOR
     */
    async revokeAccess(recordId, doctorId) {
        try {
            console.log(`=== Revoking access from ${doctorId} for record ${recordId} ===`);

            const result = await this.contract.submitTransaction(
                'revokeAccess',
                recordId,
                doctorId
            );

            const record = JSON.parse(result.toString());
            console.log('✓ Access revoked successfully');

            return record;

        } catch (error) {
            console.error('Error revoking access:', error);
            throw new Error('Failed to revoke access: ' + error.message);
        }
    }

    /**
     * GET ACCESS HISTORY (AUDIT TRAIL)
     * 
     * Shows all actions performed on a record
     */
    async getAccessHistory(recordId) {
        try {
            console.log(`=== Getting access history for record ${recordId} ===`);

            const result = await this.contract.evaluateTransaction(
                'getAccessHistory',
                recordId
            );

            const history = JSON.parse(result.toString());
            console.log('✓ Access history retrieved');

            return history;

        } catch (error) {
            console.error('Error getting access history:', error);
            throw new Error('Failed to get access history: ' + error.message);
        }
    }

    /**
     * QUERY ALL RECORDS BY PATIENT
     */
    async queryRecordsByPatient(patientId) {
        try {
            console.log(`=== Querying all records for patient ${patientId} ===`);

            const result = await this.contract.evaluateTransaction(
                'queryRecordsByPatient',
                patientId
            );

            const records = JSON.parse(result.toString());
            console.log(`✓ Found ${records.length} records`);

            return records;

        } catch (error) {
            console.error('Error querying records:', error);
            throw new Error('Failed to query records: ' + error.message);
        }
    }

    /**
     * DISCONNECT FROM NETWORK
     * 
     * Always call this when done to free resources
     */
    async disconnect() {
        if (this.gateway) {
            await this.gateway.disconnect();
            console.log('✓ Disconnected from Fabric network');
        }
    }

    /**
     * HELPER: Get connection profile path based on organization
     */
    getConnectionProfile(orgName) {
        const ccpPath = path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'fabric-network',
            'organizations',
            'peerOrganizations',
            `${orgName}.ehr.com`,
            `connection-${orgName}.json`
        );

        if (!fs.existsSync(ccpPath)) {
            throw new Error(`Connection profile not found at ${ccpPath}`);
        }

        return ccpPath;
    }

    /**
     * REGISTER NEW USER
     * 
     * Creates a new identity (certificate) for a user
     * This should be done once per user before they can use the system
     */
    async registerUser(userId, orgName, role = 'client') {
        try {
            console.log(`=== Registering user ${userId} in org ${orgName} ===`);

            // Create wallet if it doesn't exist
            const walletPath = path.join(__dirname, '../../wallet');
            this.wallet = await Wallets.newFileSystemWallet(walletPath);

            // Check if user already exists
            const userIdentity = await this.wallet.get(userId);
            if (userIdentity) {
                console.log(`User ${userId} already registered`);
                return;
            }

            // Load connection profile
            const ccpPath = this.getConnectionProfile(orgName);
            const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

            // Create CA client
            const caInfo = ccp.certificateAuthorities[`ca.${orgName}.ehr.com`];
            const ca = new FabricCAServices(caInfo.url);

            // Get admin user to register new user
            const adminIdentity = await this.wallet.get('admin');
            if (!adminIdentity) {
                throw new Error('Admin user not found. Please enroll admin first.');
            }

            const provider = this.wallet.getProviderRegistry().getProvider(adminIdentity.type);
            const adminUser = await provider.getUserContext(adminIdentity, 'admin');

            // Register the new user
            const secret = await ca.register(
                {
                    affiliation: `${orgName}.department1`,
                    enrollmentID: userId,
                    role: role
                },
                adminUser
            );

            // Enroll the user
            const enrollment = await ca.enroll({
                enrollmentID: userId,
                enrollmentSecret: secret
            });

            // Create identity
            const x509Identity = {
                credentials: {
                    certificate: enrollment.certificate,
                    privateKey: enrollment.key.toBytes()
                },
                mspId: `${orgName.charAt(0).toUpperCase() + orgName.slice(1)}MSP`,
                type: 'X.509'
            };

            await this.wallet.put(userId, x509Identity);
            console.log(`✓ User ${userId} registered and enrolled successfully`);

        } catch (error) {
            console.error('Error registering user:', error);
            throw error;
        }
    }
}

module.exports = new FabricService();
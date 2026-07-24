'use strict';

const { Contract } = require('fabric-contract-api');

class EHRContract extends Contract {

    // 🔥 HELPER FUNCTION (IMPORTANT FIX)
    getUserIdFromClientID(clientID) {
        // Extract the CN value from the X509 certificate DN
        const match = clientID.match(/CN=([^,:]+)/);
        let extractedCN = match ? match[1] : clientID;

        // Map certificate common names to application aliases
        // so that the blockchain state matches the frontend logic
        const mapping = {
            'User1@hospital.ehr.com': 'dr.smith',
            'Admin@hospital.ehr.com': 'hospitalAdmin',
            'User1@patient.ehr.com': 'patient123',
            // Defaulting fallback for backward compatibility
            'patient1': 'patient1',
            'admin': 'admin'
        };

        // If it starts with 'User1@patient', let's map it to patient123 to be safe 
        // as the frontend purely uses patient123.
        if (extractedCN.includes('User1@patient')) return 'patient123';
        if (extractedCN.includes('User1@hospital')) return 'dr.smith';
        
        return mapping[extractedCN] || extractedCN;
    }

    async initLedger(ctx) {
        console.log('============= START : Initialize Ledger ===========');
        console.log('EHR Chaincode initialized successfully');
        console.log('============= END : Initialize Ledger ===========');
    }

    async createEHR(ctx, recordId, patientId, patientName, ipfsHash, encryptionKey, recordType, description) {
        console.log('============= START : Create EHR ===========');

        const clientIdentity = ctx.clientIdentity;
        const callerMSPID = clientIdentity.getMSPID();
        const fullClientID = clientIdentity.getID();
        const callerID = this.getUserIdFromClientID(fullClientID);

        if (callerMSPID !== 'PatientMSP') {
            throw new Error(`Access Denied: Only patients can create EHR records. Your org: ${callerMSPID}`);
        }

        const recordAsBytes = await ctx.stub.getState(recordId);
        if (recordAsBytes && recordAsBytes.length > 0) {
            throw new Error(`EHR record ${recordId} already exists`);
        }

        const ehrRecord = {
            recordId,
            patientId:callerID,
            patientName,
            ipfsHash,
            encryptionKey,
            recordType,
            description,
            createdAt: new Date(parseInt(ctx.stub.getTxTimestamp().seconds) * 1000).toISOString(),
            createdBy: callerID,
            authorizedUsers: [callerID],
            accessHistory: [
                {
                    action: 'CREATED',
                    userId: callerID,
                    timestamp: new Date(parseInt(ctx.stub.getTxTimestamp().seconds) * 1000).toISOString()
                }
            ]
        };

        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(ehrRecord)));

        console.log(`✓ EHR Record ${recordId} created successfully`);
        console.log('============= END : Create EHR ===========');

        return JSON.stringify(ehrRecord);
    }

    async readEHR(ctx, recordId) {
        console.log('============= START : Read EHR ===========');

        const fullClientID = ctx.clientIdentity.getID();
        const callerID = this.getUserIdFromClientID(fullClientID);

        const recordAsBytes = await ctx.stub.getState(recordId);
        if (!recordAsBytes || recordAsBytes.length === 0) {
            throw new Error(`EHR record ${recordId} does not exist`);
        }

        const ehrRecord = JSON.parse(recordAsBytes.toString());

        const isAuthorized =
            ehrRecord.authorizedUsers.includes(callerID) ||
            ehrRecord.patientId === callerID;

        if (!isAuthorized) {
            throw new Error(`Access Denied: You are not authorized to view record ${recordId}`);
        }

        ehrRecord.accessHistory.push({
            action: 'READ',
            userId: callerID,
            timestamp: new Date(parseInt(ctx.stub.getTxTimestamp().seconds) * 1000).toISOString()
        });

        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(ehrRecord)));

        console.log(`✓ Record accessed by ${callerID}`);
        console.log('============= END : Read EHR ===========');

        return JSON.stringify(ehrRecord);
    }

    async grantAccess(ctx, recordId, doctorId) {
        console.log('============= START : Grant Access ===========');

        const fullClientID = ctx.clientIdentity.getID();
        const callerID = this.getUserIdFromClientID(fullClientID);

        const recordAsBytes = await ctx.stub.getState(recordId);
        if (!recordAsBytes || recordAsBytes.length === 0) {
            throw new Error(`EHR record ${recordId} does not exist`);
        }

        const ehrRecord = JSON.parse(recordAsBytes.toString());

        if (ehrRecord.patientId !== callerID) {
            throw new Error(`Access Denied: Only the patient can grant access`);
        }

        if (ehrRecord.authorizedUsers.includes(doctorId)) {
            throw new Error(`Doctor ${doctorId} already has access`);
        }

        ehrRecord.authorizedUsers.push(doctorId);

        ehrRecord.accessHistory.push({
            action: 'ACCESS_GRANTED',
            grantedTo: doctorId,
            grantedBy: callerID,
            timestamp: new Date(parseInt(ctx.stub.getTxTimestamp().seconds) * 1000).toISOString()
        });

        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(ehrRecord)));

        console.log(`✓ Access granted to ${doctorId}`);
        console.log('============= END : Grant Access ===========');

        return JSON.stringify(ehrRecord);
    }

    async revokeAccess(ctx, recordId, doctorId) {
        console.log('============= START : Revoke Access ===========');

        const fullClientID = ctx.clientIdentity.getID();
        const callerID = this.getUserIdFromClientID(fullClientID);

        const recordAsBytes = await ctx.stub.getState(recordId);
        if (!recordAsBytes || recordAsBytes.length === 0) {
            throw new Error(`EHR record ${recordId} does not exist`);
        }

        const ehrRecord = JSON.parse(recordAsBytes.toString());

        if (ehrRecord.patientId !== callerID) {
            throw new Error(`Access Denied: Only the patient can revoke access`);
        }

        if (doctorId === ehrRecord.patientId) {
            throw new Error(`Cannot revoke patient access`);
        }

        const index = ehrRecord.authorizedUsers.indexOf(doctorId);
        if (index === -1) {
            throw new Error(`Doctor does not have access`);
        }

        ehrRecord.authorizedUsers.splice(index, 1);

        ehrRecord.accessHistory.push({
            action: 'ACCESS_REVOKED',
            revokedFrom: doctorId,
            revokedBy: callerID,
            timestamp: new Date(parseInt(ctx.stub.getTxTimestamp().seconds) * 1000).toISOString()
        });

        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(ehrRecord)));

        console.log(`✓ Access revoked from ${doctorId}`);
        console.log('============= END : Revoke Access ===========');

        return JSON.stringify(ehrRecord);
    }

    async getAccessHistory(ctx, recordId) {
        console.log('============= START : Get Access History ===========');

        const fullClientID = ctx.clientIdentity.getID();
        const callerID = this.getUserIdFromClientID(fullClientID);

        const recordAsBytes = await ctx.stub.getState(recordId);
        if (!recordAsBytes || recordAsBytes.length === 0) {
            throw new Error(`EHR record ${recordId} does not exist`);
        }

        const ehrRecord = JSON.parse(recordAsBytes.toString());

        const isAuthorized =
            ehrRecord.authorizedUsers.includes(callerID) ||
            ehrRecord.patientId === callerID;

        if (!isAuthorized) {
            throw new Error(`Access Denied`);
        }

        return JSON.stringify({
            recordId,
            patientName: ehrRecord.patientName,
            accessHistory: ehrRecord.accessHistory
        });
    }

    async queryRecordsByPatient(ctx, patientId) {
        console.log('============= START : Query Records ===========');

        const fullClientID = ctx.clientIdentity.getID();
        const callerID = this.getUserIdFromClientID(fullClientID);

        if (callerID !== patientId) {
            throw new Error(`Access Denied`);
        }

        const query = {
            selector: {
                patientId: patientId
            }
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const results = [];

        let result = await iterator.next();
        while (!result.done) {
            results.push(JSON.parse(result.value.value.toString()));
            result = await iterator.next();
        }

        await iterator.close();

        return JSON.stringify(results);
    }
}

module.exports = EHRContract;

const fs = require('fs');
const path = require('path');
const { Wallets } = require('fabric-network');

async function main() {
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    console.log(`Wallet path: ${walletPath}`);

    const orgs = [
        {
            name: 'patient',
            mspId: 'PatientMSP',
            users: [
                { id: 'patient123', type: 'User1' },
                { id: 'patient1', type: 'User1' },
                { id: 'patientAdmin', type: 'Admin' },
                { id: 'admin', type: 'Admin' }
            ]
        },
        {
            name: 'hospital',
            mspId: 'HospitalMSP',
            users: [
                { id: 'dr.smith', type: 'User1' },
                { id: 'hospitalAdmin', type: 'Admin' }
            ]
        }
    ];

    const basePath = path.join(__dirname, '..', 'fabric-network', 'organizations', 'peerOrganizations');

    for (const org of orgs) {
        for (const user of org.users) {
            try {
                const credPath = path.join(basePath, `${org.name}.ehr.com`, 'users', `${user.type}@${org.name}.ehr.com`, 'msp');
                const certPath = path.join(credPath, 'signcerts', `${user.type}@${org.name}.ehr.com-cert.pem`);
                
                const cert = fs.readFileSync(certPath, 'utf8');

                const keyDir = path.join(credPath, 'keystore');
                const files = fs.readdirSync(keyDir);
                const keyPath = path.join(keyDir, files[0]);
                const key = fs.readFileSync(keyPath, 'utf8');

                const identity = {
                    credentials: {
                        certificate: cert,
                        privateKey: key,
                    },
                    mspId: org.mspId,
                    type: 'X.509',
                    version: 1
                };

                await wallet.put(user.id, identity);
                console.log(`✓ Successfully populated wallet with identity: ${user.id}`);
            } catch (error) {
                console.error(`Failed to populate identity ${user.id}: ${error.message}`);
            }
        }
    }
}

main().then(() => {
    console.log('Wallet population complete!');
}).catch(e => {
    console.error(e);
});

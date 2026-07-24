/**
 * IPFS Service - Handles file upload/download to IPFS
 * 
 * IPFS (InterPlanetary File System) is used to store large medical files
 * because storing them directly on blockchain would be inefficient.
 * 
 * HOW IT WORKS:
 * 1. Upload file to IPFS → Get unique hash (like a fingerprint)
 * 2. Store only the hash on blockchain
 * 3. Use the hash to retrieve file anytime from IPFS
 */

const { create } = require('ipfs-http-client');
const crypto = require('crypto');

class IPFSService {
    constructor() {
        // Connect to local IPFS node
        // In production, you might use Infura or Pinata
        this.ipfs = create({
            host: 'localhost',
            port: '5001',
            protocol: 'http'
        });
    }

    /**
     * UPLOAD FILE TO IPFS
     * 
     * @param {Buffer} fileBuffer - The file content as a buffer
     * @param {string} encryptionKey - Optional: Key to encrypt the file
     * @returns {Object} { ipfsHash, encryptionKey }
     * 
     * PROCESS:
     * 1. Optionally encrypt the file for privacy
     * 2. Upload to IPFS
     * 3. Get back a unique hash (CID - Content Identifier)
     * 4. This hash can be used to retrieve the file later
     */
    async uploadFile(fileBuffer, encryptionKey = null) {
        try {
            console.log('=== Uploading file to IPFS ===');
            console.log(`File size: ${fileBuffer.length} bytes`);

            let processedBuffer = fileBuffer;

            // STEP 1: Encrypt file if encryption key is provided
            if (encryptionKey) {
                processedBuffer = this.encryptFile(fileBuffer, encryptionKey);
                console.log('✓ File encrypted before upload');
            }

            // STEP 2: Upload to IPFS
            const result = await this.ipfs.add(processedBuffer, {
                progress: (bytes) => console.log(`Uploaded ${bytes} bytes`)
            });

            const ipfsHash = result.path; // This is the unique hash (CID)
            
            console.log(`✓ File uploaded to IPFS successfully`);
            console.log(`IPFS Hash: ${ipfsHash}`);
            console.log('=== Upload Complete ===');

            return {
                ipfsHash: ipfsHash,
                encryptionKey: encryptionKey || null,
                fileSize: fileBuffer.length
            };

        } catch (error) {
            console.error('Error uploading to IPFS:', error);
            throw new Error('Failed to upload file to IPFS: ' + error.message);
        }
    }

    /**
     * DOWNLOAD FILE FROM IPFS
     * 
     * @param {string} ipfsHash - The hash obtained during upload
     * @param {string} encryptionKey - Key to decrypt if file was encrypted
     * @returns {Buffer} The file content
     * 
     * PROCESS:
     * 1. Use the hash to retrieve file from IPFS
     * 2. Decrypt if it was encrypted
     * 3. Return the original file
     */
    async downloadFile(ipfsHash, encryptionKey = null) {
        try {
            console.log('=== Downloading file from IPFS ===');
            console.log(`IPFS Hash: ${ipfsHash}`);

            // STEP 1: Retrieve file from IPFS using the hash
            const chunks = [];
            
            for await (const chunk of this.ipfs.cat(ipfsHash)) {
                chunks.push(chunk);
            }

            let fileBuffer = Buffer.concat(chunks);
            console.log(`✓ File downloaded: ${fileBuffer.length} bytes`);

            // STEP 2: Decrypt if encryption key is provided
            if (encryptionKey) {
                fileBuffer = this.decryptFile(fileBuffer, encryptionKey);
                console.log('✓ File decrypted successfully');
            }

            console.log('=== Download Complete ===');
            return fileBuffer;

        } catch (error) {
            console.error('Error downloading from IPFS:', error);
            throw new Error('Failed to download file from IPFS: ' + error.message);
        }
    }

    /**
     * ENCRYPT FILE (AES-256 encryption)
     * 
     * Why encrypt?
     * - IPFS is public, anyone with the hash can access the file
     * - Encryption ensures only authorized users with the key can read it
     */
    encryptFile(buffer, encryptionKey) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(encryptionKey, 'salt', 32); // Derive key
        const iv = crypto.randomBytes(16); // Initialization vector

        const cipher = crypto.createCipheriv(algorithm, key, iv);
        const encrypted = Buffer.concat([
            iv, // Prepend IV (needed for decryption)
            cipher.update(buffer),
            cipher.final()
        ]);

        return encrypted;
    }

    /**
     * DECRYPT FILE
     */
    decryptFile(encryptedBuffer, encryptionKey) {
        const algorithm = 'aes-256-cbc';
        const key = crypto.scryptSync(encryptionKey, 'salt', 32);
        
        const iv = encryptedBuffer.slice(0, 16); // Extract IV from beginning
        const encryptedData = encryptedBuffer.slice(16);

        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        const decrypted = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final()
        ]);

        return decrypted;
    }

    /**
     * PIN FILE (Keep it available on IPFS permanently)
     * 
     * By default, IPFS might garbage collect unpinned files.
     * Pinning ensures the file stays available.
     */
    async pinFile(ipfsHash) {
        try {
            await this.ipfs.pin.add(ipfsHash);
            console.log(`✓ File ${ipfsHash} pinned successfully`);
        } catch (error) {
            console.error('Error pinning file:', error);
            throw error;
        }
    }

    /**
     * GET FILE INFO (without downloading)
     */
    async getFileInfo(ipfsHash) {
        try {
            const stats = await this.ipfs.files.stat(`/ipfs/${ipfsHash}`);
            return {
                hash: ipfsHash,
                size: stats.size,
                type: stats.type
            };
        } catch (error) {
            console.error('Error getting file info:', error);
            throw error;
        }
    }
}

module.exports = new IPFSService();
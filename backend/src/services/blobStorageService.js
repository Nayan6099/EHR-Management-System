const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config();

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'medical-records';

let containerClient = null;

if (connectionString) {
  try {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
  } catch (error) {
    console.error('Failed to initialize Azure Blob Storage client:', error.message);
  }
}

/**
 * Uploads a file buffer to Azure Blob Storage
 * 
 * @param {string} blobName - Unique name for the blob
 * @param {Buffer} buffer - File contents
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} - The URL of the uploaded blob
 */
async function uploadBlob(blobName, buffer, mimeType) {
  if (!containerClient) {
    throw new Error('Azure Blob Storage client is not initialized');
  }

  // Ensure container exists
  await containerClient.createIfNotExists({ access: 'blob' });

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: {
      blobContentType: mimeType,
    },
  });

  return blockBlobClient.url;
}

/**
 * Downloads a file from Azure Blob Storage as a Buffer
 * 
 * @param {string} blobName - Name of the blob to download
 * @returns {Promise<Buffer>} - The downloaded file content
 */
async function downloadBlob(blobName) {
  if (!containerClient) {
    throw new Error('Azure Blob Storage client is not initialized');
  }

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const downloadResponse = await blockBlobClient.download(0);
  
  return new Promise((resolve, reject) => {
    const chunks = [];
    const readableStream = downloadResponse.readableStreamBody;
    
    readableStream.on('data', (data) => {
      chunks.push(data instanceof Buffer ? data : Buffer.from(data));
    });
    
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    
    readableStream.on('error', reject);
  });
}

/**
 * Deletes a file from Azure Blob Storage
 * 
 * @param {string} blobName - Name of the blob to delete
 * @returns {Promise<boolean>}
 */
async function deleteBlob(blobName) {
  if (!containerClient) {
    throw new Error('Azure Blob Storage client is not initialized');
  }

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const response = await blockBlobClient.deleteIfExists();
  return response.succeeded;
}

module.exports = {
  uploadBlob,
  downloadBlob,
  deleteBlob,
};

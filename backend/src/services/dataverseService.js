const axios = require('axios');
require('dotenv').config();

const {
  DATAVERSE_ENVIRONMENT_URL,
  DATAVERSE_CLIENT_ID,
  DATAVERSE_CLIENT_SECRET,
  DATAVERSE_TENANT_ID,
} = process.env;

let accessToken = null;
let tokenExpiresAt = 0;

/**
 * Gets OAuth2 access token for Azure Dataverse using Client Credentials Flow
 */
async function getAccessToken() {
  const now = Date.now();
  // Return cached token if still valid (with 5 min buffer)
  if (accessToken && tokenExpiresAt > now + 300000) {
    return accessToken;
  }

  if (!DATAVERSE_ENVIRONMENT_URL || !DATAVERSE_CLIENT_ID || !DATAVERSE_CLIENT_SECRET || !DATAVERSE_TENANT_ID) {
    console.warn('Azure Dataverse credentials not fully configured in env.');
    return null;
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${DATAVERSE_TENANT_ID}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', DATAVERSE_CLIENT_ID);
    params.append('client_secret', DATAVERSE_CLIENT_SECRET);
    params.append('scope', `${DATAVERSE_ENVIRONMENT_URL}/.default`);

    const response = await axios.post(tokenUrl, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    accessToken = response.data.access_token;
    tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
    return accessToken;
  } catch (error) {
    console.error('Error fetching Dataverse access token:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Azure Dataverse');
  }
}

/**
 * Sends a POST/PATCH request to Azure Dataverse OData Web API to sync an entity
 * 
 * @param {string} entitySetName - Name of the entity set (e.g., 'contacts', 'accounts')
 * @param {Object} data - Entity payload
 * @param {string} [id] - Optional ID for updating an existing entity
 */
async function syncEntity(entitySetName, data, id = null) {
  const token = await getAccessToken();
  if (!token) {
    console.warn(`Dataverse sync bypassed for ${entitySetName} (no credentials)`);
    return null;
  }

  const url = id 
    ? `${DATAVERSE_ENVIRONMENT_URL}/api/data/v9.2/${entitySetName}(${id})`
    : `${DATAVERSE_ENVIRONMENT_URL}/api/data/v9.2/${entitySetName}`;

  const method = id ? 'PATCH' : 'POST';

  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'OData-MaxVersion': '4.0',
        'OData-Version': '4.0',
        ...(id ? { 'If-Match': '*' } : {}), // Prevent create-on-patch behavior if record missing
      },
    });

    return response.data;
  } catch (error) {
    console.error(`Error syncing ${entitySetName} to Dataverse:`, error.response?.data || error.message);
    throw new Error(`Dataverse sync failed: ${error.message}`);
  }
}

module.exports = {
  getAccessToken,
  syncEntity,
};

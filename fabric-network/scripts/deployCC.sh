#!/bin/bash

# Chaincode Deployment Script for EHR Blockchain Project (CCaaS mode)
# This script installs, approves, and commits the EHR chaincode using
# the Chaincode-as-a-Service pattern (no Docker build needed by peers)

set -e

CHANNEL_NAME="ehrchannel"
CC_NAME="ehr-chaincode"
CC_VERSION="1.0"
CC_SEQUENCE=1
CCAAS_PACKAGE="../chaincode/ehr-ccaas/ehr-ccaas.tar.gz"

echo "================================================================"
echo "  Deploying Chaincode (CCaaS): ${CC_NAME}"
echo "================================================================"

# Step 1: Copy the CCaaS package into the CLI container
echo ""
echo "Step 1: Copying CCaaS package to CLI container..."
docker cp ${CCAAS_PACKAGE} cli:/tmp/ehr-ccaas.tar.gz
echo "✓ Package copied"

# Step 2: Install on Hospital peer
echo ""
echo "Step 2: Installing chaincode on Hospital peer..."

docker exec cli peer lifecycle chaincode install /tmp/ehr-ccaas.tar.gz

echo "✓ Chaincode installed on Hospital peer"

# Step 3: Install on Patient peer
echo ""
echo "Step 3: Installing chaincode on Patient peer..."

docker exec \
  -e CORE_PEER_LOCALMSPID=PatientMSP \
  -e CORE_PEER_ADDRESS=peer0.patient.ehr.com:8051 \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/patient.ehr.com/users/Admin@patient.ehr.com/msp \
  cli peer lifecycle chaincode install /tmp/ehr-ccaas.tar.gz

echo "✓ Chaincode installed on Patient peer"

# Step 4: Query installed chaincode to get package ID
echo ""
echo "Step 4: Querying installed chaincode to get package ID..."

PACKAGE_ID=$(docker exec cli peer lifecycle chaincode queryinstalled | grep "ehr_1.0" | awk '{print $3}' | sed 's/,$//')

if [ -z "$PACKAGE_ID" ]; then
    echo "✗ Error: Could not retrieve package ID"
    exit 1
fi

echo "✓ Package ID: ${PACKAGE_ID}"

# Step 5: Approve chaincode for Hospital organization
echo ""
echo "Step 5: Approving chaincode for Hospital organization..."

docker exec cli peer lifecycle chaincode approveformyorg \
  -o orderer.ehr.com:7050 \
  --channelID ${CHANNEL_NAME} \
  --name ${CC_NAME} \
  --version ${CC_VERSION} \
  --package-id ${PACKAGE_ID} \
  --sequence ${CC_SEQUENCE}

echo "✓ Chaincode approved for Hospital organization"

# Step 6: Approve chaincode for Patient organization
echo ""
echo "Step 6: Approving chaincode for Patient organization..."

docker exec \
  -e CORE_PEER_LOCALMSPID=PatientMSP \
  -e CORE_PEER_ADDRESS=peer0.patient.ehr.com:8051 \
  -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/patient.ehr.com/users/Admin@patient.ehr.com/msp \
  cli peer lifecycle chaincode approveformyorg \
  -o orderer.ehr.com:7050 \
  --channelID ${CHANNEL_NAME} \
  --name ${CC_NAME} \
  --version ${CC_VERSION} \
  --package-id ${PACKAGE_ID} \
  --sequence ${CC_SEQUENCE}

echo "✓ Chaincode approved for Patient organization"

# Step 7: Check commit readiness
echo ""
echo "Step 7: Checking commit readiness..."

docker exec cli peer lifecycle chaincode checkcommitreadiness \
  --channelID ${CHANNEL_NAME} \
  --name ${CC_NAME} \
  --version ${CC_VERSION} \
  --sequence ${CC_SEQUENCE} \
  --output json

# Step 8: Commit the chaincode
echo ""
echo "Step 8: Committing chaincode to channel..."

docker exec cli peer lifecycle chaincode commit \
  -o orderer.ehr.com:7050 \
  --channelID ${CHANNEL_NAME} \
  --name ${CC_NAME} \
  --version ${CC_VERSION} \
  --sequence ${CC_SEQUENCE} \
  --peerAddresses peer0.hospital.ehr.com:7051 \
  --peerAddresses peer0.patient.ehr.com:8051

echo "✓ Chaincode committed successfully"

# Step 9: Verify the deployment
echo ""
echo "Step 9: Verifying chaincode deployment..."

docker exec cli peer lifecycle chaincode querycommitted \
  --channelID ${CHANNEL_NAME} \
  --name ${CC_NAME}

echo ""
echo "================================================================"
echo "  ✓ Chaincode Deployment Complete!"
echo "================================================================"
echo ""
echo "Chaincode Details:"
echo "  Name: ${CC_NAME}"
echo "  Version: ${CC_VERSION}"
echo "  Channel: ${CHANNEL_NAME}"
echo "  Package ID: ${PACKAGE_ID}"
echo ""
echo "You can now invoke chaincode functions from your backend API."
echo "================================================================"
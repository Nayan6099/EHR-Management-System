#!/bin/bash

# Script to start/stop Hyperledger Fabric network for EHR project

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FABRIC_NETWORK_DIR="$(dirname "$SCRIPT_DIR")"

function printHelp() {
  echo "Usage: "
  echo "  network.sh <Mode>"
  echo "    Modes:"
  echo "      up - Bring up the network"
  echo "      down - Clear the network"
  echo "      restart - Restart the network"
  echo
  echo "  Example: ./network.sh up"
}

# Set environment variables
export IMAGE_TAG=2.5
export COMPOSE_PROJECT_NAME=ehr
export FABRIC_CFG_PATH="${FABRIC_NETWORK_DIR}/config"

function generateCrypto() {
  echo "=== Generating certificates for organizations ==="

  mkdir -p "${SCRIPT_DIR}/organizations/ordererOrganizations"
  mkdir -p "${SCRIPT_DIR}/organizations/peerOrganizations"

  cryptogen generate \
    --config="${FABRIC_NETWORK_DIR}/config/crypto-config.yaml" \
    --output="${SCRIPT_DIR}/organizations"

  if [ $? -ne 0 ]; then
    echo "ERROR: cryptogen failed. Aborting."
    exit 1
  fi

  echo "✓ Certificates generated successfully"
}

function generateChannelArtifacts() {
  echo "=== Generating channel artifacts ==="

  mkdir -p "${SCRIPT_DIR}/channel-artifacts"

  configtxgen -profile TwoOrgsOrdererGenesis \
    -channelID system-channel \
    -outputBlock "${SCRIPT_DIR}/channel-artifacts/genesis.block"

  configtxgen -profile TwoOrgsChannel \
    -outputCreateChannelTx "${SCRIPT_DIR}/channel-artifacts/ehrchannel.tx" \
    -channelID ehrchannel

  configtxgen -profile TwoOrgsChannel \
    -outputAnchorPeersUpdate "${SCRIPT_DIR}/channel-artifacts/HospitalMSPanchors.tx" \
    -channelID ehrchannel \
    -asOrg HospitalMSP

  configtxgen -profile TwoOrgsChannel \
    -outputAnchorPeersUpdate "${SCRIPT_DIR}/channel-artifacts/PatientMSPanchors.tx" \
    -channelID ehrchannel \
    -asOrg PatientMSP

  echo "✓ Channel artifacts generated successfully"
}

function networkUp() {
  echo "=== Starting EHR Blockchain Network ==="

  echo "Using existing crypto material (skipping generation)"

  if [ ! -d "${SCRIPT_DIR}/channel-artifacts" ]; then
    generateChannelArtifacts
  fi

  cd "${FABRIC_NETWORK_DIR}/docker"
  docker compose up -d
  cd "${SCRIPT_DIR}"

  echo "✓ Network started successfully"
  echo ""
  echo "Containers running:"
  docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

  echo ""
  echo "Waiting for containers to be ready..."
  sleep 10

  createChannel
}

function createChannel() {
  echo "Waiting for orderer endpoint..."

  until docker exec cli bash -c "nc -z orderer.ehr.com 7050"; do
    echo "Orderer not ready yet..."
    sleep 2
  done

  echo "Orderer is ready!"
  echo "=== Creating channel: ehrchannel ==="

  docker exec cli peer channel create \
    -o orderer.ehr.com:7050 \
    -c ehrchannel \
    -f ./channel-artifacts/ehrchannel.tx \
    --outputBlock ./channel-artifacts/ehrchannel.block

  if [ $? -ne 0 ]; then
    echo "ERROR: Channel creation failed."
    exit 1
  fi
  echo "✓ Channel created"

  echo "Joining peer0.hospital to channel..."
  docker exec cli peer channel join \
    -b ./channel-artifacts/ehrchannel.block

  echo "Joining peer0.patient to channel..."
  docker exec \
    -e CORE_PEER_LOCALMSPID=PatientMSP \
    -e CORE_PEER_ADDRESS=peer0.patient.ehr.com:8051 \
    -e CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/patient.ehr.com/users/Admin@patient.ehr.com/msp \
    cli peer channel join -b ./channel-artifacts/ehrchannel.block

  echo "✓ All peers joined channel successfully"
}

function networkDown() {
  echo "=== Stopping EHR Blockchain Network ==="

  cd "${FABRIC_NETWORK_DIR}/docker"
  docker compose down --volumes --remove-orphans
  cd "${SCRIPT_DIR}"

  rm -rf "${SCRIPT_DIR}/organizations"
  rm -rf "${SCRIPT_DIR}/channel-artifacts"

  docker rm -f $(docker ps -aq --filter name=dev-peer*) 2>/dev/null || true
  docker rmi -f $(docker images -q dev-peer*) 2>/dev/null || true

  echo "✓ Network stopped and cleaned"
}

function networkRestart() {
  networkDown
  sleep 3
  networkUp
}

MODE=$1

if [ "$MODE" == "up" ]; then
  networkUp
elif [ "$MODE" == "down" ]; then
  networkDown
elif [ "$MODE" == "restart" ]; then
  networkRestart
else
  printHelp
  exit 1
fi

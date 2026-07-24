/**
 * Main entry point for EHR Chaincode
 * 
 * This file exports the smart contract to Hyperledger Fabric
 */

'use strict';

const EHRContract = require('./lib/ehr-contract');

module.exports.EHRContract = EHRContract;
module.exports.contracts = [EHRContract];
# System Architecture - SegueEMR

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LAYER                                │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │  Patient Portal  │              │  Doctor Portal   │         │
│  │  (React App)     │              │  (React App)     │         │
│  └────────┬─────────┘              └────────┬─────────┘         │
└───────────┼──────────────────────────────────┼──────────────────┘
            │                                  │
            │         HTTP/REST API            │
            └──────────────┬───────────────────┘
                          │
┌─────────────────────────▼─────────────────────────────────────────┐
│                    APPLICATION LAYER                               │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │           Backend API Server (Node.js/Express)          │     │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │     │
│  │  │ Controllers │  │   Services   │  │  Middleware  │   │     │
│  │  └─────────────┘  └──────────────┘  └──────────────┘   │     │
│  └─────────────────────────────────────────────────────────┘     │
└───────────┬────────────────┬─────────────────┬────────────────────┘
            │                │                 │
┌───────────▼────────────────▼─────────────────▼────────────────────┐
│                    DATA/STORAGE LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Blockchain  │  │     IPFS     │  │   MongoDB    │           │
│  │  (Fabric)    │  │ (File Store) │  │  (Metadata)  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔷 Component Details

### 1. **Frontend Layer (React)**

**Purpose:** User interface for patients and doctors

**Components:**
- `PatientDashboard.jsx` - Patient's main view
- `DoctorDashboard.jsx` - Doctor's main view
- `UploadEHR.jsx` - File upload form
- `ViewEHR.jsx` - View and download records
- `ManageAccess.jsx` - Grant/revoke access

**Communication:** REST API calls to backend (port 3000)

---

### 2. **Backend Layer (Node.js/Express)**

**Purpose:** Business logic and orchestration

#### **Controllers**
- `ehrController.js` - Handles all EHR operations

#### **Services**
- `fabricService.js` - Blockchain interaction
- `ipfsService.js` - File storage operations
- `dbService.js` - MongoDB queries

#### **Routes**
- POST `/api/ehr/upload` - Upload new record
- GET `/api/ehr/view` - Download record
- POST `/api/ehr/grant-access` - Grant access
- POST `/api/ehr/revoke-access` - Revoke access
- GET `/api/ehr/history` - Access history
- GET `/api/ehr/patient-records` - List records

---

### 3. **Blockchain Layer (Hyperledger Fabric)**

**Purpose:** Immutable ledger and access control

#### **Network Structure**
```
Orderer (Solo)
    │
    ├── Hospital Organization
    │   └── Peer0 (port 7051)
    │       └── CouchDB (port 5984)
    │
    └── Patient Organization
        └── Peer0 (port 8051)
            └── CouchDB (port 6984)
```

#### **Chaincode Functions**
- `createEHR()` - Create new record
- `readEHR()` - Read record (with access check)
- `grantAccess()` - Add user to ACL
- `revokeAccess()` - Remove user from ACL
- `getAccessHistory()` - Get audit trail
- `queryRecordsByPatient()` - Get all patient records

#### **Data Stored On-Chain**
```javascript
{
  recordId: "EHR_...",
  patientId: "patient123",
  ipfsHash: "QmX7x9...",
  encryptionKey: "...",
  authorizedUsers: ["patient123", "dr.smith"],
  accessHistory: [
    { action: "CREATED", userId: "patient123", timestamp: "..." },
    { action: "ACCESS_GRANTED", grantedTo: "dr.smith", ... }
  ]
}
```

---

### 4. **Storage Layer (IPFS)**

**Purpose:** Decentralized file storage

**Process:**
1. File encrypted with AES-256
2. Uploaded to IPFS
3. Returns unique hash (CID)
4. Hash stored on blockchain

**Advantages:**
- Content-addressable (hash = fingerprint)
- Decentralized (no single server)
- Permanent storage

---

### 5. **Database Layer (MongoDB)**

**Purpose:** Fast metadata queries

**Schema:**
```javascript
{
  recordId: String,
  patientId: String (indexed),
  patientName: String,
  ipfsHash: String,
  recordType: String (indexed),
  uploadDate: Date (indexed),
  fileSize: Number,
  authorizedUsers: [String]
}
```

**Why MongoDB?**
- Fast search without querying blockchain
- Complex queries (date ranges, filters)
- Aggregations and statistics

---

## 🔄 Data Flow Diagrams

### Upload Flow

```
User Upload File
      │
      ▼
Backend receives file
      │
      ├──> 1. Upload to IPFS
      │         └──> Returns hash
      │
      ├──> 2. Store on Blockchain
      │         └──> Chaincode: createEHR()
      │              └──> Saves: {hash, ACL, metadata}
      │
      └──> 3. Save to MongoDB
                └──> Quick search metadata
```

### Access Grant Flow

```
Patient grants access to Doctor
      │
      ▼
Backend API call
      │
      ▼
Chaincode: grantAccess()
      │
      ├──> Check: Is caller the patient? ✓
      ├──> Add doctor to authorizedUsers[]
      ├──> Log action in accessHistory[]
      └──> Commit to ledger
```

### View/Download Flow

```
Doctor requests record
      │
      ▼
Backend: readEHR()
      │
      ▼
Chaincode checks ACL
      │
      ├──> Is doctor authorized? ✓
      │
      ▼
Return IPFS hash & encryption key
      │
      ▼
Backend downloads from IPFS
      │
      ▼
Decrypt file
      │
      ▼
Send to doctor
```

---

## 🔐 Security Architecture

### 1. **Identity Management**
- Fabric CA issues X.509 certificates
- MSP verifies identities
- Role-based access (patient/doctor)

### 2. **Access Control**
- Chaincode enforces permissions
- Multi-peer endorsement required
- Patient controls ACL

### 3. **Data Encryption**
- Files encrypted before IPFS upload
- Keys stored on blockchain
- Only authorized users have keys

### 4. **Audit Trail**
- All actions logged immutably
- Timestamps and user IDs
- Queryable history

---

## 📊 Performance Considerations

### Throughput
- **Blockchain:** 1000+ TPS (Hyperledger Fabric)
- **IPFS:** Network-dependent
- **MongoDB:** 10,000+ queries/sec

### Scalability
- Add more peer nodes for higher throughput
- IPFS scales horizontally
- MongoDB sharding for large datasets

### Latency
- Blockchain commit: ~2-3 seconds
- IPFS upload: 5-30 seconds (file size dependent)
- MongoDB query: <100ms

---

## 🔄 Disaster Recovery

### Blockchain
- Replicated across all peers
- Immutable ledger
- Can rebuild from any peer

### IPFS
- Content-addressable (hash-based)
- Distributed across network
- Pinning ensures availability

### MongoDB
- Regular backups
- Replica sets for HA
- Point-in-time recovery

---

## 🚀 Future Enhancements

1. **Multi-chain Support**
   - Cross-chain data sharing
   - Interoperability protocols

2. **Advanced Encryption**
   - Proxy re-encryption
   - Attribute-based encryption

3. **AI Integration**
   - Anomaly detection
   - Predictive analytics

4. **Mobile Apps**
   - iOS/Android native apps
   - QR code access sharing

5. **IoMT Integration**
   - Wearable device data
   - Real-time monitoring

---

## Operational Modules Layer (SegueEMR extension)

In addition to the blockchain-backed core EHR layer above, SegueEMR adds an off-chain
operational layer stored directly in MongoDB, powering the Nurse, Receptionist,
Laboratory Technician, Pharmacist, and Healthcare Management roles:

- **Appointments** - scheduling, check-in, and status tracking
- **Prescriptions** - issued by doctors, dispensed by pharmacists
- **Lab Orders** - ordered by doctors, processed by lab technicians
- **Billing / Invoices** - generated by receptionists and administrative staff
- **Analytics** - aggregated cross-module metrics for management oversight

These modules do not require blockchain consensus (they are day-to-day operational
records, not the immutable clinical record itself), so they are served directly through
Express + Mongoose for lower latency, while core patient medical records continue to be
anchored on the Hyperledger Fabric ledger with IPFS-backed file storage.

# API Documentation - SegueEMR Backend

## Base URL
```
http://localhost:3000/api/ehr
```

---

## 📋 Endpoints

### 1. Upload EHR Record

**POST** `/upload`

Upload a new medical record to the blockchain.

**Request:**
- Content-Type: `multipart/form-data`

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file | File | Yes | Medical file (PDF, DICOM, image, etc.) |
| patientId | String | Yes | Patient's user ID |
| patientName | String | Yes | Patient's full name |
| recordType | String | Yes | Type: X-Ray, MRI, Blood Test, CT Scan, Prescription, Report, Other |
| description | String | No | Brief description of the record |

**Example (cURL):**
```bash
curl -X POST http://localhost:3000/api/ehr/upload \
  -F "file=@/path/to/xray.dcm" \
  -F "patientId=patient123" \
  -F "patientName=John Doe" \
  -F "recordType=X-Ray" \
  -F "description=Chest X-Ray"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "EHR record created successfully",
  "data": {
    "recordId": "EHR_1737331234_a7f3c2b9",
    "ipfsHash": "QmX7x9abc123456789def...",
    "fileSize": 2457600,
    "uploadDate": "2026-01-19T10:30:45.123Z",
    "blockchainRecord": {
      "recordId": "EHR_1737331234_a7f3c2b9",
      "patientId": "patient123",
      "authorizedUsers": ["patient123"],
      "createdAt": "2026-01-19T10:30:45.123Z"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - Upload failed

---

### 2. View/Download EHR Record

**GET** `/view`

Download a medical record file.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| recordId | String | Yes | Record ID to download |
| userId | String | Yes | User requesting access |
| orgName | String | Yes | Organization: `patient` or `hospital` |

**Example:**
```bash
curl -X GET "http://localhost:3000/api/ehr/view?recordId=EHR_1737331234_a7f3c2b9&userId=dr.smith&orgName=hospital" \
  --output medical_file.dcm
```

**Response:**
- Content-Type: `application/octet-stream`
- File binary data

**Error Responses:**
- `403 Forbidden` - User not authorized
- `404 Not Found` - Record does not exist
- `500 Internal Server Error` - Download failed

---

### 3. Get Record Details

**GET** `/details`

Get record metadata without downloading the file.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| recordId | String | Yes | Record ID |
| userId | String | Yes | User ID |
| orgName | String | Yes | Organization |

**Example:**
```bash
curl -X GET "http://localhost:3000/api/ehr/details?recordId=EHR_1737331234_a7f3c2b9&userId=patient123&orgName=patient"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "blockchain": {
      "recordId": "EHR_1737331234_a7f3c2b9",
      "patientId": "patient123",
      "patientName": "John Doe",
      "ipfsHash": "QmX7x9abc123...",
      "recordType": "X-Ray",
      "description": "Chest X-Ray",
      "authorizedUsers": ["patient123", "dr.smith"],
      "createdAt": "2026-01-19T10:30:45.123Z"
    },
    "metadata": {
      "recordId": "EHR_1737331234_a7f3c2b9",
      "patientName": "John Doe",
      "fileSize": 2457600,
      "uploadDate": "2026-01-19T10:30:45.123Z"
    }
  }
}
```

---

### 4. Grant Access to Doctor

**POST** `/grant-access`

Patient grants a doctor access to their record.

**Request:**
- Content-Type: `application/json`

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| recordId | String | Yes | Record ID |
| patientId | String | Yes | Patient's user ID |
| doctorId | String | Yes | Doctor's user ID |

**Example:**
```bash
curl -X POST http://localhost:3000/api/ehr/grant-access \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "EHR_1737331234_a7f3c2b9",
    "patientId": "patient123",
    "doctorId": "dr.smith"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Access granted to dr.smith",
  "data": {
    "recordId": "EHR_1737331234_a7f3c2b9",
    "authorizedUsers": ["patient123", "dr.smith"],
    "accessHistory": [
      {
        "action": "ACCESS_GRANTED",
        "grantedTo": "dr.smith",
        "grantedBy": "patient123",
        "timestamp": "2026-01-19T10:35:12.456Z"
      }
    ]
  }
}
```

**Error Responses:**
- `400 Bad Request` - Doctor already has access
- `403 Forbidden` - Only patient can grant access
- `500 Internal Server Error` - Failed to grant access

---

### 5. Revoke Access from Doctor

**POST** `/revoke-access`

Patient revokes a doctor's access to their record.

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| recordId | String | Yes | Record ID |
| patientId | String | Yes | Patient's user ID |
| doctorId | String | Yes | Doctor's user ID |

**Example:**
```bash
curl -X POST http://localhost:3000/api/ehr/revoke-access \
  -H "Content-Type: application/json" \
  -d '{
    "recordId": "EHR_1737331234_a7f3c2b9",
    "patientId": "patient123",
    "doctorId": "dr.smith"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Access revoked from dr.smith",
  "data": {
    "recordId": "EHR_1737331234_a7f3c2b9",
    "authorizedUsers": ["patient123"],
    "accessHistory": [
      {
        "action": "ACCESS_REVOKED",
        "revokedFrom": "dr.smith",
        "revokedBy": "patient123",
        "timestamp": "2026-01-19T10:40:30.789Z"
      }
    ]
  }
}
```

---

### 6. Get Access History (Audit Trail)

**GET** `/history`

Get complete audit trail for a record.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| recordId | String | Yes | Record ID |
| userId | String | Yes | User ID |
| orgName | String | Yes | Organization |

**Example:**
```bash
curl -X GET "http://localhost:3000/api/ehr/history?recordId=EHR_1737331234_a7f3c2b9&userId=patient123&orgName=patient"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "recordId": "EHR_1737331234_a7f3c2b9",
    "patientName": "John Doe",
    "accessHistory": [
      {
        "action": "CREATED",
        "userId": "patient123",
        "timestamp": "2026-01-19T10:30:45.123Z"
      },
      {
        "action": "ACCESS_GRANTED",
        "grantedTo": "dr.smith",
        "grantedBy": "patient123",
        "timestamp": "2026-01-19T10:35:12.456Z"
      },
      {
        "action": "READ",
        "userId": "dr.smith",
        "timestamp": "2026-01-19T10:40:30.789Z"
      }
    ]
  }
}
```

---

### 7. List Patient Records

**GET** `/patient-records`

Get all records for a patient.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| patientId | String | Yes | Patient ID |
| userId | String | Yes | User ID (must match patientId) |
| orgName | String | Yes | Organization |

**Example:**
```bash
curl -X GET "http://localhost:3000/api/ehr/patient-records?patientId=patient123&userId=patient123&orgName=patient"
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "recordId": "EHR_1737331234_a7f3c2b9",
      "patientName": "John Doe",
      "recordType": "X-Ray",
      "description": "Chest X-Ray",
      "uploadDate": "2026-01-19T10:30:45.123Z",
      "fileSize": 2457600,
      "ipfsHash": "QmX7x9..."
    },
    {
      "recordId": "EHR_1737331235_b8g4d3c0",
      "patientName": "John Doe",
      "recordType": "Blood Test",
      "description": "Annual checkup",
      "uploadDate": "2026-01-18T09:15:20.456Z",
      "fileSize": 524288,
      "ipfsHash": "QmY8y0..."
    }
  ]
}
```

---

### 8. Register User (Demo Only)

**POST** `/register-user`

Register a new user in the system.

**Body Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| userId | String | Yes | Unique user ID |
| orgName | String | Yes | `patient` or `hospital` |
| role | String | No | Default: `client` |

**Example:**
```bash
curl -X POST http://localhost:3000/api/ehr/register-user \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "patient123",
    "orgName": "patient",
    "role": "client"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User patient123 registered successfully"
}
```

---

## 🔒 Error Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## 📝 Notes

1. All timestamps are in ISO 8601 format (UTC)
2. File sizes are in bytes
3. IPFS hashes start with "Qm" (CIDv0) or "bafy" (CIDv1)
4. Record IDs format: `EHR_<timestamp>_<random>`
5. All blockchain operations are logged immutably

---

## Operational Modules API (SegueEMR extension)

These endpoints serve the off-chain operational modules and live outside `/api/ehr`.

### Appointments — Base: `/api/appointments`

| Method | Path | Role | Description |
|--------|------|------|--------------|
| POST | `/` | Receptionist | Schedule a new appointment |
| GET | `/` | Any | List appointments (filter by `doctorId`, `patientId`, `status`, `from`, `to`) |
| PUT | `/:appointmentId` | Receptionist / Nurse | Reschedule, update status, or add notes |
| DELETE | `/:appointmentId` | Receptionist | Cancel an appointment |

### Prescriptions — Base: `/api/prescriptions`

| Method | Path | Role | Description |
|--------|------|------|--------------|
| POST | `/` | Doctor | Issue a new prescription |
| GET | `/` | Any | List prescriptions (filter by `patientId`, `doctorId`, `status`) |
| PUT | `/:prescriptionId/dispense` | Pharmacist | Mark a prescription as dispensed |

### Lab — Base: `/api/lab`

| Method | Path | Role | Description |
|--------|------|------|--------------|
| POST | `/orders` | Doctor | Order a lab test |
| GET | `/orders` | Any | List lab orders (filter by `patientId`, `doctorId`, `status`) |
| PUT | `/orders/:labOrderId/status` | Lab Technician | Update sample/test status |
| PUT | `/orders/:labOrderId/result` | Lab Technician | Upload result and mark completed |

### Billing — Base: `/api/billing`

| Method | Path | Role | Description |
|--------|------|------|--------------|
| POST | `/invoices` | Receptionist / Admin Staff | Create a new invoice |
| GET | `/invoices` | Any | List invoices (filter by `patientId`, `status`) |
| PUT | `/invoices/:invoiceId/pay` | Receptionist / Admin Staff | Mark an invoice as paid |

### Analytics — Base: `/api/analytics`

| Method | Path | Role | Description |
|--------|------|------|--------------|
| GET | `/overview` | Healthcare Management | Organization-wide metrics: appointments, prescriptions, lab orders, revenue, staff counts, recent activity |

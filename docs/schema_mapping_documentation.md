# Database Schema Mapping & Storage Configuration

This document outlines the data model synchronization rules mapping PostgreSQL records to Microsoft Dataverse entities and details the storage container structure/metadata specifications for Azure Blob Storage.

---

## 🔵 Microsoft Dataverse Entity Mapping

Azure Dataverse holds business objects and workflows matching the Microsoft Dynamics/Power Apps environment. The primary mapping is structured as follows:

| PostgreSQL Table | Dataverse Entity | Sync Type | Trigger | Sync Logic / Field Mappings |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `systemuser` | Direct (One-Way) | User Creation | Maps user credentials, role alignments, and basic contact details. |
| `patients` | `contact` | Bidirectional | Patient Register / Edit | Maps patient profile, demographics, address, and medical metadata. |
| `doctors` | `bookableresource` | Bidirectional | Doctor Profile Update | Links resource availability, specialization, and credentials. |
| `appointments` | `appointment` | Bidirectional | Schedule / Status Update | Syncs appointment start/end times, statuses, and service details. |
| `invoices` | `invoice` | Direct (One-Way) | Invoice Payment | Syncs billing summaries, paid records, and itemized billing fields. |

---

## 🟢 Azure Blob Storage Configuration

Azure Blob Storage handles file storage for EMR uploads (scans, PDFs, medical imaging) and prescriptions.

### Container Layout

1. **`medical-records` Container**
   - Stores general patient records, diagnostic images (DICOM/JPG), and laboratory reports.
   - Blob naming convention: `{patient_id}/{emr_record_id}_{filename}`

2. **`prescriptions` Container**
   - Stores PDF generated prescriptions signed by physicians.
   - Blob naming convention: `{patient_id}/rx_{prescription_id}.pdf`

### Blob Metadata Specifications

Each uploaded file must attach the following metadata tags inside Azure Blob headers to optimize discovery and search capabilities:

| Metadata Tag | Data Type | Description |
| :--- | :--- | :--- |
| `patientId` | String | Unique patient identifier reference (`patient_id`). |
| `emrRecordId` | String | Unique EMR file identifier reference (`id` in `emr_records`). |
| `recordType` | String | Categories like `LabReport`, `XRay`, `Prescription`. |
| `uploadedBy` | String | User ID who initiated the upload. |
| `encryption` | String | Encryption type (e.g., `AES-256-CBC` or `None`). |

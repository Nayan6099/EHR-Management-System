# SegueEMR

A unified Electronic Medical Records &amp; practice management platform, built with Hyperledger Fabric (via Chaincode-as-a-Service) for tamper-proof core medical records, IPFS for encrypted file storage, MongoDB for operational data (appointments, prescriptions, lab orders, billing), and React for the frontend.

---

## Roles Supported

| Role | Highlights |
|------|------------|
| Patient | Upload/view own records, manage doctor access |
| Doctor | View patient records, issue prescriptions, order lab tests, manage appointments |
| Nurse | Check patients in, update appointment status |
| Receptionist | Schedule/reschedule/cancel appointments, generate invoices |
| Laboratory Technician | Process lab orders, upload results |
| Pharmacist | View and dispense prescriptions |
| Administrative Staff | User management, records oversight, activity logs |
| Healthcare Management | Organization-wide analytics dashboard |

---

## Prerequisites

Before starting, ensure you have the following installed and configured:

- **Windows 10/11** with WSL2 (Ubuntu 22.04 recommended)
- **Docker Desktop** (with WSL2 integration enabled in Settings → Resources → WSL Integration)
- **Node.js v18+** (inside WSL)
- **MongoDB** (running locally inside WSL)
- **IPFS Daemon/Desktop** (running locally at `localhost:5001`)

---

## Step 1 — Clone the Repository

Open your WSL terminal and run:

```bash
git clone <your-repo-url>
cd SegueEMR
```

---

## Step 2 — Start the Fabric Blockchain Network

The underlying Hyperledger Fabric blockchain architecture handles identity, CA management, CouchDB states, and orderers via Docker.

**Start the network and provision the channels:**

```bash
cd fabric-network
./scripts/network.sh up
```

Wait for all Docker containers to start. Verify your containers using `docker ps`. You should see instances for: `peer0.hospital`, `peer0.patient`, `orderer`, `cli`, and `ehr-chaincode`.

---

## Step 3 — Deploy the Blockchain Smart Contract (CCaaS)

This project uses the modern **Chaincode-as-a-Service (CCaaS)** deployment method rather than standard Docker-in-Docker instantiation. The smart contract actually runs natively inside the `ehr-chaincode` docker container bridging transactions over gRPC.

To install, approve, and commit the CCaaS smart contract rules across all organizational peers, run the deployment script from the project root:

```bash
cd fabric-network/scripts
./deployCC.sh
```

Ensure this script finishes by echoing exactly: `Chaincode Deployment Complete!`

---

## Step 4 — Initialize the Backend Cryptographic Wallet

Your backend needs the proper cryptographic X.509 material from the Fabric network to sign transactions reliably.

**Open a new WSL terminal** and load the identities into your backend Wallet:

```bash
cd SegueEMR/backend
npm install
node initWallet.js
```
*You should see a success message indicating identities like `dr.smith` and `patient123` were successfully populated!*

---

## Step 5 — Start IPFS & MongoDB Infrastructures

Ensure you have your data layers running.

1. **MongoDB**: Start your local MongoDB service:
   ```bash
   sudo service mongodb start
   ```

2. **IPFS Node**: Ensure your IPFS node is cleanly running on port 5001 so the backend can upload and download securely encrypted patient files.
   ```bash
   ipfs daemon
   ```

---

## Step 6 — Start the Backend Server

Start the Express.js API server bridging the frontend to the Hyperledger fabric gateway plus the off-chain operational modules (appointments, prescriptions, lab, billing, analytics).

**In your backend terminal:**
```bash
npm run dev
```

The backend should connect safely and run on `http://localhost:3000`.

---

## Step 7 — Start the React Frontend

Open **another new WSL terminal** for the frontend user interface:

```bash
cd SegueEMR/frontend
npm install
npm start
```

The UI should automatically pop open locally at `http://localhost:3001`!

---

## Default Login Credentials

Use these credentials exactly to visualize the system's Role-Based Access Controls (RBAC). For any role other than Patient/Doctor, simply enter any User ID and pick the role at login — new staff records are created on the fly in MongoDB under the `hospital` organization.

| Role    | Username   | Organization |
|---------|------------|--------------|
| Patient | patient123 | patient      |
| Doctor  | dr.smith   | hospital     |

---

## Project Structure Overview

```
SegueEMR/
├── backend/                    # Express.js API
│   ├── src/controllers/        # Route handlers: EHR, admin, appointments,
│   │                           # prescriptions, lab, billing, analytics
│   ├── src/models/             # Mongoose schemas (User, EHRMetadata,
│   │                           # ActivityLog, Appointment, Prescription,
│   │                           # LabOrder, Invoice)
│   ├── src/routes/             # REST endpoints per module
│   ├── src/services/           # Fabric Gateway, IPFS, MongoDB adapters
│   └── wallet/                 # Pre-loaded Fabric X.509 cryptographic identities
├── fabric-network/             # Hyperledger architecture configurations
│   ├── chaincode/ehr/          # Chaincode Server logic evaluating incoming validations
│   ├── docker/                 # Underlying architecture images
│   └── scripts/                # Network provision, anchor updates, and CC deployment pipelines
├── frontend/                   # React Frontend Application
│   └── src/components/         # Per-role dashboards: Patient, Doctor, Nurse,
│                                # Receptionist, LabTechnician, Pharmacist,
│                                # Admin, Management
└── ipfs/                       # Decentralized storage mapping architecture
```

---

## API Overview

Beyond the existing `/api/ehr` (blockchain-backed records) and `/api/admin` routes, SegueEMR adds these off-chain operational modules:

- `POST/GET/PUT/DELETE /api/appointments` — scheduling
- `POST/GET/PUT /api/prescriptions` — prescriptions & dispensing
- `POST/GET/PUT /api/lab/orders` — lab test orders & results
- `POST/GET/PUT /api/billing/invoices` — invoicing & payments
- `GET /api/analytics/overview` — organization-wide metrics

See `docs/API_DOCUMENTATION.md` for full details.

---

## Common Dev Issues & Fixes

**Docker containers not starting?**
Ensure WSL2 Docker integration is checked for your active WSL distro in Docker Desktop.

**Network Connection Profiles missing during doctor flows?**
Rerun `./scripts/network.sh down` then `up` to cleanly sweep configuration and clear lingering docker volumes.

**Rebuilding the App Chaincode:**
Since this utilizes CCaaS, rebuilding the code logic is tremendously easy and doesn't require reinstalling/committing on the blockchain. Just edit the `fabric-network/chaincode/ehr` logic, navigate to `fabric-network/docker`, and run:
```bash
docker compose up -d --build ehr-chaincode
```

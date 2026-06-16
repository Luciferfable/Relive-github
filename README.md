# ReLive: Custom Full-Stack Memory Restoration & Family Legacy Platform

ReLive is a bespoke, full-stack enterprise-grade application designed for memory preservation, vintage asset restoration, logistics management, and family digital preservation. Built with a high-contrast modern slate theme, the system delivers an elegant, high-performance workspace for users, administrative staff, partners, and media restorers.

---

## 🏗️ Architectural Overview

The application features a modern full-stack split: a React client layer built with Vite & Tailwind CSS, backed by an Express server executing secure server-side operations. This architecture ensures complete containment of secret credentials, shielding third-party API keys and admin tasks from client-side vulnerability surfaces.

```
       +--------------------------------------------------+
       |               React Desktop Client               |
       |  (Tailwind CSS, Inter Font, Lucide-React Icons)  |
       +------------------------+-------------------------+
                                |
          Secure JSON / multipart APIs (Port 3000)
                                |
       +------------------------v-------------------------+
       |               Express Server (ESM)               |
       |     (Multer, Nodemailer, JS-PDF Generators)      |
       +-----+------------------+-------------------+-----+
             |                  |                   |
             |                  |                   |
     +-------v--------+  +------v-------+    +------v------+
     | Gemini Pro AI  |  |  Amazon S3   |    |  Firebase   |
     |   Restorations |  | Storage Path |    | Admin Suite |
     +----------------+  +--------------+    +-------------+
```

---

## 🛡️ Core Security Architecture & Secret Protection

Safety is baked natively into the codebase to protect the family legacy data and align with strict repository requirements for GitHub:

1. **Zero Client Secrets**: All cloud calls to Amazon S3, Google Gemini models, SMTP systems, or Firebase database suites are handled exclusively in `server.ts` through server-side routes (`/api/*`).
2. **Automated Scanner Safety**: Active API Keys, IAM user access blocks, and private PEM key structures are eliminated from committed resources. Local fallback configurations allow complete sandboxed simulation when real keys are absent.
3. **Firestore Security Control**: The workspace enforces rule scopes deployed at the database interface layer. Rules restrict document visibility dynamically to account ownership, administrative permissions, or partner scopes.

---

## 💡 Key Operations & Features

- **Gemini-Powered Restoration**: Restores context and repairs descriptions for age-degraded media, utilizing the advanced `@google/genai` Node.js library.
- **Dynamic AWS S3 Asset Pipeline**: Secure, multi-part memory storage mapped onto transient pre-signed URLs with automated, robust secure local CDN fallbacks.
- **Family Vault Multi-Tenancy**: Granular permission scopes for childhood, wedding, heritage family albums with optional targeted recipient sharing.
- **Automated Logistic Processing**: Real-time partner assignments for tracking transportation, vintage processing stages, and verification checkpoints.
- **Direct PDF Billing**: Automated invoice delivery utilizing JS-PDF vector layouts with encrypted transaction signatures.

---

## 🚀 Local Development Setup

To establish and execute the local system workspace:

### 1. Prerequisites
Ensure you have **Node.js (v18+)** and **npm** installed on your desktop.

### 2. Configure Environment Configurations
Copy the secure environment manifest template to populate local values:
```bash
cp .env.example .env
```
Populate `.env` with actual development credentials:
```env
GEMINI_API_KEY="AIzaSy..."
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="your-aws-region"
AWS_S3_BUCKET="your-bucket-name"
FIREBASE_PROJECT_ID="..."
FIREBASE_CLIENT_EMAIL="..."
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### 3. Installation
Install project dependencies completely:
```bash
npm install
```

### 4. Boot Dev Environment
Start the development server (runs with Vite live-compilation mapping directly via `tsx server.ts`):
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🛠️ Build and Standalone Production Execution

To generate optimized builds for continuous integration and deployable services:

### 1. Production Compilation
Compile the frontend static assets and bundle the backend TypeScript engine into standard, self-contained ESM-ready CJS files cleanly in `/dist`:
```bash
npm run build
```

### 2. Production Launch
Boot the production build directly with the bundled server:
```bash
npm run start
```

---

## 🗄️ Firestore Security Policy

The repository carries a production-ready `/firestore.rules` specification mirroring the following access-control metrics:

- **/users**: Private self-reads and edits; global user audits restricted solely to users designated as `admin`.
- **/orders**: Visible to authorized customer accounts, assigned delivery `partners`, or active `restorer` accounts. Updates audited securely via key diff boundaries.
- **/files & /albums**: Multi-modal sharing gates. Read permissions validate user ownership or target recipient authorization.
- **/s3_uploads**: Track uploads using validated account IDs.

# ReLive Memory Preservation Platform
## Technical Architecture, Workflows, and Database Schema

---

### 1. High-Level System Architecture

ReLive implements a cohesive, high-performance **full-stack micro-architecture** combining dynamic client-side interactions, robust local sandbox fallbacks, and a secure Node.js Express server acting as a secure gateway to the Firebase Admin suite and AWS storage layers.

```
+---------------------------------------------------------------------------------+
|                               CLIENT BROWSER                                    |
|                                                                                 |
|  +------------------------+  +------------------------+  +-------------------+  |
|  |     Landing Screen     |  |   Customer Dashboard   |  |  Admin Dashboard  |  |
|  +------------------------+  +------------------------+  +--------------+----+  |
|                                                                         ^       |
|                                                                         v       |
|  +--------------------------+  +--------------------------+  +----------+----+  |
|  |  Role-restricted Views   |  |   Secure OTP Handler     |  | S3 Image Explorer|  |
|  +--------------------------+  +--------------------------+  +---------------+  |
+---------------------------------------+-----------------------------------------+
                                        | (HTTPS Calls & Event Streams)
                                        v
+---------------------------------------------------------------------------------+
|                             EXPRESS NODE.js SERVER                              |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  |                           parseAuthedToken Middleware                     |  |
|  |          - Reads Authorization: Bearer <UID>                              |  |
|  |          - Validates role headers (X-User-Role, X-User-Email)             |  |
|  +-------------------------------------+-------------------------------------+  |
|                                        |
|         +------------------------------+------------------------------+
|         |                              |                              |
|         v                              v                              v
|  +------+---------------+  +-----------+-----------+  +---------------+-------+  |
|  |  Firebase Admin SDK   |  |   Nodemailer mock     |  |   AWS S3 Node Client  |  |
|  |  Firestore direct/   |  |   Virtual SMTP stream |  |   Pre-signed URLs /   |  |
|  |  Auth sync endpoints |  |   Dispatch alerts     |  |   Image processing    |  |
|  +------+---------------+  +-----------------------+  +---------------+-------+  |
+---------|-------------------------------------------------------------|---------+
          |                                                             |
          v                                                             v
+------------------------+                                    +-------------------+
|  GOOGLE FIREBASE CLOUD |                                    |    AMAZON AWS     |
|                        |                                    |                   |
|   - Authentication     |                                    |   - S3 Storage    |
|   - Firestore database |                                    |     Bucket        |
+------------------------+                                    +-------------------+
```

#### Dual-State Persistence Engine (Core Innovation)
The application handles connection dropouts or missing credentials gracefully using a **Dual-State Engine**:
1. **Durable Live Mode**: When active and authorized, client mutations are written to the live Firestore. Live subscriptions update the local React state in real-time.
2. **Transient Sandbox Mode**: When unauthenticated or unconfigured, the system writes client mutations to partitioned client-side standard `localStorage` variables. Concurrently, it asynchronously dispatches replication payloads to the Express server `/api/sync-to-firebase` endpoint. The server handles persistent replication via the Firebase Admin SDK.

---

### 2. Database Schema (Entities and Relations)

Firestore uses a flexible document structure. ReLive structures records logically inside six collections to ensure strict index safety and reference mapping.

```
       [users] (Profiles, Roles, VIP tiers)
          | (1)
          |
          |--------< (N) [appointments] (Scheduled pickups, dates, GPS coordinates)
          |
          |--------< (N) [orders] (Tape spools status, Otp gates, Partner assignments)
          |
          |--------< (N) [files] (Restored image groups, restored URLs, previews)
          |
          |--------< (N) [albums] (Curated memory vaults grouped by family)
          |
          +--------< (N) [notifications] (Alert dispatches and status trackers)
```

#### Collection Schemata & Rules

##### 1. Collection: `users`
*Documents keyed by user's unique identification string `uid`.*
```typescript
interface AppUser {
  uid: string;          // Primary Identifier
  email: string;        // Account login email
  displayName: string;  // Humid name e.g. "Aarav Sharma"
  role: 'user' | 'admin' | 'partner' | 'restorer';
  city?: string;        // Default: 'Jaipur'
  phone?: string;       // Verified phone number
  address?: string;     // Home address mapping
  profilePhoto?: string;// Thumbnail avatar URI
  isSandbox?: boolean;  // Sandbox indicator flag
}
```

##### 2. Collection: `orders`
*Documents track physical spools, digitization phases, and logistics.*
```typescript
interface Order {
  id: string;                // Primary Identifier (e.g., 'order-582')
  userId: string;            // Foreign key referencing users.uid
  customerName: string;      // Cached customer name (for high-speed queries)
  customerPhone?: string;
  alternatePhone?: string;
  dateCreated: string;       // ISO Date String (YYYY-MM-DD)
  serviceType: string;       // e.g. "Cassette Tape Digitization", "Photo Restoration"
  itemCount: number;         // Volume of physical spools
  deliveryStatus: 'appointment_created' | 'partner_assigned' | 'partner_accepted' | 'on_the_way' | 'arrived' | 'pickup_verified' | 'collected' | 'processing' | 'restoring' | 'completed' | 'delivered';
  restorationStage: 'collected' | 'laboratory' | 'qa_check' | 'finalized';
  pickupOtp: string;         // Secure 4-digit code generated for handover
  otpVerified: boolean;      // Handover validation gate is true/false
  assignedPartnerId?: string;// Foreign key referencing partner user.uid
  address?: string;          // Pickup/Delivery destination
  notes?: string;            // Direct instructions
  latitude?: number;         // GPS latitude
  longitude?: number;        // GPS longitude
}
```

##### 3. Collection: `appointments`
*Tracks booked doorstep logistics events.*
```typescript
interface Appointment {
  id: string;             // Primary Identifier
  userId: string;         // Foreign key referencing users.uid
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  alternatePhone?: string;
  address: string;
  city: string;
  scheduledDate: string;  // YYYY-MM-DD
  timeSlot: string;       // e.g. "10:00 AM - 01:00 PM"
  status: 'pending' | 'verified' | 'completed' | 'cancelled';
  notes?: string;
  latitude?: number;
  longitude?: number;
}
```

##### 4. Collection: `files`
*Durable catalog of restored high-resolution images.*
```typescript
interface FileItem {
  id: string;               // Primary Identifier
  userId: string;           // Foreign key referencing users.uid
  albumId?: string;         // Optional foreign key to albums.id
  name: string;             // File name label
  restoredUrl: string;      // Cloud storage link (pre-signed S3 or unsplash mockup)
  originalUrl?: string;     // Vintage/damaged original photo reference
  thumbnailUrl?: string;    // Optimization thumbnail link
  previewUrl?: string;      // Processor pipeline processed CDN route
  size?: string;            // File size e.g. "4.2 MB"
  category?: 'photos' | 'videos' | 'audio' | 'documents';
  restorationNotes?: string;// Engineering laboratory annotations
  createdAt: string;        // ISO creation date
}
```

##### 5. Collection: `albums`
*User-curated virtual subfolders/vaults.*
```typescript
interface FamilyVault {
  id: string;               // Primary Identifier
  ownerId: string;          // Foreign key referencing users.uid
  name: string;             // Virtual folder title
  description?: string;     // Description
  createdAt: string;        // ISO date
}
```

##### 6. Collection: `notifications`
*System notifications dispatch record.*
```typescript
interface AppNotification {
  id: string;               // Primary Identifier
  userId: string;           // Target user uid receiving notification
  title: string;            // Alert header
  message: string;          // Detailed message body
  type: 'pickup' | 'restoration' | 'general';
  date: string;             // YYYY-MM-DD
  isRead: boolean;          // Read state indicator
}
```

---

### 3. Core Workflows & OTP Handshake

```
  [ CUSTOMER ]                                   [ PARTNER ]                              [ LABORATORY / ADMIN ]
  Place Order                                   Assigned Task                             Process Spool Group
       |                                              |                                             |
       v (Generates pickupOtp)                        v                                             v
Book Doorstep --- OTP Generated! ("4321") ----> Partner Drives                              Restorer receives cassette
       |                                       To Customer's GPS                            Tapes & runs high definition
       |                                              |                                     digitization scanning
       |                                              v                                             |
       | <---- Enters 4-digit code in dashboard <---- Partner inputs OTP                            v
       |                                              |                                     Uploads 4K digitized files
       v                                              v                                             |
 OTP Match! -> Security Verified! -----------> State -> pickup_verified                             v
(Orders status upgrades automatically)      Order collected! (Handover Complete)             Customer explores media.
```

1. **Scheduling**: A customer books a doorstep pickup via their dashboard. This books an `Appointment` and schedules an `Order` in the `appointment_created` state. A secure random 4-digit `pickupOtp` is instantly generated.
2. **Assignment**: The logistics engine assigns the ticket to a regional logistics partner (e.g., Kartik Yadav).
3. **Dispatch**: The partner Accepts the task via the **Partner Dashboard**, moves 'On The Way' and drives to the customer's coordinates.
4. **Validation (The Gate)**: Upon arrival, the Partner prompts the customer for the Secure 4-digit validation code shown on the user's screen. The partner inputs this OTP. If matched, the Order is marked as `pickup_verified`, completing physical custody transfer securely.
5. **Ingress and Archive**: The physical media arrives at Jaipur labs. Visual restorers process tapes, upload digitized files, link them to the order/customer, and notify the user.

---

### 4. Image Upload & S3 Pipeline Mechanism

The S3 Upload pipeline handles modern image ingestion, dynamic thumbnails, and robust offline file fallback.

```
 CUSTOMER SCREEN
 [ Select original/damaged photo ]
               |
               v (Read raw file)
 [ Conversion to Base64 in Browser ] ----( Send payload JSON )----> [ SERVER /api/upload ]
                                                                             |
                                                                             v
                                                              +--------------+--------------+
                                                              |                             |
                                                   S3 Client Credentials Active?     Fallback Sandbox?
                                                              |                             |
                                                              v                             v
                                                   Validate bucket & path            Store record in Firestore
                                                   Upload Base64 directly            as live reference
                                                   Generate pre-signed S3 URL        (Falls back to processed UI)
```

#### Behind-The-Scenes Detail
1. **Client-Side Sizable Ingress**: In `DashboardAdmin.tsx`, when an administrator drags/drops or selects a photo for digitization upload, the file is read as a binary stream and converted to standard Base64 string formatting directly inside the client context.
2. **JSON Payload Transit**: A POST request containing the Base64 payload, original file configuration, target user UID, and linked order ID is pushed to the server endpoint `/api/upload`.
3. **AWS S3 Handshake**:
    - The server attempts to initialize the `S3Client` using system environment credentials. 
    - If S3 is active, the Base64 payload is parsed back to writeable buffer segments and streamed directly into AWS S3 storage under the custom structured prefix `users/${targetUserId}/`.
    - A secure pre-signed URL is generated dynamically which is stored as the `restoredUrl` key in Firestore.
4. **Resilient DB Replication**: Concurrently, whether S3 succeeds or is bypassed, an record is written to the Firestore collection `s3_uploads`. This registers the file inside the customer's private restoration room so it loads instantly inside their gallery interface.

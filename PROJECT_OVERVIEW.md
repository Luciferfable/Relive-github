# ReLive Memory Preservation Platform — Comprehensive Project Overview

Welcome to the **ReLive Portal**! This document provides a exhaustive, detailed architectural and functional breakdown of the ReLive memory restoration application. It explains how the system operates, the design paradigms used, the integration with secure cloud databases, and the specific security, concurrency, and usability refinements recently introduced.

---

## Table of Contents
1. [Core Purpose & Value Proposition](#1-core-purpose--value-proposition)
2. [Architectural Blueprint](#2-architectural-blueprint)
3. [Recent Key Refinements & Security Upgrades](#3-recent-key-refinements--security-upgrades)
   - [A. Removal of Family Heritage Vault](#a-removal-of-family-heritage-vault)
   - [B. High-Scalability Sandbox Architecture (20+ Concurrent Users)](#b-high-scalability-sandbox-architecture-20-concurrent-users)
   - [C. Password Strength Verification and Live Feedback Meter](#c-password-strength-verification-and-live-feedback-meter)
   - [D. 30-Minute Inactivity Auto-Logout Protocol](#d-30-minute-inactivity-auto-logout-protocol)
4. [State Management & Data Flow](#4-state-management--data-flow)
5. [Database Schema Designs (Cloud Firestore)](#5-database-schema-designs-cloud-firestore)
6. [Design & Styling System](#6-design--styling-system)

---

## 1. Core Purpose & Value Proposition

**ReLive** is an ambient, high-end, premium analog memory preservation service. It bridges physical family nostalgia (such as VHS cassettes, old celluloid films, negative slides, or fragile photo prints) with high-definition digital accessibility. 

### Core Features Offered to Users:
*   **Archival Overview**: Real-time status reporting, interactive order trackers, and quick action widgets.
*   **Preservation Orders**: Streamlined physical asset collection scheduling and digitized catalog creation.
*   **Doorstep Pickups**: Custom scheduled slot selector for certified ReLive professionals to collect fragile assets directly.
*   **My Restored Files Panel**: A clean, elegant asset library separating original damaged uploads with restored/enhanced high-definition outputs with filters mapping specific categories (Wedding, Childhood, Heritage, Travel).
*   **AI Archival Assistant**: An interactive AI archivist trained in analog media formats to provide intelligent suggestions on conservation and historical restoration diagnostics.

---

## 2. Architectural Blueprint

The application is engineered as a modern, high-fidelity Single-Page Application (SPA) powered by **React (v18+)**, compiled through the raw speed of **Vite**, structured via strict type safety in **TypeScript**, and styled with **Tailwind CSS**.

```
  ┌───────────────────────────────────────────────────────────────┐
  │                           React App                           │
  │                  (Global State & Routing)                     │
  └──────────────────────────────┬────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
        ┌───────────────────────┐ ┌───────────────────────┐
        │     Admin Console     │ │    User Dashboard     │
        │                       │ │                       │
        │ - User Management     │ │ - Order Tracker       │
        │ - Asset Tagging/Upload│ │ - Pickup Bookings     │
        │ - Ticket Fulfillment  │ │ - Restored File View  │
        │ - Database Seeding    │ │ - AI Chat Assistant   │
        └───────────────────────┘ └───────────────────────┘
                    │                         │
                    └────────────┬────────────┘
                                 ▼
        ┌───────────────────────────────────────────────────────┐
        │                 Data Synchronization                  │
        │                                                       │
        │  1. Live Firebase Auth & Cloud Firestore Sync         │
        │  2. Seamless LocalStorage Sandbox Persistence fallback│
        └───────────────────────────────────────────────────────┘
```

---

## 3. Recent Key Refinements & Security Upgrades

We have introduced four critical functional and security refinements to the core codebase:

### A. Removal of Family Heritage Vault
*   **Problem**: Having separate "Family Vault" and "My Restored Files" sub-menus created user confusion and diluted the experience by spreading digital assets across two distinct sections with identical media formats.
*   **Enhancement**: We removed the "Family Heritage Vault" tab option entirely.
*   **Implementation**: 
    - The structural `activeTab` states and primary dashboard tab options were unified.
    - All file views, high-resolution downloads, and media assets were merged into **"My Restored Files"**.
    - Category filtering, download actions, and detail cards were updated to redirect directly into the restored file viewer.
    - Post-payment alerts, system notifications, and transaction workflows now cleanly point to "My Restored Files" for a highly responsive, single-source archival experience.

### B. High-Scalability Sandbox Architecture (20+ Concurrent Users)
*   **Problem**: In offline sandbox mode, fallback logins initially defaulted to static mock pointers referencing a singular user placeholder (`user-01`). This caused data overlapping, meaning distinct users would overwrite each other’s mock appointments, notifications, logs, and files.
*   **Enhancement**: Redesigned the fallback logic to fully isolate and store state data for at least 20+ concurrent users seamlessly inside local storage structures.
*   **Implementation**:
    - Created isolated, user-specific mock identifiers linked with the active UID.
    - Integrated multi-slot sub-states: `relive_sand_orders_${uid}`, `relive_sand_appts_${uid}`, `relive_sand_files_${uid}`, etc.
    - This allows dozens of unique sandbox users to register, create appointments, modify settings, and add restored images concurrently on the same interface with absolute confidentiality and zero data leakages.

### C. Password Strength Verification and Live Feedback Meter
*   **Problem**: Simple registrations could introduce weak, easily compromised credentials. Users lacked active awareness of secret-strength targets when defining login passwords.
*   **Enhancement**: Integrated an interactive password strength engine that evaluates input strings instantly.
*   **Implementation**:
    - **Password Toggle Visibility**: Created an toggle feature (<kbd>Eye</kbd> / <kbd>EyeOff</kbd> icons) to easily inspect or hide the characters inside the password field in real-time.
    - **Five-Tier Scoring Framework**: Evaluates strings on five key, robust criteria:
        1. Length $\ge 8$ characters.
        2. At least one uppercase letter (`A-Z`).
        3. At least one lowercase letter (`a-z`).
        4. At least one numeric digit (`0-9`).
        5. At least one special symbol. (e.g., `!@#$%^&*`).
    - **Interactive Progress Bars**: A colored multi-segment bar translates current progress into visually pleasing levels (Red/Weak $\rightarrow$ Orange/Moderate $\rightarrow$ Teal/Good $\rightarrow$ Emerald/Excellent).
    - **Real-Time Checklist**: Interactive list indicators (green checks/red crosses) show precisely which security rules are met and which are missing as the user types.
    - **Form Guardrails**: The registration query runs validation against the complexity metric, preventing submission of insecure options.

### D. 30-Minute Inactivity Auto-Logout Protocol
*   **Problem**: If users left their desktop dashboards open and unattended, unauthorized individuals could access sensitive family file records.
*   **Enhancement**: Added a secure background timer that monitors user engagement and safely signs them out if they are idle.
*   **Implementation**:
    - Extracted core listener patterns monitoring key interaction events: mouse movements, clicks, keystrokes, scrolling, and touch signals.
    - **Throttling Mechanism**: Input event resets are throttled (max once per second) to keep system latency low and protect rendering performance on high refresh-rate monitors.
    - **Automated Expired Handshake**: If idle for exactly 30 minutes, the session is safely deactivated, calling `handleLogout()`.
    - **Visual Feedback Alerts**: On redirecting back to the gateway login area, a secure amber warning alert informs the user: *"For your protection, you were logged out automatically after 30 minutes of inactivity. Please sign back in."*

---

## 4. State Management & Data Flow

ReLive relies on dual-redundancy state routing:
1.  **Cloud Native Connection**: Uses real-time listeners (`onSnapshot`) hooked directly onto Cloud Firestore database collections. Any change made by admin users instantaneously updates the customer interface.
2.  **Graceful Offline/Sandbox Failover**: If Firestore is blocked, offline, or experiencing network constraints, ReLive detects the failure gracefully. It routes the application into a sandbox session with high-fidelity local state emulation, preventing app crashes.

---

## 5. Database Schema Designs (Cloud Firestore)

Within Cloud Firestore, data is segmented into flat, highly queryable collections to maximize operations and read speeds:

*   **`users`**: Contains profile names, roles (`admin` or `user`), phone contacts, profile photos, geo-locations, and digital delivery preferences.
*   **`files`**: Coordinates high-res media metadata, original/restored side-by-side URLs, categorization labels, and enhancement timelines.
*   **`orders`**: Focuses on physical preservation ticket stages, transactional prices, physical volume count, and historical timelines.
*   **`appointments`**: Logs booking date availability, timeslots chosen, geo-pickup locations, and certified courier alignments.
*   **`notifications`**: Real-time alerts keeping users updated on diagnostics, payments, and pick-up updates.

---

## 6. Design & Styling System

The application layout is built with visual precision using Tailwind CSS:
*   **Minimalist Canvas**: Off-whites (`stone-50`), charcoal grays, and gold/amber highlights create an editorial, museum-like catalog atmosphere.
*   **Refined Typography**: Pairings of serif headings with clean sans-serif bodies.
*   **Cohesive Animations**: Smooth state changes using `motion` transitions for menus, sliders, modals, and alerts.

---
*Document prepared on 2026-06-03 by the ReLive Core Engineering Agent.*

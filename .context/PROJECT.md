# Project Context: NR Nexus

## Vision
NR Nexus is the central hub for the "NR" (Ritthinarongron) school ecosystem. It serves as a unified platform to integrate various school management systems, providing a single point of access and a centralized user database.

## Tech Stack
- **Frontend:** React 19, Vite, TailwindCSS (v4)
- **Backend/BaaS:** Firebase (Authentication, Firestore, Hosting)
- **Icons:** Lucide-React
- **Styling:** PostCSS, Autoprefixer
- **Package Manager:** NPM

## Architecture
NR Nexus follows a **Unified User System** architecture:
- **Centralized Authentication:** Uses Google Auth restricted to the school domain (@nr.ac.th).
- **Unified Firestore Database:** A single Firestore instance hosts data for all integrated applications.
- **Whitelisted Access:** Users must be pre-registered in the `users` collection before they can log in. The system automatically links their Google UID to their existing document upon first login.
- **Role-Based Access Control (RBAC):** Users can have multiple roles (admin, teacher, student, parent) stored in a `roles` array.

## Sub-Projects (Integrated Apps)
Currently, the ecosystem includes:
1. **NR Nexus (Core/Volunteer):** The main hub for user management and volunteer job tracking.
2. **NR Electricity Stats:** A system for monitoring and reporting electricity usage.
3. **Waste Management System:** A system for tracking and managing school waste data.

## Roles
- **Admin:** Full access to user management and system-wide configurations.
- **Teacher:** Can create and manage tasks/records within specific modules (e.g., Volunteer Jobs).
- **Student:** Can participate in school activities and view their records.
- **Parent:** Designated role for family-level interaction (planned/limited).

## Open Source Goal
NR Nexus is built with the intention of being an open-source solution. The goal is to provide a robust, modern, and free school management framework that can be distributed to schools nationwide in Thailand to help modernize school administration and data management.

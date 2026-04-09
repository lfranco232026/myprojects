# Signal — BSA/AML Compliance Community Platform

A private, invite-only community platform for BSA/AML compliance professionals. Features announcements, threaded channel-based chat, a document vault, and a member directory.

## Tech Stack

- **Frontend:** React + Tailwind CSS (via CDN)
- **Backend:** Node.js + Express
- **Database:** SQLite (via better-sqlite3)
- **Auth:** JWT stored in httpOnly cookies

## Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Seed the database with sample data
npm run seed

# 3. Start both client and server
npm run dev
```

The app will be available at **http://localhost:3000** (React dev server), with the API running on **http://localhost:3001**.

## Default Login

| Email | Password | Role |
|---|---|---|
| admin@signal.com | Signal2025! | Admin |
| james@signal.com | Signal2025! | Member |
| maria@signal.com | Signal2025! | Member |
| david@signal.com | Signal2025! | Member |

## Project Structure

```
/
├── client/              # React frontend
│   ├── public/
│   └── src/
│       ├── components/  # Layout, shared components
│       ├── contexts/    # Auth, Toast providers
│       ├── pages/       # Dashboard, Chat, Vault, Members
│       └── utils/       # API helper
├── server/              # Express backend
│   ├── src/
│   │   ├── db/          # Schema, seed script
│   │   ├── middleware/  # JWT auth
│   │   └── routes/      # API routes
│   └── uploads/         # File storage (local)
└── package.json         # Root scripts
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Run client + server concurrently |
| `npm run seed` | Reset and seed the database |
| `npm run build` | Build the React client for production |

## Features

- **Dashboard:** Pinned announcements with read tracking and unread badges
- **Chat:** Threaded channels with markdown, emoji reactions, and 5-second polling
- **Vault:** File uploads (PDF/DOCX/XLSX) with category filtering and search
- **Members:** Searchable directory with editable profiles and admin controls
- **Auth:** Invite-only registration, JWT sessions, admin/member roles

## Architecture Notes

- **Database:** SQLite schema uses standard SQL types compatible with PostgreSQL migration
- **File Storage:** Local filesystem with a clear abstraction layer in `server/src/routes/vault.js` — swap `multer.diskStorage` for S3 SDK
- **Auth:** JWT in httpOnly cookies — no localStorage token exposure
- **Real-time:** Chat uses 5-second polling (no WebSocket dependency)

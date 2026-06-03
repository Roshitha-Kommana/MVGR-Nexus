# MVGR Material Hub

MVGR Material Hub is a production-ready, full-stack academic resource-sharing web platform exclusively built for students of **MVGR College of Engineering & Technology (MVGRCE), Vizianagaram**. The platform allows senior students/contributors to upload lecture notes, laboratory manuals, and previous year questions, while junior students can discover, preview, rate, bookmark, and download them.

The system is styled with a premium dark-mode default glassmorphic theme resembling Notion + Google Drive, designed mobile-first with micro-animations.

---

## Technical Stack & Architecture

### 1. Frontend
- **Framework**: React + TypeScript (Vite)
- **Styling**: Tailwind CSS (custom Glassmorphic layer utilities, Nunito body & Sora heading fonts)
- **Auth SDK**: Supabase Auth JS Client (`@supabase/supabase-js`)
- **State Management**: Zustand (UI themes, sidebar toggles, Supabase global session cache)
- **Server Cache & Async Queries**: TanStack Query (`@tanstack/react-query`) for infinite scroll cursor pagination, mutations, and caching
- **PDF Pre-validation**: `pdfjs-dist` (in-browser page count and character density scanning)
- **PDF Preview**: `react-pdf` (embedded scrollable preview showing first 3 pages)
- **Charts**: Recharts (for administrative branch & regulation metrics)

### 2. Backend
- **Framework**: Node.js + Express + TypeScript
- **Database Access**: Drizzle ORM (TypeScript-first PostgreSQL mapping)
- **PDF Server-side Re-validation**: `pdf-lib` (verifies file integrity, passwords, corruption) + `pdfjs-dist/legacy/build` (server-side text validation)
- **File Upload Parsing**: Multer (in-memory buffer parsing)
- **Storage Service**: Supabase Storage JS Client (`@supabase/supabase-js`)
- **Secure Downloads**: Secure Supabase Storage signed URLs with 5-minute expiry limits
- **Security Middleware**: Helmet headers, CORS whitelist, express-rate-limiters (global 100 req/15min, upload restricted to 10 req/15min)

---

## Project Structure

```text
mvgr-material-hub/
├── frontend/                          # React Frontend (Port 3000)
│   ├── src/
│   │   ├── components/                # Reusable UI Blocks
│   │   │   ├── Navbar.tsx             # Navbar with user status, notifications bell, and theme toggles
│   │   │   ├── MaterialCard.tsx       # Grid cards displaying curriculum indicators & averages
│   │   │   ├── PDFViewer.tsx          # react-pdf canvas controller (displays first 3 pages)
│   │   │   ├── PDFValidator.ts        # Browser-side pdfjs page/text density verification
│   │   │   ├── RatingStars.tsx        # Review score star indicators
│   │   │   ├── CommentSection.tsx     # Threaded replies with soft-deletes
│   │   │   └── FilterSidebar.tsx      # Sidebar search selectors
│   │   ├── pages/                     # Routed view layout screens
│   │   │   ├── Home.tsx               # Tagline hero, metrics, chained scope filters, contributors
│   │   │   ├── Browse.tsx             # Search inputs, filters, infinite scroll
│   │   │   ├── MaterialDetail.tsx     # Double panel preview + metadata, rating inputs, comment trees
│   │   │   ├── Upload.tsx             # Forms with autocomplete inputs & browser validation check
│   │   │   ├── Profile.tsx            # Student profile details with stats & uploads list
│   │   │   ├── Placement.tsx          # Career prep resources & student interview logs
│   │   │   └── Admin.tsx              # Recharts analytics, user ban options, flags review, audit tables
│   │   ├── store/
│   │   │   ├── uiStore.ts             # Zustand theme & layout storage
│   │   │   └── authStore.ts           # Zustand global Supabase session store
│   │   ├── services/
│   │   │   └── api.ts                 # Axios HTTP client with dynamic Supabase JWT interceptors
│   │   └── App.tsx                    # Routing configurations & OnboardingGuards
│   └── .env.example
│
├── backend/                           # Express REST API (Port 5000)
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts              # Drizzle ORM model schemas (PostgreSQL)
│   │   │   └── index.ts               # Drizzle client constructor
│   │   ├── middleware/
│   │   │   ├── attachUser.ts          # Attaches DB profile record & detects bans
│   │   │   ├── requireRole.ts         # User authorization level checks
│   │   │   └── multer.ts              # File parser buffer configurations
│   │   ├── lib/
│   │   │   ├── supabaseStorage.ts     # Supabase Storage helper (with automatic local uploads fallback)
│   │   │   └── pdfValidator.ts        # pdf-lib/pdfjs-dist validation checks
│   │   ├── controllers/
│   │   │   ├── uploadController.ts    # Rechecks file -> saves to storage -> creates rows & user notifications
│   │   │   └── materialsController.ts # Filters search parameters & tracks download counts
│   │   ├── routes/
│   │   │   ├── users.ts               # Profile onboarding updates
│   │   │   ├── upload.ts              # Multer routing
│   │   │   ├── admin.ts               # Administrative analytics dashboards
│   │   │   ├── comments.ts            # Comment feeds
│   │   │   └── ...                    # Bookmarks, ratings, reports, notifications
│   │   └── server.ts                  # express runner
│   └── .env.example
```

---

## Database Schema (PostgreSQL)

Drizzle ORM structures the PostgreSQL tables exactly matching the following layout:

- **users**: Profile logs containing Supabase User IDs, role levels (`student`, `contributor`, `admin`), active department branches, semester terms (1-8), custom regulation identifiers, roll numbers, and ban states.
- **materials**: Resource indices linking title, subject tags, regulation badge, download count, uploader IDs, and private file storage key paths.
- **ratings**: Star rating reviews. Unique constraint on `(material_id, user_id)` to enforce one rating per student per file.
- **comments**: Discussion trees allowing 1-level deep replies, and soft-delete states.
- **saved_materials**: Bookmarks joining users and documents.
- **notifications**: User alerts for comment replies, announcements, ratings, or new notes matching curriculum criteria.
- **reports**: Flags lodged against documents for administrator audit.
- **rejected_uploads**: Audit table capturing files that failed browser or server validation, recording uploader name, filename, and reason.
- **announcements**: Site-wide notice bulletins.
- **interview_experiences**: Career logs for interview walkthroughs.

---

## Double PDF Validation Workflow

To maintain clean and high-quality archives, MVGR Material Hub implements double-check PDF verification checks:

1. **Client-side Pre-validation (`pdfjs-dist`)**:
   Runs immediately in the student's browser after selecting a file.
   - Blocks the upload and prints a red error if page count is 0 or if the first 3 pages extract less than 50 characters (preventing scanned junk/blank files).
   - Generates a warning message if text density is between 50-150 characters (e.g. syllabus blueprint files), requiring manual check confirmation.
2. **Server-side Re-validation (`pdf-lib` + `pdfjs-dist`)**:
   Multer intercepts file bytes directly in-memory (no disk writes) on `/api/upload`.
   - `pdf-lib` attempts to load the buffer. If it catches password encryptions or corrupt bytes, it rejects the request with a `400` status.
   - The legacy `pdfjs-dist` text scanner verifies the text length.
   - If server-side checks fail, the file storage upload is abandoned, and details are logged in `rejected_uploads` for admin inspection.

---

## Secure Private Storage & Signed URLs
- Material files are stored in a **private Supabase Storage bucket** named `mvgr-material-hub`.
- No public read access is allowed on this bucket.
- When an authenticated student clicks "Download Document", the API verifies their session, increments `download_count` in PostgreSQL, and generates a secure signed storage URL configured to expire in **5 minutes**.

---

## Local Setup & Verification

### 1. Database Migrations
You can generate and push the tables to Neon or Supabase by configuring your database connection in `backend/.env`:
```bash
cd backend
npm run db:generate
npm run db:push
```

### 2. Private Storage Fallback (Out-of-the-Box Development Mode)
If Supabase variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) are absent from the environment, the server automatically redirects file operations to a **Local Disk Storage mode**.
- Uploads save locally to `backend/uploads/`
- Download URLs resolve to local proxy pathways (`/api/materials/local-download?key=...`)
This allows running and validating the entire project locally without needing real cloud storage credentials.

### 3. Local Boot Instructions
Run the backend server (Port 5000):
```bash
cd backend
npm run dev
```

Run the frontend server (Port 3000):
```bash
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

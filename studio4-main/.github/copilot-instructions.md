## Purpose

This file gives concise, actionable guidance to AI coding agents (and new contributors) so they can be immediately productive in this repository.

**Big Picture**
- **Frontend:** A Create React App located at the repository root (`src/`, `public/`). Entry: `src/index.js` -> `src/App.js`.
- **Auth & Data:** Firebase is used for authentication and Firestore. The firebase bootstrap lives in `src/firebase.js` and exports `auth`, `db`, `isFirebaseConfigured`, `ensureFirebaseAuth`, and `ensureUserRole`.
- **Backend helper service:** A small Express service in `server/index.js` provides email-based password reset and signup email features. It is not required to run the frontend but is used for reset/signup email flows.

**Developer workflows / commands**
- Start dev server (frontend): `npm install` then `npm start` (uses `react-scripts start`).
- Run tests: `npm test` (standard CRA runner).
- Build production bundle: `npm run build` -> outputs `build/` (already present in repo for static hosting).
- The helper backend can be run independently (from `server/`) using Node; it expects env vars (see below).

**Important environment variables**
- Frontend (in `.env`): keys consumed by `src/firebase.js` use the `REACT_APP_` prefix: `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_AUTH_DOMAIN`, `REACT_APP_FIREBASE_PROJECT_ID`, `REACT_APP_FIREBASE_STORAGE_BUCKET`, `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`, `REACT_APP_FIREBASE_APP_ID`.
- Optional service credentials used by `src/firebase.js`: `REACT_APP_FIREBASE_SERVICE_EMAIL`, `REACT_APP_FIREBASE_SERVICE_PASSWORD` (used to sign-in a service account to run server-like tasks).
- Server (`server/index.js`) env vars: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_SECURE` (true/false), `PORT`, `CLIENT_ORIGIN`, and `RESET_CODE_EXPIRY_MINUTES`.

**Auth & role conventions**
- Role checks are implemented in `src/App.js` via `RoleProtectedRoute`. It reads Firestore's `users/{uid}` document and accepts role from any of these keys: `role`, `Role`, or `userType`.
- When adding or updating roles, prefer the lowercase `role` field; helper `ensureUserRole` (in `src/firebase.js`) will set a default `Customer` role for new users.

**Patterns & project-specific conventions**
- The project uses explicit, small directories for major concerns: `Admin/`, `customer-support/`, `pages/`, `components/`, and `utils/`.
- UI routing is centralized in `src/App.js` using `react-router-dom@6` (note: `Routes` + `Route` pattern and `Navigate` for redirects).
- `src/firebase.js` contains fallbacks so local dev can start even if `.env` is missing — check `isFirebaseConfigured` before assuming auth is present.
- Avoid global CSS overrides: `src/index.js` intentionally imports `bootstrap` and `index.css` and comments out `styles.css` to reduce global collisions.

**Backend integration points**
- Frontend reset flows (if used) call the Express endpoints in `server/index.js`:
  - `POST /auth/reset/request` (body: `{ email }`) — sends reset code via email.
  - `POST /auth/reset/verify` (body: `{ email, code }`) — verifies code.
  - `POST /auth/reset/complete` (body: `{ email, code, password }`) — completes reset.
  - `POST /auth/signup` — used to trigger welcome email during signup flows.
- If you change these endpoints, update frontend callers and test the mail flows locally with a dev SMTP (or Mailtrap-like service).

**Examples of targeted prompts for the agent**
- "Add a new protected admin page: create `pages/AdminStats.js`, add route `/admin/stats` in `src/App.js` using `RoleProtectedRoute requiredRole='Administrator'`, and update navigation in `components/NavigationBar.js`."
- "Make Firebase optional: modify `src/firebase.js` to expose a mocked `db` when `isFirebaseConfigured` is false and adjust `ensureUserRole` to be no-op in that case." (Note: this repo already uses fallbacks, inspect `src/firebase.js`.)

**When making changes**
- Update both the frontend route and any role/Firestore expectations together. Example: adding an admin-only API needs changes to `src/App.js` routing + Firestore security rules (not stored here) + any server endpoints.
- Use `console.warn` messages already present in `src/firebase.js` and `server/index.js` as a guide to surface useful developer warnings rather than silent failures.

**What NOT to change without review**
- The fallback Firebase config in `src/firebase.js` (it contains valid-looking fallbacks for local dev; changing them may break onboarding). If you replace it, preserve the `isFirebaseConfigured` checks.
- Do not remove the explicit `bootstrap` import in `src/index.js` — many components rely on Bootstrap classes.

If anything in this document is unclear or you'd like more examples (e.g., how RoleProtectedRoute works end-to-end or sample `.env` files), tell me which area to expand and I will update this file.
